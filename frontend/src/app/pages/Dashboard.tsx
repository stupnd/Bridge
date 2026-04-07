import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useSensor } from "../context/SensorContext";
import { supabase } from "../../supabaseClient";
import {
  loadFlexCalibration,
} from "../lib/flexCalibrationStorage";

type GestureProfile = {
  id: number;
  Label: string;
  Finger1: number;
  Finger2: number;
  Finger3: number;
  Finger4: number;
  Finger5: number;
};

type FingerState = boolean | null;
type GestureRule = {
  label: string;
  fingers: [FingerState, FingerState, FingerState, FingerState, FingerState];
};

const ASL_RULES: GestureRule[] = [
  { label: "A", fingers: [false, true, true, true, true] },
  { label: "B", fingers: [true, false, false, false, false] },
  { label: "D", fingers: [true, false, true, true, true] },
  { label: "F", fingers: [true, true, false, false, false] },
  { label: "I", fingers: [true, true, true, true, false] },
  { label: "L", fingers: [false, false, true, true, true] },
  { label: "S", fingers: [true, true, true, true, true] },
  { label: "U", fingers: [true, false, false, true, true] },
  { label: "Y", fingers: [false, true, true, true, false] },
];

function classifyFinger(raw: number, open: number, closed: number): boolean {
  const range = closed - open;
  if (Math.abs(range) < 10) return false;
  return (raw - open) / range > 0.45;
}

function matchRules(
  fingers: number[],
  open: number[],
  closed: number[]
): string | null {
  const bent = fingers.map((raw, i) => classifyFinger(raw, open[i], closed[i]));
  for (const rule of ASL_RULES) {
    const match = rule.fingers.every((f, i) => f === null || f === bent[i]);
    if (match) return rule.label;
  }
  return null;
}

function findClosestGesture(
  current: number[],
  profiles: GestureProfile[]
): string | null {
  if (profiles.length === 0) return null;
  let bestMatch: GestureProfile | null = null;
  let bestScore = Infinity;
  for (const p of profiles) {
    const score =
      Math.abs(p.Finger1 - current[0]) +
      Math.abs(p.Finger2 - current[1]) +
      Math.abs(p.Finger3 - current[2]) +
      Math.abs(p.Finger4 - current[3]) +
      Math.abs(p.Finger5 - current[4]);
    if (score < bestScore) { bestScore = score; bestMatch = p; }
  }
  return bestScore < 300 ? bestMatch!.Label : null;
}

export default function Dashboard() {
  const { fingers, connected, connect } = useSensor();
  const [currentSign, setCurrentSign] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [profiles, setProfiles] = useState<GestureProfile[]>([]);
  const [calibration, setCalibration] = useState<{ open: number[]; closed: number[] } | null>(null);

  useEffect(() => {
    const stored = loadFlexCalibration();
    if (stored) setCalibration({ open: stored.straight, closed: stored.bent });

    async function loadProfiles() {
      const { data } = await supabase.from("DEMO").select("*");
      if (data) setProfiles(data.filter((p: any) => p.Finger1 !== null));
    }
    loadProfiles();
  }, []);

  // Detect gesture from live sensor data
  useEffect(() => {
    if (!connected || paused) return;

    let detected: string | null = null;

    if (calibration) {
      detected = matchRules(fingers, calibration.open, calibration.closed);
    }
    if (!detected) {
      detected = findClosestGesture(fingers, profiles);
    }

    if (detected && detected !== currentSign) {
      setCurrentSign(detected);
      setHistory((prev) => {
        const next = [detected!, ...prev.filter((h) => h !== detected)];
        return next.slice(0, 8);
      });
    }
  }, [fingers, connected, paused, calibration, profiles]);

  const statusLabel = !connected
    ? "Disconnected"
    : paused
    ? "Paused"
    : "Listening";

  const statusColor = !connected
    ? "bg-gray-400"
    : paused
    ? "bg-yellow-400"
    : "bg-green-500";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-8">
      <div className="w-full max-w-4xl">
        {/* Status */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="relative">
            {connected && !paused && (
              <motion.div
                className="absolute inset-0 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <div className={`relative w-3 h-3 rounded-full ${statusColor}`} />
          </div>
          <p className="text-gray-600">{statusLabel}</p>
        </div>

        {/* Main display */}
        <motion.div
          key={currentSign ?? "empty"}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-12 md:p-16 mb-8 border border-gray-100"
        >
          <div className="text-center">
            {!connected ? (
              <div className="space-y-4">
                <p className="text-2xl text-gray-400">Glove not connected</p>
                <button
                  onClick={connect}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Connect Glove
                </button>
              </div>
            ) : currentSign ? (
              <>
                <p className="text-4xl sm:text-6xl md:text-8xl tracking-wider text-indigo-600 mb-4">
                  {currentSign}
                </p>
                <div className="inline-block px-4 py-2 bg-indigo-50 rounded-full">
                  <p className="text-sm text-indigo-700">ASL → Text (Live)</p>
                </div>
              </>
            ) : (
              <p className="text-2xl text-gray-400">
                {calibration ? "Sign a letter..." : "Go to Sensor tab to calibrate first"}
              </p>
            )}
          </div>
        </motion.div>

        {/* Controls */}
        {connected && (
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setPaused((p) => !p)}
              className={`px-6 py-3 rounded-lg transition-colors ${
                paused
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <div className="flex flex-col items-center">
                <span>{paused ? "Resume" : "Pause"}</span>
                <span className="text-xs opacity-75 mt-0.5">
                  {paused ? "Resume live input" : "Pause detection"}
                </span>
              </div>
            </button>
            <button
              onClick={() => { setCurrentSign(null); setHistory([]); }}
              className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              <div className="flex flex-col items-center">
                <span>Clear</span>
                <span className="text-xs opacity-75 mt-0.5">Reset display</span>
              </div>
            </button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm text-gray-500 mb-3">Recent signs</h3>
            <div className="flex flex-wrap gap-2">
              {history.map((word, i) => (
                <div
                  key={i}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 font-medium"
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}