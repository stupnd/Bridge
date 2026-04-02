import { useState, useRef, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  clearFlexCalibrationStorage,
  defaultBent,
  defaultStraight,
  loadFlexCalibration,
  rawToBendNormalized,
  saveFlexCalibration,
} from "../lib/flexCalibrationStorage";

const SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
const CHARACTERISTIC_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd";
const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
const MATCH_THRESHOLD = 300;

// Which letters we support with rule-based detection
// Finger order: [Thumb, Index, Middle, Ring, Pinky]
// true = bent/closed, false = straight/open, null = don't care
type FingerState = boolean | null;
type GestureRule = {
  label: string;
  // Each entry: [thumb, index, middle, ring, pinky]
  fingers: [FingerState, FingerState, FingerState, FingerState, FingerState];
  description: string;
};

const ASL_RULES: GestureRule[] = [
  {
    label: "A",
    fingers: [false, true, true, true, true],
    description: "Fist, thumb rests on side",
  },
  {
    label: "B",
    fingers: [true, false, false, false, false],
    description: "All fingers up, thumb bent across palm",
  },
  {
    label: "C",
    fingers: [null, false, false, false, false],
    description: "All fingers curved like a C",
  },
  {
    label: "L",
    fingers: [false, false, true, true, true],
    description: "Index up, thumb out — like an L shape",
  },
  {
    label: "Y",
    fingers: [false, true, true, true, false],
    description: "Thumb + pinky out, others bent",
  },
  {
    label: "5",
    fingers: [false, false, false, false, false],
    description: "All five fingers spread open",
  },
  {
    label: "1",
    fingers: [true, false, true, true, true],
    description: "Only index finger pointing up",
  },
  {
    label: "6",
    fingers: [false, false, false, false, true],
    description: "Pinky touching thumb, others open",
  },
];

type GestureProfile = {
  id: number;
  Label: string;
  Finger1: number;
  Finger2: number;
  Finger3: number;
  Finger4: number;
  Finger5: number;
};

type CalibrationData = {
  open: number[];  // raw values when fully open
  closed: number[]; // raw values when fully closed
};

function parseSensorData(dv: DataView): number[] {
  const fingers = [];
  for (let i = 0; i < 5; i++) {
    fingers.push(dv.getInt32(36 + i * 4, true));
  }
  return fingers;
}

// Returns true if finger is bent, false if straight, based on calibration
function classifyFinger(
  raw: number,
  open: number,
  closed: number,
  threshold = 0.45 // >45% of the way toward closed = bent
): boolean {
  const range = closed - open;
  if (Math.abs(range) < 10) return false; // no real range, can't classify
  const normalized = (raw - open) / range;
  return normalized > threshold;
}

function matchRules(
  fingers: number[],
  calibration: CalibrationData | null
): string | null {
  if (!calibration) return null;

  const bent = fingers.map((raw, i) =>
    classifyFinger(raw, calibration.open[i], calibration.closed[i])
  );

  let bestMatch: string | null = null;
  let bestScore = -1;

  for (const rule of ASL_RULES) {
    let score = 0;
    let total = 0;
    for (let i = 0; i < 5; i++) {
      if (rule.fingers[i] === null) continue;
      total++;
      if (bent[i] === rule.fingers[i]) score++;
    }
    const pct = total === 0 ? 0 : score / total;
    if (pct === 1 && score > bestScore) {
      bestScore = score;
      bestMatch = rule.label;
    }
  }

  return bestMatch;
}

function findClosestGesture(
  current: number[],
  profiles: GestureProfile[]
): string | null {
  if (profiles.length === 0) return null;
  let bestMatch: GestureProfile | null = null;
  let bestScore = Infinity;

  for (const profile of profiles) {
    const profileVals = [
      profile.Finger1,
      profile.Finger2,
      profile.Finger3,
      profile.Finger4,
      profile.Finger5,
    ];
    const score = profileVals.reduce(
      (sum, val, i) => sum + Math.abs(val - current[i]),
      0
    );
    if (score < bestScore) {
      bestScore = score;
      bestMatch = profile;
    }
  }

  return bestScore < MATCH_THRESHOLD ? bestMatch!.Label : null;
}

type CalibStep = "idle" | "open" | "open_hold" | "closed" | "closed_hold" | "done";

export default function FlexSensor() {
  const [fingers, setFingers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [profiles, setProfiles] = useState<GestureProfile[]>([]);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [calibStep, setCalibStep] = useState<CalibStep>("idle");
  const [calibCountdown, setCalibCountdown] = useState(0);
  const [calibHint, setCalibHint] = useState<string | null>(null);
  const latestFingers = useRef<number[]>([0, 0, 0, 0, 0]);
  const calibrationRef = useRef<CalibrationData | null>(null);

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  useEffect(() => {
    const stored = loadFlexCalibration();
    if (stored) {
      setCalibration({ open: stored.straight, closed: stored.bent });
      setCalibStep("done");
    }
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const { data, error } = await supabase.from("DEMO").select("*");
    if (error) {
      console.error("Error loading profiles:", error);
    } else {
      setProfiles((data as GestureProfile[]).filter((p) => p.Finger1 !== null));
    }
  }

  async function connect() {
    try {
      if (!("bluetooth" in navigator)) {
        setStatus("Error: Web Bluetooth not supported");
        return;
      }
      setStatus("Scanning...");
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      });
      setStatus("Connecting...");
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (e: Event) => {
        const dv = (e.target as any).value as DataView;
        if (!dv) return;
        const vals = parseSensorData(dv);
        latestFingers.current = vals;
        setFingers([...vals]);
      });
      setConnected(true);
      setStatus("Connected ✓");
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("Disconnected");
        setFingers([0, 0, 0, 0, 0]);
      });
    } catch (err) {
      setStatus("Error: " + (err instanceof Error ? err.message : "Unknown"));
    }
  }

  // Collect N samples and average them
  async function collectSamples(n = 10, intervalMs = 100): Promise<number[]> {
    const readings: number[][] = [];
    for (let i = 0; i < n; i++) {
      readings.push([...latestFingers.current]);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return readings[0].map((_, i) =>
      Math.round(readings.reduce((sum, r) => sum + r[i], 0) / readings.length)
    );
  }

  async function countdown(seconds: number, onTick: (n: number) => void) {
    for (let i = seconds; i > 0; i--) {
      onTick(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    onTick(0);
  }

  async function startCalibration() {
    // Step 1: Open hand
    setCalibStep("open");
    await countdown(3, setCalibCountdown);
    setCalibStep("open_hold");
    const openVals = await collectSamples(15, 100);

    // Step 2: Closed fist
    setCalibStep("closed");
    await countdown(3, setCalibCountdown);
    setCalibStep("closed_hold");
    const closedVals = await collectSamples(15, 100);

    setCalibration({ open: openVals, closed: closedVals });
    saveFlexCalibration(openVals, closedVals);
    setCalibStep("done");
    setCalibHint("Calibration saved — shared with Hand Visualizer.");
  }

  function captureOpenFromCurrentPose() {
    const v = [...latestFingers.current];
    const closed =
      calibrationRef.current?.closed ?? defaultBent();
    setCalibration({ open: v, closed });
    saveFlexCalibration(v, closed);
    setCalibStep("done");
    setCalibHint("Open-hand pose saved. Adjust closed pose with “Set closed” if needed.");
  }

  function captureClosedFromCurrentPose() {
    const v = [...latestFingers.current];
    const open = calibrationRef.current?.open ?? defaultStraight();
    setCalibration({ open, closed: v });
    saveFlexCalibration(open, v);
    setCalibStep("done");
    setCalibHint("Closed pose saved.");
  }

  function resetSavedCalibration() {
    clearFlexCalibrationStorage();
    setCalibration(null);
    setCalibStep("idle");
    setCalibHint("Saved calibration cleared. Use wizard or quick capture again.");
  }

  async function recordGesture() {
    if (!label.trim()) return;
    setSaving(true);
    setSaveStatus("");
    setRecording(true);

    const readings: number[][] = [];
    for (let i = 0; i < 3; i++) {
      readings.push([...latestFingers.current]);
      await new Promise((r) => setTimeout(r, 300));
    }
    const avg = readings[0].map((_, i) =>
      Math.round(readings.reduce((sum, r) => sum + r[i], 0) / readings.length)
    );

    const { error } = await supabase.from("DEMO").insert({
      Label: label.trim().toUpperCase(),
      Finger1: avg[0],
      Finger2: avg[1],
      Finger3: avg[2],
      Finger4: avg[3],
      Finger5: avg[4],
    });

    if (error) {
      setSaveStatus("Error: " + error.message);
    } else {
      setSaveStatus(`Saved "${label.toUpperCase()}" ✓`);
      setLabel("");
      await loadProfiles();
    }
    setSaving(false);
    setRecording(false);
  }

  // Prefer rule-based detection if calibrated; fall back to DB profiles
  const ruleGesture = calibration ? matchRules(fingers, calibration) : null;
  const dbGesture = connected ? findClosestGesture(fingers, profiles) : null;
  const detectedGesture = connected ? (ruleGesture ?? dbGesture) : null;

  // Finger bend % for display (0–100)
  const bendPercents = fingers.map((raw, i) => {
    if (!calibration) return Math.round((raw / 4095) * 100);
    return Math.round(
      rawToBendNormalized(raw, calibration.open[i], calibration.closed[i]) * 100
    );
  });

  const calibInProgress = calibStep !== "idle" && calibStep !== "done";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Glove Sensor</h2>
        <p className="text-sm text-gray-600">
          Connect your ESP32 glove, calibrate, then see live ASL detection.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Status:</span> {status}
          {calibration && (
            <span className="ml-2 text-green-600 text-xs font-medium">● Calibrated</span>
          )}
        </p>

        {/* Saved profile tags */}
        {profiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <span
                key={p.id}
                className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium"
              >
                {p.Label}
              </span>
            ))}
          </div>
        )}

        {!connected && (
          <button
            onClick={connect}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Connect via Bluetooth
          </button>
        )}

        {/* ── Calibration ── */}
        {connected && calibStep === "idle" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
            <div className="space-y-2">
              <p className="font-medium text-amber-800">Calibrate sensors</p>
              <p className="text-sm text-amber-700">
                Guided flow captures open hand, then a fist. Same data syncs with
                the Hand Visualizer page.
              </p>
              <button
                type="button"
                onClick={startCalibration}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                Start guided calibration
              </button>
            </div>
            <div className="border-t border-amber-200 pt-4 space-y-2">
              <p className="text-sm font-medium text-amber-900">
                Quick capture (current pose)
              </p>
              <p className="text-xs text-amber-800/90">
                Hold the pose, then tap once. Set both open and closed for best
                results (order doesn’t matter).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={captureOpenFromCurrentPose}
                  className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-amber-900 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Set open hand
                </button>
                <button
                  type="button"
                  onClick={captureClosedFromCurrentPose}
                  className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-amber-900 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Set closed / bent
                </button>
              </div>
            </div>
          </div>
        )}

        {connected && calibration && calibStep === "done" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-slate-600">
              Adjust calibration
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={captureOpenFromCurrentPose}
                className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs font-medium hover:bg-slate-100"
              >
                Re-capture open hand
              </button>
              <button
                type="button"
                onClick={captureClosedFromCurrentPose}
                className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs font-medium hover:bg-slate-100"
              >
                Re-capture closed
              </button>
            </div>
          </div>
        )}

        {calibHint && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {calibHint}
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

        {connected && calibStep === "done" && !calibration && null}

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

        {/* ── Recalibrate ── */}
        {connected && calibration && (
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => {
                setCalibStep("idle");
                setCalibHint(null);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Run calibration again
            </button>
            <button
              type="button"
              onClick={resetSavedCalibration}
              className="text-xs text-red-500 hover:text-red-700 underline"
            >
              Clear saved calibration
            </button>
          </div>
        )}

        {/* ── Supported ASL letters cheat sheet ── */}
        {connected && calibration && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Rule-based detection supports:</p>
            <div className="flex flex-wrap gap-2">
              {ASL_RULES.map((r) => (
                <span
                  key={r.label}
                  title={r.description}
                  className={`px-2 py-1 rounded-md text-xs font-bold border ${
                    detectedGesture === r.label
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-300"
                  }`}
                >
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Record custom gesture ── */}
        {connected && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
            <p className="font-medium text-indigo-800">Record a custom gesture</p>
            <p className="text-sm text-indigo-700">
              Hold the sign, type the label, then click Record.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. A, B, Hello"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                maxLength={20}
              />
              <button
                onClick={recordGesture}
                disabled={saving || !label.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {recording ? "Recording..." : "Record"}
              </button>
            </div>
            {saveStatus && (
              <p className="text-sm text-indigo-700">{saveStatus}</p>
            )}
          </div>
        )}

        {/* ── Detected gesture ── */}
        {connected && (
          <div className="pt-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Detected</p>
            <p className="text-6xl font-bold text-indigo-600 min-h-[72px]">
              {detectedGesture ?? "—"}
            </p>
            {detectedGesture && (
              <p className="text-xs text-gray-400 mt-1">
                {ruleGesture ? "via rules" : "via saved profile"}
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 pt-2">
          Works best in Chrome or Edge on desktop.
        </p>
      </div>
    </div>
  );
}