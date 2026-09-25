import { useState, useRef, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { rawToBendNormalized, saveFlexCalibration } from "../lib/flexCalibrationStorage";
import { useSensor } from "../context/SensorContext";

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
const PILOT_LETTERS = ["A", "E", "M", "N", "S", "T"] as const;
const CUSTOM = "__custom__";
const PARTICIPANT_KEY = "bridge-collect-participant-id";
const NOTES_MAX = 140;

type CalibStep = "idle" | "open" | "open_hold" | "closed" | "closed_hold" | "done";

type Sample = {
  timestamp: string;
  dbSessionId: number | null;
  localSessionId: string;
  participantId: string;
  letter: string;
  rep: number;
  raw: number[];
  pct: number[];
  notes: string;
  synced: boolean;
};

function csvCell(v: string | number | boolean | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function DataCollector() {
  const { fingers, connected, status, connect, disconnect, fingersRef } = useSensor();

  const [participantId, setParticipantId] = useState(() => {
    try {
      return localStorage.getItem(PARTICIPANT_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [calibStep, setCalibStep] = useState<CalibStep>("idle");
  const [calibCountdown, setCalibCountdown] = useState(0);
  const [calibration, setCalibration] = useState<{ open: number[]; closed: number[] } | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [dbSessionId, setDbSessionId] = useState<number | null>(null);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [sessionMsg, setSessionMsg] = useState("");

  const [letterChoice, setLetterChoice] = useState<string>(PILOT_LETTERS[0]);
  const [customLetter, setCustomLetter] = useState("");
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const samplesRef = useRef<Sample[]>([]);
  const repCounts = useRef<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem(PARTICIPANT_KEY, participantId);
    } catch {
      /* ignore */
    }
  }, [participantId]);

  const letter = (letterChoice === CUSTOM ? customLetter : letterChoice).trim().toUpperCase();

  async function collectSamples(n: number, intervalMs: number): Promise<number[]> {
    const readings: number[][] = [];
    for (let i = 0; i < n; i++) {
      readings.push([...fingersRef.current]);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return readings[0].map((_, i) =>
      Math.round(readings.reduce((sum, r) => sum + r[i], 0) / readings.length)
    );
  }

  async function countdown(seconds: number) {
    for (let i = seconds; i > 0; i--) {
      setCalibCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCalibCountdown(0);
  }

  async function startSession() {
    if (!participantId.trim()) {
      setSessionMsg("Enter a participant ID first.");
      return;
    }
    setSessionMsg("");
    setSessionActive(false);

    setCalibStep("open");
    await countdown(3);
    setCalibStep("open_hold");
    const openVals = await collectSamples(15, 100);

    setCalibStep("closed");
    await countdown(3);
    setCalibStep("closed_hold");
    const closedVals = await collectSamples(15, 100);

    setCalibration({ open: openVals, closed: closedVals });
    saveFlexCalibration(openVals, closedVals);
    setCalibStep("done");

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
        "Session started locally (Supabase insert failed: " +
          (error?.message ?? "no data") +
          "). Samples will be local-only."
      );
    } else {
      setDbSessionId(data.session_id as number);
      setSessionMsg(`Session ${data.session_id} started ✓`);
    }
  }

  async function recordSample() {
    if (!calibration || !localSessionId || !letter) return;
    setRecording(true);

    const raw = await collectSamples(10, 100);
    const pct = raw.map(
      (r, i) =>
        Math.round(rawToBendNormalized(r, calibration.open[i], calibration.closed[i]) * 1000) / 10
    );
    const rep = (repCounts.current[letter] ?? 0) + 1;
    repCounts.current[letter] = rep;

    const sample: Sample = {
      timestamp: new Date().toISOString(),
      dbSessionId,
      localSessionId,
      participantId: participantId.trim(),
      letter,
      rep,
      raw,
      pct,
      notes: notes.trim(),
      synced: false,
    };

    // Local copy is the source of truth; add before attempting the insert.
    samplesRef.current = [...samplesRef.current, sample];
    setSamples(samplesRef.current);

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
        notes: sample.notes || null,
      });
      if (error) {
        console.error("Training data insert failed:", error);
      } else {
        samplesRef.current = samplesRef.current.map((s) =>
          s === sample ? { ...s, synced: true } : s
        );
        setSamples(samplesRef.current);
      }
    }
    setRecording(false);
  }

  function downloadCsv() {
    const header = [
      "timestamp",
      "db_session_id",
      "local_session_id",
      "participant_id",
      "letter",
      "rep",
      "raw_f1", "raw_f2", "raw_f3", "raw_f4", "raw_f5",
      "pct_f1", "pct_f2", "pct_f3", "pct_f4", "pct_f5",
      "notes",
      "synced_to_supabase",
    ];
    const rows = samplesRef.current.map((s) =>
      [
        s.timestamp,
        s.dbSessionId,
        s.localSessionId,
        s.participantId,
        s.letter,
        s.rep,
        ...s.raw,
        ...s.pct,
        s.notes,
        s.synced,
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asl-samples-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const bendPercents = fingers.map((raw, i) => {
    if (!calibration) return Math.round((raw / 4095) * 100);
    return Math.round(
      rawToBendNormalized(raw, calibration.open[i], calibration.closed[i]) * 100
    );
  });

  const calibInProgress = calibStep !== "idle" && calibStep !== "done";
  const nextRep = letter ? (repCounts.current[letter] ?? 0) + 1 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Status:</span> {status}
          {sessionActive && (
            <span className="ml-2 text-green-600 text-xs font-medium">● Session active</span>
          )}
        </p>

        <div className="flex gap-2">
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
              className="px-4 py-2 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* ── Participant + session start ── */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="participant-id">
            Participant ID
          </label>
          <div className="flex gap-2">
            <input
              id="participant-id"
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="e.g. P01"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              maxLength={40}
            />
            <button
              type="button"
              onClick={startSession}
              disabled={!connected || calibInProgress || !participantId.trim()}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {sessionActive ? "Start new session" : "Start session"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Starting a session runs open-hand / closed-fist calibration and resets rep counts.
          </p>
        </div>

        {sessionMsg && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {sessionMsg}
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

        {/* ── Live finger readings ── */}
        {connected && (
          <div className="space-y-3 pt-2">
            {FINGER_NAMES.map((name, i) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{name}</span>
                  <span className="text-gray-400 text-xs">
                    raw: {fingers[i]}
                    {calibration && (
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
          </div>
        )}

        {/* ── Record ── */}
        {connected && sessionActive && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <p className="font-medium text-indigo-800">Record a sample</p>
            <div className="flex gap-2">
              <select
                value={letterChoice}
                onChange={(e) => setLetterChoice(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {PILOT_LETTERS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
                <option value={CUSTOM}>Custom…</option>
              </select>
              {letterChoice === CUSTOM && (
                <input
                  type="text"
                  value={customLetter}
                  onChange={(e) => setCustomLetter(e.target.value)}
                  placeholder="Letter / label"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  maxLength={20}
                />
              )}
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              maxLength={NOTES_MAX}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={recordSample}
                disabled={recording || !letter}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {recording ? "Recording..." : "Record"}
              </button>
              {letter && (
                <span className="text-xs text-indigo-700">
                  Next: {letter} rep {nextRep}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Sample log ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Samples ({samples.length})
            </p>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={samples.length === 0}
              className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              Download CSV
            </button>
          </div>
          {samples.length > 0 && (
            <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl text-sm">
              {[...samples].reverse().map((s) => (
                <li
                  key={`${s.localSessionId}-${s.letter}-${s.rep}-${s.timestamp}`}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-gray-700">
                    <span className="font-bold text-indigo-600">{s.letter}</span> · rep {s.rep}
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(s.timestamp).toLocaleTimeString()}
                    </span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      s.synced
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {s.synced ? "synced" : "local-only"}
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
