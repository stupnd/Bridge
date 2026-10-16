import { useState, useRef, useEffect } from "react";
import { rawToBendNormalized, saveFlexCalibration } from "../lib/flexCalibrationStorage";
import { useSensor } from "../context/SensorContext";
import { averageFingers, captureFrames } from "../lib/captureFrames";
import {
  buildCalibrationCsv,
  buildFramesCsv,
  downloadCsvFile,
  nextRep,
  sampleRateHz,
  sampleWarnings,
  SIGN_TYPE_WINDOW_MS,
  type CollectData,
  type CollectSample,
  type CollectSession,
  type Hand,
  type SignType,
} from "../lib/collectData";
import { loadCollectData, saveCollectData } from "../lib/collectStorage";

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
const PARTICIPANT_KEY = "bridge-collect-participant-id";
const HAND_KEY = "bridge-collect-hand";
const NOTES_MAX = 140;
const LABEL_MAX = 40;
const CALIB_HOLD_MS = 1500;
const MIN_WINDOW_MS = 200;
const MAX_WINDOW_MS = 30000;

const HAND_OPTIONS: { value: Hand; label: string }[] = [
  { value: "L", label: "Left" },
  { value: "R", label: "Right" },
];

const SIGN_TYPE_OPTIONS: { value: SignType; label: string }[] = [
  { value: "static", label: "Static" },
  { value: "moving", label: "Moving" },
  { value: "none", label: "None" },
];

type CalibStep = "idle" | "open" | "open_hold" | "closed" | "closed_hold" | "done";
type RecPhase = "idle" | "countdown" | "capturing";

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          disabled={disabled}
          className={`px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            value === o.value ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DataCollector() {
  const {
    fingers,
    imu,
    connected,
    status,
    connect,
    disconnect,
    fingersRef,
    subscribe,
    simulating,
    setSimulating,
  } = useSensor();

  // ── Session setup ──
  const [participantId, setParticipantId] = useState(() => readStored(PARTICIPANT_KEY) ?? "");
  const [hand, setHand] = useState<Hand>(() => (readStored(HAND_KEY) === "L" ? "L" : "R"));
  const [calibStep, setCalibStep] = useState<CalibStep>("idle");
  const [calibCountdown, setCalibCountdown] = useState(0);
  const [activeSession, setActiveSession] = useState<CollectSession | null>(null);
  const [sessionMsg, setSessionMsg] = useState("");

  // ── Record panel ──
  const [label, setLabel] = useState("");
  const [signType, setSignType] = useState<SignType>("static");
  const [windowMs, setWindowMs] = useState(SIGN_TYPE_WINDOW_MS.static);
  const [notes, setNotes] = useState("");
  const [recPhase, setRecPhase] = useState<RecPhase>("idle");
  const [recCountdown, setRecCountdown] = useState(0);
  const [recProgress, setRecProgress] = useState(0);

  // ── Stored data ──
  const [data, setData] = useState<CollectData>({ sessions: [], samples: [] });
  const dataRef = useRef<CollectData>(data);
  const [loaded, setLoaded] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => writeStored(PARTICIPANT_KEY, participantId), [participantId]);
  useEffect(() => writeStored(HAND_KEY, hand), [hand]);

  useEffect(() => {
    let cancelled = false;
    loadCollectData()
      .then((saved) => {
        if (cancelled || !saved) return;
        dataRef.current = saved;
        setData(saved);
        const n = saved.samples.length;
        if (n > 0) setRestoreMsg(`Restored ${n} sample${n === 1 ? "" : "s"} from a previous session.`);
      })
      .catch((err) => {
        if (!cancelled) setSaveError("Couldn't read saved data: " + errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Update data in memory and autosave it to IndexedDB. */
  async function commit(next: CollectData) {
    dataRef.current = next;
    setData(next);
    try {
      await saveCollectData(next);
      setSaveError("");
    } catch (err) {
      setSaveError("Autosave failed — download the CSV to keep your data. (" + errorMessage(err) + ")");
    }
  }

  const normalizedLabel = label.trim().toUpperCase();
  const windowValid = windowMs >= MIN_WINDOW_MS && windowMs <= MAX_WINDOW_MS;

  async function countdown(seconds: number, setValue: (n: number) => void) {
    for (let i = seconds; i > 0; i--) {
      setValue(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setValue(0);
  }

  async function startSession() {
    const pid = participantId.trim();
    if (!pid) {
      setSessionMsg("Enter a participant ID first.");
      return;
    }
    setSessionMsg("");
    setActiveSession(null);

    setCalibStep("open");
    await countdown(3, setCalibCountdown);
    setCalibStep("open_hold");
    const open = averageFingers((await captureFrames(subscribe, CALIB_HOLD_MS)).frames, fingersRef.current);

    setCalibStep("closed");
    await countdown(3, setCalibCountdown);
    setCalibStep("closed_hold");
    const closed = averageFingers((await captureFrames(subscribe, CALIB_HOLD_MS)).frames, fingersRef.current);

    saveFlexCalibration(open, closed);
    setCalibStep("done");

    const session: CollectSession = {
      session_id: crypto.randomUUID(),
      participant_id: pid,
      hand,
      calibrated_at: new Date().toISOString(),
      open,
      closed,
    };
    setActiveSession(session);
    setSessionMsg(`Session started ✓ (${pid}, ${hand === "L" ? "left" : "right"} hand)`);
    await commit({ ...dataRef.current, sessions: [...dataRef.current.sessions, session] });
  }

  function selectSignType(t: SignType) {
    setSignType(t);
    setWindowMs(SIGN_TYPE_WINDOW_MS[t]);
  }

  async function recordSample() {
    const session = activeSession;
    if (!session || !normalizedLabel || !windowValid || recPhase !== "idle") return;
    // Snapshot the settings so edits during the countdown don't change this sample.
    const sampleLabel = normalizedLabel;
    const sampleType = signType;
    const sampleWindow = windowMs;
    const sampleNotes = notes.trim();

    setRecPhase("countdown");
    await countdown(3, setRecCountdown);
    setRecPhase("capturing");
    setRecProgress(0);
    const recordedAt = new Date().toISOString();
    const { start, frames } = await captureFrames(subscribe, sampleWindow, setRecProgress);

    const sample: CollectSample = {
      sample_id: crypto.randomUUID(),
      session_id: session.session_id,
      participant_id: session.participant_id,
      hand: session.hand,
      label: sampleLabel,
      sign_type: sampleType,
      rep: nextRep(dataRef.current.samples, session.session_id, sampleLabel),
      window_ms: sampleWindow,
      recorded_at: recordedAt,
      notes: sampleNotes,
      frames: frames.map((f, i) => ({
        frame_idx: i,
        t_ms: Math.round(f.t - start),
        raw: [...f.fingers],
        pct: f.fingers.map(
          (r, j) =>
            Math.round(rawToBendNormalized(r, session.open[j], session.closed[j]) * 1000) / 10
        ),
        // float32 → shortest decimal that round-trips, instead of 0.10000000149…
        imu: f.imu.map((v) => Number(v.toPrecision(7))),
      })),
    };

    setRecPhase("idle");
    await commit({ ...dataRef.current, samples: [...dataRef.current.samples, sample] });
  }

  async function deleteLastSample() {
    const samples = dataRef.current.samples;
    if (samples.length === 0) return;
    await commit({ ...dataRef.current, samples: samples.slice(0, -1) });
  }

  async function clearSavedData() {
    const n = dataRef.current.samples.length;
    const ok = window.confirm(
      `Delete all ${n} sample${n === 1 ? "" : "s"} saved in this browser? ` +
        "This can't be undone — download the CSV first if you need it."
    );
    if (!ok) return;
    setRestoreMsg("");
    // Keep the active session's calibration so new samples still export with it.
    await commit({ sessions: activeSession ? [activeSession] : [], samples: [] });
  }

  function downloadCsv() {
    const { sessions, samples } = dataRef.current;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const usedSessions = new Set(samples.map((s) => s.session_id));
    downloadCsvFile(`asl-frames-${stamp}.csv`, buildFramesCsv(samples));
    downloadCsvFile(
      `asl-calibration-${stamp}.csv`,
      buildCalibrationCsv(sessions.filter((s) => usedSessions.has(s.session_id)))
    );
  }

  const bendPercents = fingers.map((raw, i) => {
    if (!activeSession) return Math.round((raw / 4095) * 100);
    return Math.round(
      rawToBendNormalized(raw, activeSession.open[i], activeSession.closed[i]) * 100
    );
  });

  const calibInProgress = calibStep !== "idle" && calibStep !== "done";
  const recording = recPhase !== "idle";
  const samples = data.samples;
  const lastSample = samples[samples.length - 1];
  const nextRepNum =
    activeSession && normalizedLabel
      ? nextRep(samples, activeSession.session_id, normalizedLabel)
      : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Status:</span> {status}
          {activeSession && (
            <span className="ml-2 text-green-600 text-xs font-medium">● Session active</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {!connected && (
            <button
              onClick={connect}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Connect via Bluetooth
            </button>
          )}
          {connected && (
            <button
              onClick={disconnect}
              disabled={recording || calibInProgress}
              className="px-4 py-2 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
          {import.meta.env.DEV && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={simulating}
                disabled={(connected && !simulating) || recording || calibInProgress}
                onChange={(e) => setSimulating(e.target.checked)}
              />
              Simulate glove (dev)
            </label>
          )}
        </div>

        {/* ── Participant + hand + session start ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="participant-id">
            Participant ID
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="participant-id"
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="e.g. P01"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              maxLength={40}
            />
            <Segmented options={HAND_OPTIONS} value={hand} onChange={setHand} disabled={calibInProgress} />
            <button
              type="button"
              onClick={startSession}
              disabled={!connected || !loaded || calibInProgress || recording || !participantId.trim()}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {activeSession ? "Start new session" : "Start session"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Starting a session runs open-hand / closed-fist calibration and resets rep counts. The
            hand applies to every sample in the session.
            {activeSession && activeSession.hand !== hand && (
              <span className="text-amber-700">
                {" "}
                Current session is {activeSession.hand === "L" ? "left" : "right"} hand — start a
                new session to switch.
              </span>
            )}
          </p>
        </div>

        {sessionMsg && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {sessionMsg}
          </p>
        )}
        {restoreMsg && (
          <p className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            {restoreMsg}
          </p>
        )}
        {saveError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}

        {connected && calibInProgress && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1 text-center">
            {calibStep === "open" && (
              <>
                <p className="text-2xl">🖐️</p>
                <p className="font-semibold text-amber-800">Spread your hand OPEN</p>
                <p className="text-4xl font-bold text-amber-600">{calibCountdown}</p>
              </>
            )}
            {calibStep === "open_hold" && (
              <>
                <p className="text-2xl">🖐️</p>
                <p className="font-semibold text-amber-800">Hold still… reading open hand</p>
                <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                  <div className="bg-amber-500 h-2 rounded-full animate-pulse w-full" />
                </div>
              </>
            )}
            {calibStep === "closed" && (
              <>
                <p className="text-2xl">✊</p>
                <p className="font-semibold text-amber-800">Make a FIST</p>
                <p className="text-4xl font-bold text-amber-600">{calibCountdown}</p>
              </>
            )}
            {calibStep === "closed_hold" && (
              <>
                <p className="text-2xl">✊</p>
                <p className="font-semibold text-amber-800">Hold still… reading closed fist</p>
                <div className="w-full bg-amber-200 rounded-full h-2 mt-2">
                  <div className="bg-amber-500 h-2 rounded-full animate-pulse w-full" />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Live readings ── */}
        {connected && (
          <div className="space-y-3 pt-2">
            {FINGER_NAMES.map((name, i) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{name}</span>
                  <span className="text-gray-400 text-xs">
                    raw: {fingers[i]}
                    {activeSession && (
                      <span className="ml-2 font-medium text-gray-600">
                        {bendPercents[i]}% bent
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-indigo-500 h-3 rounded-full transition-all duration-100"
                    style={{ width: `${bendPercents[i]}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 font-mono">
              acc {imu.slice(0, 3).map((v) => v.toFixed(0)).join(" / ")} mg · gyro{" "}
              {imu.slice(3, 6).map((v) => v.toFixed(1)).join(" / ")} dps · mag{" "}
              {imu.slice(6, 9).map((v) => v.toFixed(1)).join(" / ")} µT
            </p>
          </div>
        )}

        {/* ── Record ── */}
        {connected && activeSession && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <p className="font-medium text-indigo-800">Record a sample</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (e.g. A, HELLO, NONE)"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                maxLength={LABEL_MAX}
                disabled={recording}
              />
              <Segmented
                options={SIGN_TYPE_OPTIONS}
                value={signType}
                onChange={selectSignType}
                disabled={recording}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Window
                <input
                  type="number"
                  value={windowMs || ""}
                  onChange={(e) => setWindowMs(Number(e.target.value))}
                  min={MIN_WINDOW_MS}
                  max={MAX_WINDOW_MS}
                  step={100}
                  className={`w-24 px-3 py-2 border rounded-lg text-sm bg-white ${
                    windowValid ? "border-gray-300" : "border-red-400"
                  }`}
                  disabled={recording}
                />
                ms
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                maxLength={NOTES_MAX}
              />
            </div>
            {!windowValid && (
              <p className="text-xs text-red-600">
                Window must be between {MIN_WINDOW_MS} and {MAX_WINDOW_MS} ms.
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={recordSample}
                disabled={recording || calibInProgress || !normalizedLabel || !windowValid}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {recPhase === "countdown"
                  ? `Starting in ${recCountdown}…`
                  : recPhase === "capturing"
                    ? "Recording…"
                    : "Record"}
              </button>
              {normalizedLabel && (
                <span className="text-xs text-indigo-700">
                  Next: {normalizedLabel} rep {nextRepNum} · {signType} · {windowMs} ms
                </span>
              )}
            </div>
            {recPhase === "countdown" && (
              <p className="text-4xl font-bold text-indigo-600 text-center">{recCountdown}</p>
            )}
            {recPhase === "capturing" && (
              <div className="w-full bg-indigo-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${Math.round(recProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Sample log ── */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-700">Samples ({samples.length})</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={deleteLastSample}
                disabled={!lastSample || recording}
                className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
              >
                Delete last sample
                {lastSample && ` (${lastSample.label} rep ${lastSample.rep})`}
              </button>
              <button
                type="button"
                onClick={clearSavedData}
                disabled={samples.length === 0 || recording}
                className="px-3 py-1.5 rounded-md bg-white border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
              >
                Clear saved data
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={samples.length === 0}
                className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
              >
                Download CSV
              </button>
            </div>
          </div>
          {samples.length > 0 && (
            <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl text-sm">
              {[...samples].reverse().map((s) => (
                <li key={s.sample_id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-gray-700 min-w-0">
                    <span className="font-bold text-indigo-600">{s.label}</span> · rep {s.rep}
                    <span className="ml-2 text-xs text-gray-500">
                      {s.sign_type} · {s.frames.length} frames · {Math.round(sampleRateHz(s))} Hz
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(s.recorded_at).toLocaleTimeString()}
                    </span>
                  </span>
                  <span className="flex flex-wrap justify-end gap-1 shrink-0">
                    {sampleWarnings(s).map((w) => (
                      <span
                        key={w}
                        className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700"
                      >
                        {w}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
