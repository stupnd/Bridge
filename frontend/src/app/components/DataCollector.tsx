import { useState, useRef, useEffect } from "react";
import { Circle, Download, Trash2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { rawToBendNormalized } from "../lib/flexCalibrationStorage";
import { useSensor } from "../context/SensorContext";
import { computeFeatures, Frame } from "../lib/imu";
import { getLetter } from "../lib/asl";
import { Recording, setRecordings, useRecordings } from "../lib/recordings";
import { Button, Card, GloveGate, StatusDot } from "./common";
import { CalibrationPrompt, useCalibration } from "./Calibration";
import FingerBars from "./FingerBars";

/** Labels offered as one-tap buttons. "Rest" teaches the model what "not signing" looks like. */
const LABELS = ["A", "E", "M", "N", "S", "T", "J", "Z", "Rest"] as const;
const PARTICIPANT_KEY = "bridge-collect-participant-id";
// Static poses are averaged over a short hold; movements need room for the whole gesture.
const WINDOW_MS = { static: 1000, movement: 2000 } as const;
const MOVEMENT_COUNTDOWN_S = 3;

function csvCell(v: string | number | boolean | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function DataCollector() {
  const { connected, imuLive, bends, calibration, subscribe } = useSensor();
  const calib = useCalibration();

  const [participantId, setParticipantId] = useState(() => {
    try {
      return localStorage.getItem(PARTICIPANT_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [sessionActive, setSessionActive] = useState(false);
  const [dbSessionId, setDbSessionId] = useState<number | null>(null);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [sessionMsg, setSessionMsg] = useState("");

  const [label, setLabel] = useState<string>(LABELS[0]);
  const [customLabel, setCustomLabel] = useState("");
  const [customMoves, setCustomMoves] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordCountdown, setRecordCountdown] = useState(0);
  const [recordMsg, setRecordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { recordings: samples, persistError } = useRecordings();
  const repCounts = useRef<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem(PARTICIPANT_KEY, participantId);
    } catch {
      /* ignore */
    }
  }, [participantId]);

  const isCustom = label === "custom";
  const letter = (isCustom ? customLabel : label).trim().toUpperCase();
  // J and Z (and custom labels marked as moving) get a countdown and a longer window.
  const mode: Recording["mode"] = (isCustom ? customMoves : getLetter(letter)?.movement) ? "movement" : "static";

  /** Every packet that arrives in the next `ms`, with `t` made relative to the first one. */
  function captureFrames(ms: number): Promise<Frame[]> {
    return new Promise((resolve) => {
      const frames: Frame[] = [];
      const unsubscribe = subscribe((f) => frames.push(f));
      setTimeout(() => {
        unsubscribe();
        const t0 = frames[0]?.t ?? 0;
        // Rounded so a session's worth of recordings fits in localStorage.
        const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
        resolve(
          frames.map((f) => ({
            t: Math.round(f.t - t0),
            fingers: f.fingers,
            acc: f.acc.map((v) => r(v, 1)) as Frame["acc"],
            gyr: f.gyr.map((v) => r(v, 2)) as Frame["gyr"],
            mag: f.mag.map((v) => r(v, 1)) as Frame["mag"],
          }))
        );
      }, ms);
    });
  }

  async function startSession() {
    if (!participantId.trim()) {
      setSessionMsg("Enter a participant ID first.");
      return;
    }
    setSessionMsg("");
    setSessionActive(false);

    const { open: openVals, closed: closedVals } = await calib.run();

    // Fresh session: reset reps, new local id (independent of Supabase)
    repCounts.current = {};
    setLocalSessionId(crypto.randomUUID());
    setDbSessionId(null);
    setSessionActive(true);

    const { data, error } = await supabase
      .from("ML - Session Data")
      .insert({
        participant_id: participantId.trim(),
        open_f1: openVals[0],
        open_f2: openVals[1],
        open_f3: openVals[2],
        open_f4: openVals[3],
        open_f5: openVals[4],
        closed_f1: closedVals[0],
        closed_f2: closedVals[1],
        closed_f3: closedVals[2],
        closed_f4: closedVals[3],
        closed_f5: closedVals[4],
      })
      .select("session_id")
      .single();

    if (error || !data) {
      setSessionMsg(
        "Couldn't reach Supabase (" + (error?.message ?? "no data") + "). Samples will be saved in this browser only."
      );
    } else {
      setDbSessionId(data.session_id as number);
    }
  }

  async function recordSample() {
    if (!calibration || !localSessionId || !letter) return;
    setRecording(true);
    setRecordMsg(null);

    if (mode === "movement") {
      for (let i = MOVEMENT_COUNTDOWN_S; i > 0; i--) {
        setRecordCountdown(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setRecordCountdown(0);
    }
    const frames = await captureFrames(WINDOW_MS[mode]);
    if (frames.length < 5) {
      setRecordMsg({ ok: false, text: `Only ${frames.length} readings arrived, so nothing was saved. Is the glove still connected?` });
      setRecording(false);
      return;
    }

    const raw = [0, 1, 2, 3, 4].map((i) =>
      Math.round(frames.reduce((sum, f) => sum + f.fingers[i], 0) / frames.length)
    );
    const pct = raw.map(
      (r, i) =>
        Math.round(rawToBendNormalized(r, calibration.open[i], calibration.closed[i]) * 1000) / 10
    );
    const rep = (repCounts.current[letter] ?? 0) + 1;
    repCounts.current[letter] = rep;

    const sample: Recording = {
      timestamp: new Date().toISOString(),
      dbSessionId,
      localSessionId,
      participantId: participantId.trim(),
      letter,
      rep,
      mode,
      raw,
      pct,
      notes: "",
      synced: false,
      frames,
      features: computeFeatures(frames, calibration),
    };

    // Local copy is the source of truth; add before attempting the insert.
    setRecordings((prev) => [...prev, sample]);
    setRecordMsg({ ok: true, text: `Saved ${letter}, rep ${rep}` });

    if (dbSessionId !== null) {
      const { error } = await supabase.from("ML - Training Data").insert({
        session_id: dbSessionId,
        timestamp: sample.timestamp,
        participant_id: sample.participantId,
        letter: sample.letter,
        rep: sample.rep,
        raw_f1: raw[0],
        raw_f2: raw[1],
        raw_f3: raw[2],
        raw_f4: raw[3],
        raw_f5: raw[4],
        pct_f1: pct[0],
        pct_f2: pct[1],
        pct_f3: pct[2],
        pct_f4: pct[3],
        pct_f5: pct[4],
        notes: null,
      });
      if (error) {
        console.error("Training data insert failed:", error);
      } else {
        setRecordings((prev) => prev.map((s) => (s === sample ? { ...s, synced: true } : s)));
      }
    }
    setRecording(false);
  }

  function saveCsv(name: string, header: string[], rows: (string | number | boolean | null)[][]) {
    const lines = [header.join(","), ...rows.map((r) => r.map(csvCell).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** One row per recording: labels, flex averages and the 9-axis summary features. */
  function downloadCsv() {
    const header = [
      "timestamp",
      "db_session_id",
      "local_session_id",
      "participant_id",
      "letter",
      "rep",
      "mode",
      "raw_f1", "raw_f2", "raw_f3", "raw_f4", "raw_f5",
      "pct_f1", "pct_f2", "pct_f3", "pct_f4", "pct_f5",
      "gravity_x", "gravity_y", "gravity_z",
      "roll_deg", "pitch_deg",
      "turn_x_deg", "turn_y_deg", "turn_z_deg",
      "gyro_rms_dps", "gyro_peak_dps", "acc_jerk_mg", "reversals",
      "duration_ms", "frame_count",
      "notes",
      "synced_to_supabase",
    ];
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const rows = samples.map((s) => {
      const f = s.features;
      return [
        s.timestamp,
        s.dbSessionId,
        s.localSessionId,
        s.participantId,
        s.letter,
        s.rep,
        s.mode,
        ...s.raw,
        ...s.pct,
        ...f.gravity.map(r2),
        r2(f.rollDeg),
        r2(f.pitchDeg),
        ...f.rotationDeg.map(r2),
        r2(f.gyroRms),
        r2(f.gyroPeak),
        r2(f.accStd),
        f.reversals,
        f.durationMs,
        f.frameCount,
        s.notes,
        s.synced,
      ];
    });
    saveCsv("asl-samples", header, rows);
  }

  /** One row per sensor reading, for training sequence models later. Joins to the summary on local_session_id + letter + rep. */
  function downloadFramesCsv() {
    const header = [
      "local_session_id", "participant_id", "letter", "rep", "mode", "t_ms",
      "f1", "f2", "f3", "f4", "f5",
      "acc_x_mg", "acc_y_mg", "acc_z_mg",
      "gyr_x_dps", "gyr_y_dps", "gyr_z_dps",
      "mag_x_ut", "mag_y_ut", "mag_z_ut",
    ];
    const rows = samples.flatMap((s) =>
      s.frames.map((f) => [
        s.localSessionId, s.participantId, s.letter, s.rep, s.mode, f.t,
        ...f.fingers, ...f.acc, ...f.gyr, ...f.mag,
      ])
    );
    saveCsv("asl-frames", header, rows);
  }

  function clearRecordings() {
    const ok = window.confirm(
      `Delete all ${samples.length} samples from this browser? Motion data isn't stored anywhere else, so download the CSVs first.`
    );
    if (ok) setRecordings(() => []);
  }

  const totals: Record<string, number> = {};
  for (const s of samples) totals[s.letter] = (totals[s.letter] ?? 0) + 1;
  const nextRep = letter ? (repCounts.current[letter] ?? 0) + 1 : 0;
  const canRecord = sessionActive && !!letter && !recording && imuLive;

  return (
    <div className="space-y-6">
      <Card
        title="1. Session"
        description="One session per person per sitting. Starting one calibrates the glove for them."
        action={
          sessionActive && (
            <span className="flex items-center gap-1.5 text-sm text-green-700">
              <StatusDot tone="ok" /> {dbSessionId !== null ? `Session ${dbSessionId}` : "Local session"}
            </span>
          )
        }
      >
        <GloveGate what="record samples" needsCalibration={false}>
          {calib.running ? (
            <CalibrationPrompt step={calib.step} countdown={calib.countdown} />
          ) : (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                startSession();
              }}
            >
              <label className="flex-1 min-w-[12rem]">
                <span className="mb-1 block text-sm font-medium text-gray-700">Participant ID</span>
                <input
                  type="text"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  placeholder="e.g. P01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={40}
                />
              </label>
              <Button type="submit" variant={sessionActive ? "secondary" : "primary"} disabled={!participantId.trim()}>
                {sessionActive ? "Start new session" : "Start session"}
              </Button>
            </form>
          )}
          {sessionMsg && <p className="mt-3 text-sm text-amber-700">{sessionMsg}</p>}
        </GloveGate>
      </Card>

      {connected && sessionActive && (
        <Card
          title="2. Record"
          description={
            mode === "movement"
              ? `Press Record, get into position during the ${MOVEMENT_COUNTDOWN_S}-second countdown, then do the whole movement within 2 seconds.`
              : "Hold the sign, then press Record. It captures 1 second."
          }
        >
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sign to record">
            {[...LABELS, "custom"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLabel(l)}
                disabled={recording}
                aria-pressed={label === l}
                className={`flex min-w-[3.5rem] flex-col items-center rounded-lg border px-3 py-2 transition-colors ${
                  label === l
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-200 bg-white text-gray-800 hover:border-indigo-300"
                }`}
              >
                <span className="font-semibold">{l === "custom" ? "Other…" : l}</span>
                {l !== "custom" && (
                  <span className={`text-xs tabular-nums ${label === l ? "text-indigo-100" : "text-gray-500"}`}>
                    {totals[l] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isCustom && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Label, e.g. B or HELLO"
                aria-label="Custom label"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={20}
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={customMoves} onChange={(e) => setCustomMoves(e.target.checked)} />
                This sign moves
              </label>
            </div>
          )}

          <div className="mt-6 grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <FingerBars bends={bends} compact />
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={recordSample} disabled={!canRecord} className="min-w-[12rem]">
                <Circle className="h-4 w-4 fill-current" />
                {recordCountdown > 0
                  ? `Starting in ${recordCountdown}…`
                  : recording
                    ? "Recording…"
                    : letter
                      ? `Record ${letter} · rep ${nextRep}`
                      : "Record"}
              </Button>
              <p className="text-xs text-gray-500">{mode === "movement" ? "Movement · 2 s" : "Static · 1 s"}</p>
            </div>
          </div>

          <div className="mt-3 min-h-[1.25rem] text-sm" aria-live="polite">
            {!imuLive ? (
              <p className="text-amber-700">
                Recording is paused until the motion sensor responds; samples without it would mislead the model.
              </p>
            ) : (
              recordMsg && <p className={recordMsg.ok ? "text-green-700" : "text-red-600"}>{recordMsg.text}</p>
            )}
          </div>
        </Card>
      )}

      <Card
        title={`3. Samples (${samples.length})`}
        description="Saved in this browser. Supabase only gets finger data, so download the CSVs to keep the motion data."
        action={
          samples.length > 0 && (
            <Button variant="danger" size="sm" onClick={clearRecordings}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={downloadCsv} disabled={samples.length === 0}>
            <Download className="h-3.5 w-3.5" /> Summary CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadFramesCsv} disabled={samples.length === 0}>
            <Download className="h-3.5 w-3.5" /> All readings CSV
          </Button>
        </div>
        {persistError && (
          <p className="mt-3 text-sm text-red-600">
            This browser's storage is full ({persistError}). Download the CSVs before refreshing the page.
          </p>
        )}
        {samples.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">Show samples</summary>
            <ul className="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 text-sm">
              {[...samples].reverse().map((s) => (
                <li
                  key={`${s.localSessionId}-${s.letter}-${s.rep}-${s.timestamp}`}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-gray-700">
                    <span className="font-semibold text-indigo-600">{s.letter}</span> · rep {s.rep}
                    <span className="ml-2 text-xs text-gray-500">
                      {s.participantId} · {new Date(s.timestamp).toLocaleTimeString()}
                    </span>
                  </span>
                  <span className={`text-xs ${s.synced ? "text-green-700" : "text-gray-400"}`}>
                    {s.synced ? "synced" : "this browser only"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
    </div>
  );
}
