import { useState, useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AlertTriangle, Bluetooth, Check, Download, Info, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { Button, Card, StatusDot } from "./common";
import HandDiagram from "./HandDiagram";
import { FINGERS, fingerTint } from "../lib/fingers";
import { rawToBendNormalized, rawToBendUncalibrated } from "../lib/flexCalibrationStorage";
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
import { deleteUploadedSample, isTeamMember, uploadPending } from "../lib/teamRecordings";

gsap.registerPlugin(useGSAP);

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
type TeamStatus = "checking" | "member" | "not_member" | "offline";

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

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 gap-1 rounded-[var(--radius-control)] bg-wash p-1 sm:inline-flex"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          disabled={disabled}
          aria-pressed={value === o.value}
          className={`h-9 min-w-[4.5rem] flex-1 rounded-[7px] px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ease-out disabled:opacity-45 max-md:h-10 ${
            value === o.value
              ? "bg-surface text-ink shadow-[0_0_0_1px_var(--hairline)]"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const fieldClass =
  "h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-[#cfcac1] bg-surface px-3 text-[0.95rem] text-ink placeholder:text-ink-faint transition-colors duration-150 hover:border-ink-muted disabled:bg-wash disabled:text-ink-muted";

/** A big countdown digit that drops in on every tick. */
function Tick({ n, label }: { n: number; label: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(
    () => {
      if (prefersReduced() || !ref.current) return;
      gsap.fromTo(ref.current, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.24, ease: "power2.out" });
    },
    { scope: ref, dependencies: [n] }
  );
  return (
    <p ref={ref} className="tabular font-display text-[4rem] font-extrabold leading-none text-ink" role="status" aria-label={`${label} ${n}`}>
      {n}
    </p>
  );
}

/** Fills once over the real hold time while the glove is being read. */
function HoldBar({ ms }: { ms: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const bar = ref.current?.firstElementChild;
      if (!bar) return;
      if (prefersReduced()) {
        gsap.set(bar, { scaleX: 1 });
        return;
      }
      gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: ms / 1000, ease: "none" });
    },
    { scope: ref }
  );
  return (
    <div ref={ref} className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-hairline" aria-hidden>
      <div className="h-full origin-left scale-x-0 rounded-full bg-ink" />
    </div>
  );
}

function Notice({ tone, children }: { tone: "ok" | "info" | "danger" | "warn"; children: ReactNode }) {
  const styles = {
    ok: "bg-ok-wash text-ok",
    info: "bg-wash text-ink",
    danger: "bg-danger-wash text-danger",
    warn: "bg-warn-wash text-warn",
  }[tone];
  const Icon = { ok: Check, info: Info, danger: AlertTriangle, warn: AlertTriangle }[tone];
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-[var(--radius-control)] px-3.5 py-2.5 text-sm font-semibold ${styles}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** `onDataChange` lets the Collect page hand the samples to Movement Lab. */
export default function DataCollector({ onDataChange }: { onDataChange?: (data: CollectData) => void }) {
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
    saveCalibration,
  } = useSensor();
  const imuValues = [...imu.acc, ...imu.gyr, ...imu.mag];
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

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

  // ── Team dataset (Supabase) ──
  const [team, setTeam] = useState<TeamStatus>("checking");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const syncingRef = useRef(false);

  useEffect(() => {
    isTeamMember()
      .then((member) => setTeam(member ? "member" : "not_member"))
      .catch(() => setTeam("offline"));
  }, []);

  useEffect(() => writeStored(PARTICIPANT_KEY, participantId), [participantId]);
  useEffect(() => writeStored(HAND_KEY, hand), [hand]);

  useEffect(() => {
    let cancelled = false;
    loadCollectData()
      .then((saved) => {
        if (cancelled || !saved) return;
        dataRef.current = saved;
        setData(saved);
        onDataChangeRef.current?.(saved);
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
    onDataChangeRef.current?.(next);
    try {
      await saveCollectData(next);
      setSaveError("");
    } catch (err) {
      setSaveError("Autosave failed. Download the CSV to keep your data. (" + errorMessage(err) + ")");
    }
  }

  /** Uploads anything not yet in the team dataset. Safe to call often. */
  async function sync() {
    if (team !== "member" || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const sent = await uploadPending(dataRef.current);
      if (sent.size) {
        await commit({
          ...dataRef.current,
          samples: dataRef.current.samples.map((s) => (sent.has(s.sample_id) ? { ...s, uploaded: true } : s)),
        });
      }
      setSyncError("");
    } catch (err) {
      setSyncError("Upload failed; samples are safe in this browser. (" + errorMessage(err) + ")");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }

  // Catch up on anything recorded offline or before signing in to a team account.
  useEffect(() => {
    if (loaded && team === "member") sync();
  }, [loaded, team]);

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

    // Shared app-wide, so Translate and the Lab use this calibration too.
    saveCalibration({ open, closed });
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
    setSessionMsg(`Session started (${pid}, ${hand === "L" ? "left" : "right"} hand)`);
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
    await sync();
  }

  async function deleteLastSample() {
    const samples = dataRef.current.samples;
    if (samples.length === 0) return;
    const last = samples[samples.length - 1];
    if (last.uploaded) {
      try {
        await deleteUploadedSample(last.sample_id);
      } catch (err) {
        setSyncError("Couldn't delete it from the team dataset. (" + errorMessage(err) + ")");
        return;
      }
    }
    await commit({ ...dataRef.current, samples: samples.slice(0, -1) });
  }

  async function clearSavedData() {
    const n = dataRef.current.samples.length;
    const ok = window.confirm(
      `Delete all ${n} sample${n === 1 ? "" : "s"} saved in this browser? ` +
        "This can't be undone, so download the CSV first if you need it. " +
        "Samples already uploaded stay in the team dataset."
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
    if (!activeSession) return Math.round(rawToBendUncalibrated(raw) * 100);
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

  const handWord = (h: Hand) => (h === "L" ? "left" : "right");
  const imuGroups = [
    { name: "Accelerometer", values: imuValues.slice(0, 3).map((v) => v.toFixed(0)), unit: "mg" },
    { name: "Gyroscope", values: imuValues.slice(3, 6).map((v) => v.toFixed(1)), unit: "dps" },
    { name: "Magnetometer", values: imuValues.slice(6, 9).map((v) => v.toFixed(1)), unit: "µT" },
  ];
  const calibOpen = calibStep === "open" || calibStep === "open_hold";
  const uploadedCount = samples.filter((s) => s.uploaded).length;

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${connected ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-start" : ""}`}>
        <div className="min-w-0 space-y-6">
          {/* ── Glove + participant + session start ── */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <StatusDot tone={connected ? "ok" : "off"} />
                  <span className="min-w-0">{status}</span>
                </p>
                {activeSession && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                    <StatusDot tone="ok" />
                    Session active: {activeSession.participant_id}, {handWord(activeSession.hand)} hand
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {import.meta.env.DEV && (
                  <label className="flex min-h-11 items-center gap-2 text-sm text-ink-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--ink)]"
                      checked={simulating}
                      disabled={(connected && !simulating) || recording || calibInProgress}
                      onChange={(e) => setSimulating(e.target.checked)}
                    />
                    Simulate glove (dev)
                  </label>
                )}
                {!connected && (
                  <Button onClick={connect}>
                    <Bluetooth className="h-4 w-4" aria-hidden />
                    Connect via Bluetooth
                  </Button>
                )}
                {connected && (
                  <Button variant="secondary" onClick={disconnect} disabled={recording || calibInProgress}>
                    Disconnect
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-5">
              <h2 className="font-display text-heading text-ink">Session</h2>
              <p className="mt-1 max-w-prose text-sm text-ink-muted">
                Starting a session calibrates the glove (open hand, then fist) and resets rep counts. The hand
                applies to every sample in the session.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="participant-id">
                    Participant ID
                  </label>
                  <input
                    id="participant-id"
                    type="text"
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    placeholder="e.g. P01"
                    className={fieldClass}
                    maxLength={40}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-ink" aria-hidden>
                    Hand
                  </p>
                  <Segmented label="Hand" options={HAND_OPTIONS} value={hand} onChange={setHand} disabled={calibInProgress} />
                </div>
                <Button
                  onClick={startSession}
                  disabled={!connected || !loaded || calibInProgress || recording || !participantId.trim()}
                  variant={activeSession ? "secondary" : "primary"}
                >
                  {activeSession ? (
                    <>
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Start new session
                    </>
                  ) : (
                    "Start session"
                  )}
                </Button>
              </div>

              {activeSession && activeSession.hand !== hand && (
                <p className="mt-3 text-sm font-semibold text-warn">
                  The current session is the {handWord(activeSession.hand)} hand. Start a new session to switch.
                </p>
              )}

              {(sessionMsg || restoreMsg || syncError || saveError) && (
                <div className="mt-5 space-y-2">
                  {sessionMsg && <Notice tone={sessionMsg.startsWith("Session started") ? "ok" : "warn"}>{sessionMsg}</Notice>}
                  {restoreMsg && <Notice tone="info">{restoreMsg}</Notice>}
                  {syncError && <Notice tone="danger">{syncError}</Notice>}
                  {saveError && <Notice tone="danger">{saveError}</Notice>}
                </div>
              )}

              {connected && calibInProgress && (
                <div className="mt-5 flex flex-col items-center gap-5 rounded-[var(--radius-card)] bg-wash px-5 py-6 text-center sm:flex-row sm:text-left">
                  <HandDiagram
                    bends={calibOpen ? [0, 0, 0, 0, 0] : [1, 1, 1, 1, 1]}
                    className="w-24 shrink-0"
                    label={calibOpen ? "An open hand" : "A closed fist"}
                  />
                  <div className="min-w-0 flex-1" aria-live="polite">
                    {calibStep === "open" && (
                      <>
                        <p className="font-display text-heading text-ink">Spread your hand open</p>
                        <p className="mt-1 text-sm text-ink-muted">Reading starts in</p>
                        <div className="mt-2"><Tick n={calibCountdown} label="Open hand in" /></div>
                      </>
                    )}
                    {calibStep === "open_hold" && (
                      <>
                        <p className="font-display text-heading text-ink">Hold still</p>
                        <p className="mt-1 text-sm text-ink-muted">Reading your open hand.</p>
                        <HoldBar key="open" ms={CALIB_HOLD_MS} />
                      </>
                    )}
                    {calibStep === "closed" && (
                      <>
                        <p className="font-display text-heading text-ink">Make a fist</p>
                        <p className="mt-1 text-sm text-ink-muted">Reading starts in</p>
                        <div className="mt-2"><Tick n={calibCountdown} label="Fist in" /></div>
                      </>
                    )}
                    {calibStep === "closed_hold" && (
                      <>
                        <p className="font-display text-heading text-ink">Hold still</p>
                        <p className="mt-1 text-sm text-ink-muted">Reading your fist.</p>
                        <HoldBar key="closed" ms={CALIB_HOLD_MS} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ── Record ── */}
          {connected && activeSession && (
            <Card title="Record a sample" description="Sign during the window after the countdown. Every recording is saved in this browser right away.">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="collect-label">
                      Label
                    </label>
                    <input
                      id="collect-label"
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. A, HELLO, NONE"
                      className={`${fieldClass} font-semibold uppercase placeholder:normal-case placeholder:font-normal`}
                      maxLength={LABEL_MAX}
                      disabled={recording}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-ink" aria-hidden>
                      Sign type
                    </p>
                    <Segmented
                      label="Sign type"
                      options={SIGN_TYPE_OPTIONS}
                      value={signType}
                      onChange={selectSignType}
                      disabled={recording}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="sm:w-36">
                    <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="collect-window">
                      Window (ms)
                    </label>
                    <input
                      id="collect-window"
                      type="number"
                      value={windowMs || ""}
                      onChange={(e) => setWindowMs(Number(e.target.value))}
                      min={MIN_WINDOW_MS}
                      max={MAX_WINDOW_MS}
                      step={100}
                      aria-invalid={!windowValid}
                      aria-describedby={!windowValid ? "collect-window-error" : undefined}
                      className={`${fieldClass} tabular ${windowValid ? "" : "border-danger hover:border-danger"}`}
                      disabled={recording}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="collect-notes">
                      Notes <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <input
                      id="collect-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything odd about this take"
                      className={fieldClass}
                      maxLength={NOTES_MAX}
                    />
                  </div>
                </div>
                {!windowValid && (
                  <p id="collect-window-error" className="text-sm font-semibold text-danger">
                    The window must be between {MIN_WINDOW_MS} and {MAX_WINDOW_MS} ms.
                  </p>
                )}

                <div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    onClick={recordSample}
                    disabled={recording || calibInProgress || !normalizedLabel || !windowValid}
                    className="sm:min-w-[11rem]"
                  >
                    {recPhase === "countdown"
                      ? `Starting in ${recCountdown}…`
                      : recPhase === "capturing"
                        ? "Recording…"
                        : "Record"}
                  </Button>
                  {normalizedLabel && (
                    <p className="text-sm text-ink-muted">
                      Next: <span className="font-display font-bold text-ink">{normalizedLabel}</span>, rep{" "}
                      <span className="tabular">{nextRepNum}</span>, {signType},{" "}
                      <span className="tabular">{windowMs} ms</span>
                    </p>
                  )}
                </div>

                {recPhase === "countdown" && (
                  <div className="rounded-[var(--radius-card)] bg-wash py-5 text-center">
                    <p className="text-sm text-ink-muted">Get ready to sign {normalizedLabel}</p>
                    <div className="mt-1"><Tick n={recCountdown} label="Recording starts in" /></div>
                  </div>
                )}
                {recPhase === "capturing" && (
                  <div className="rounded-[var(--radius-card)] bg-wash px-5 py-5">
                    <p className="mb-3 flex justify-between text-sm font-semibold text-ink" aria-live="polite">
                      <span>Recording. Sign now.</span>
                      <span className="tabular text-ink-muted">{Math.round(recProgress * 100)}%</span>
                    </p>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-hairline"
                      role="progressbar"
                      aria-label="Recording progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(recProgress * 100)}
                    >
                      <div
                        className="h-full origin-left rounded-full bg-ink transition-transform duration-100 ease-linear"
                        style={{ transform: `scaleX(${recProgress})` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ── Live readings ── */}
        {connected && (
          <Card
            title="Live readings"
            description={activeSession ? "Raw value and bend, using this session's calibration." : "Raw values. Start a session to see bends."}
            className="lg:sticky lg:top-20"
          >
            <div className="space-y-3.5">
              {FINGERS.map((f, i) => (
                <div key={f.key}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} aria-hidden />
                      {f.name}
                    </span>
                    <span className="tabular text-ink-muted">
                      raw {fingers[i]}
                      {activeSession && <span className="ml-2 font-semibold text-ink">{bendPercents[i]}% bent</span>}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: fingerTint(f.color, 16) }} aria-hidden>
                    <div
                      className="h-full origin-left rounded-full transition-transform duration-100 ease-out"
                      style={{ background: f.color, transform: `scaleX(${Math.max(0, Math.min(100, bendPercents[i])) / 100})` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-5 space-y-1.5 border-t border-hairline pt-4 text-sm">
              {imuGroups.map((g) => (
                <div key={g.name} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{g.name}</dt>
                  <dd className="tabular text-right text-ink">
                    {g.values.join(" / ")} <span className="text-ink-muted">{g.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      {/* ── Sample log ── */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-heading text-ink">
              Samples <span className="tabular text-ink-muted">({samples.length})</span>
            </h2>
            <TeamSyncStatus
              team={team}
              uploaded={uploadedCount}
              total={samples.length}
              syncing={syncing}
              onSync={sync}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={downloadCsv} disabled={samples.length === 0} className="max-md:h-11">
              <Download className="h-4 w-4" aria-hidden />
              Download CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={deleteLastSample} disabled={!lastSample || recording} className="max-md:h-11">
              <Undo2 className="h-4 w-4" aria-hidden />
              Delete last sample
              {lastSample && ` (${lastSample.label} rep ${lastSample.rep})`}
            </Button>
            <Button variant="danger" size="sm" onClick={clearSavedData} disabled={samples.length === 0 || recording} className="max-md:h-11">
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear saved data
            </Button>
          </div>
        </div>

        {samples.length > 0 ? (
          <ul className="mt-5 max-h-80 divide-y divide-hairline overflow-y-auto rounded-[var(--radius-control)] border border-hairline text-sm">
            {[...samples].reverse().map((s) => (
              <li key={s.sample_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="w-16 min-w-0 truncate font-display text-base font-bold text-ink" title={s.label}>
                  {s.label}
                </span>
                <span className="tabular w-12 text-ink">rep {s.rep}</span>
                <span className="w-16 text-ink-muted">{s.sign_type}</span>
                <span className="tabular text-ink-muted">
                  {s.frames.length} frames, {Math.round(sampleRateHz(s))} Hz
                </span>
                <span className="tabular text-ink-muted">{new Date(s.recorded_at).toLocaleTimeString()}</span>
                <span className="flex flex-wrap gap-1 sm:ml-auto">
                  {sampleWarnings(s).map((w) => (
                    <span key={w} className="rounded-md bg-warn-wash px-2 py-0.5 text-xs font-semibold text-warn">
                      {w}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-[var(--radius-control)] bg-wash px-4 py-6 text-center text-sm text-ink-muted">
            {loaded ? "No samples yet. Start a session and record one." : "Loading saved samples…"}
          </p>
        )}
      </Card>
    </div>
  );
}

function TeamSyncStatus({ team, uploaded, total, syncing, onSync }: {
  team: TeamStatus;
  uploaded: number;
  total: number;
  syncing: boolean;
  onSync: () => void;
}) {
  if (team === "checking") return null;
  if (team === "offline") {
    return <p className="mt-1 text-sm font-semibold text-warn">Can't reach the team dataset; samples stay in this browser.</p>;
  }
  if (team === "not_member") {
    return (
      <p className="mt-1 text-sm text-ink-muted">
        This account isn't on the team, so samples stay in this browser. Ask a teammate to add you.
      </p>
    );
  }
  const pending = total - uploaded;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted" aria-live="polite">
      <span className="tabular">{syncing ? "Uploading…" : `${uploaded} of ${total} in the team dataset`}</span>
      {!syncing && pending > 0 && (
        <button
          type="button"
          onClick={onSync}
          className="min-h-11 font-semibold text-ink underline decoration-hairline decoration-2 underline-offset-4 transition-colors duration-150 hover:decoration-ink md:min-h-0"
        >
          Upload {pending} now
        </button>
      )}
    </p>
  );
}
