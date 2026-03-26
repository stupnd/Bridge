import { useState, useRef } from "react";

const SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
const CHARACTERISTIC_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

type CalibrationData = {
  straight: number[];
  bent: number[];
};

function getBendPercent(raw: number, straight: number, bent: number): number {
  if (bent === straight) return 0;
  const pct = ((raw - straight) / (bent - straight)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function classifyGesture(bends: number[]): string | null {
  const [thumb, index, middle, ring, pinky] = bends;
  if (thumb > 60 && index > 60 && middle > 60 && ring > 60 && pinky > 60) return "A";
  if (thumb < 40 && index < 40 && middle < 40 && ring < 40 && pinky < 40) return "B";
  if (index < 40 && thumb < 40 && middle > 60 && ring > 60 && pinky > 60) return "L";
  if (bends.every((b) => b > 35 && b < 75)) return "O";
  return null;
}

function parseSensorData(dv: DataView): number[] {
  const fingers = [];
  for (let i = 0; i < 5; i++) {
    fingers.push(dv.getInt32(36 + i * 4, true));
  }
  return fingers;
}

export default function FlexSensor() {
  const [fingers, setFingers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [calibStep, setCalibStep] = useState<"idle" | "straight" | "bent">("idle");
  const [currentFinger, setCurrentFinger] = useState(0);
  const latestFingers = useRef<number[]>([0, 0, 0, 0, 0]);

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

  function startCalibration() {
    setCalibStep("straight");
    setCalibration(null);
    setCurrentFinger(0);
  }

  function captureStraight() {
    setCalibration({ straight: [...latestFingers.current], bent: [] });
    setCalibStep("bent");
    setCurrentFinger(0);
  }

  function captureFingerBent() {
    const raw = latestFingers.current[currentFinger];
    setCalibration((prev) => {
      if (!prev) return prev;
      return { ...prev, bent: [...prev.bent, raw] };
    });
    if (currentFinger < 4) {
      setCurrentFinger((f) => f + 1);
    } else {
      setCalibStep("idle");
    }
  }

  const bendPercents = calibration?.bent.length === 5
    ? fingers.map((f, i) =>
        getBendPercent(f, calibration.straight[i], calibration.bent[i])
      )
    : null;

  const gesture = bendPercents ? classifyGesture(bendPercents) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold mb-1">Flex Sensor</h2>
        <p className="text-sm text-gray-600">
          Connect your ESP32 glove via Web Bluetooth to stream live flex values.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Status:</span> {status}
        </p>

        {!connected && (
          <button
            onClick={connect}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Connect via Bluetooth
          </button>
        )}

        {connected && calibStep === "idle" && (
          <button
            onClick={startCalibration}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            {calibration ? "Re-calibrate" : "Calibrate Sensors"}
          </button>
        )}

        {calibStep === "straight" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="font-medium text-amber-800">Step 1: Open your hand flat</p>
            <p className="text-sm text-amber-700">Hold all fingers straight, then click capture.</p>
            <button
              onClick={captureStraight}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
            >
              Capture Open Hand
            </button>
          </div>
        )}

        {calibStep === "bent" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="font-medium text-amber-800">
              Step 2: Curl your {FINGER_NAMES[currentFinger]} fully
            </p>
            <p className="text-sm text-amber-700">
              Finger {currentFinger + 1} of 5 — hold it bent, then click capture.
            </p>
            <button
              onClick={captureFingerBent}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
            >
              Capture {FINGER_NAMES[currentFinger]}
            </button>
          </div>
        )}

        {connected && (
          <div className="space-y-3 pt-2">
            {FINGER_NAMES.map((name, i) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{name}</span>
                  <span className="text-gray-500">
                    raw: {fingers[i]}
                    {bendPercents ? ` — ${bendPercents[i]}% bent` : ""}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-indigo-500 h-3 rounded-full transition-all"
                    style={{ width: bendPercents ? `${bendPercents[i]}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {gesture && (
          <div className="pt-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Detected letter</p>
            <p className="text-6xl font-bold text-indigo-600">{gesture}</p>
          </div>
        )}

        <p className="text-xs text-gray-500 pt-2">
          Works best in Chrome or Edge on desktop.
        </p>
      </div>
    </div>
  );
}