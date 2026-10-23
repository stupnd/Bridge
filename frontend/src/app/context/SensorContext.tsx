import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { EMPTY_IMU, FlexCalibration, Frame, ImuReading, imuLooksDisconnected } from "../lib/imu";
import {
  clearFlexCalibrationStorage,
  loadFlexCalibration,
  rawToBendNormalized,
  saveFlexCalibration,
} from "../lib/flexCalibrationStorage";
import { simulatedPacket } from "../lib/gloveSimulator";

const SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
const CHARACTERISTIC_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

// Packet layout (esp32.ino, little-endian): 9 × float32 IMU (acc mg, gyro dps, mag µT), then 5 × int32 flex.
const IMU_COUNT = 9;
const FLEX_COUNT = 5;
const FLEX_OFFSET = IMU_COUNT * 4;
const PACKET_BYTES = FLEX_OFFSET + FLEX_COUNT * 4;
const SIM_INTERVAL_MS = 20; // 50 Hz

/** One packet as delivered to subscribers: `imu` is the same 9 values as acc/gyr/mag, flattened. */
export type SensorFrame = Frame & { imu: number[] };
export type FrameListener = (frame: SensorFrame) => void;
export type SubscribeFn = (cb: FrameListener) => () => void;

type SensorContextType = {
  fingers: number[];
  connected: boolean;
  status: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  fingersRef: React.MutableRefObject<number[]>;
  imu: ImuReading;
  imuRef: React.MutableRefObject<ImuReading>;
  /** Called for every packet (~50/s), without waiting for a React render. Returns an unsubscribe fn. */
  subscribe: SubscribeFn;
  /** Open-hand / fist readings shared by every page; null until calibrated. */
  calibration: FlexCalibration | null;
  saveCalibration: (c: FlexCalibration) => void;
  clearCalibration: () => void;
  /** Per-finger bend, 0 = straight, 1 = fully bent (raw/4095 until calibrated). */
  bends: number[];
  /** False while the 9-axis sensor sends all zeros (missing or reconnecting). */
  imuLive: boolean;
  /** Dev only: fake glove frames at 50 Hz through the same subscribe() path. */
  simulating: boolean;
  setSimulating: (on: boolean) => void;
};

const SensorContext = createContext<SensorContextType | null>(null);

export function SensorProvider({ children }: { children: ReactNode }) {
  const [fingers, setFingers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [simulating, setSimulatingState] = useState(false);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const fingersRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const [imu, setImu] = useState<ImuReading>(EMPTY_IMU);
  const imuRef = useRef<ImuReading>(EMPTY_IMU);
  const listeners = useRef(new Set<FrameListener>());
  const renderFrame = useRef<number | null>(null);
  const simTimer = useRef<number | null>(null);
  const [calibration, setCalibration] = useState<FlexCalibration | null>(() => {
    const c = loadFlexCalibration();
    return c ? { open: c.straight, closed: c.bent } : null;
  });

  const saveCalibration = useCallback((c: FlexCalibration) => {
    saveFlexCalibration(c.open, c.closed);
    setCalibration(c);
  }, []);

  const clearCalibration = useCallback(() => {
    clearFlexCalibrationStorage();
    setCalibration(null);
  }, []);

  const bends = fingers.map((raw, i) =>
    calibration
      ? rawToBendNormalized(raw, calibration.open[i], calibration.closed[i])
      : Math.max(0, Math.min(1, raw / 4095))
  );

  // Stable identity so effects that subscribe don't re-run on every packet.
  const subscribe = useCallback<SubscribeFn>((fn) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  function cancelPendingRender() {
    if (renderFrame.current !== null) cancelAnimationFrame(renderFrame.current);
    renderFrame.current = null;
  }

  /** Shared by Bluetooth and the simulator. */
  function emit(t: number, vals: number[], imuVals: number[]) {
    const reading: ImuReading = {
      acc: [imuVals[0], imuVals[1], imuVals[2]],
      gyr: [imuVals[3], imuVals[4], imuVals[5]],
      mag: [imuVals[6], imuVals[7], imuVals[8]],
    };
    fingersRef.current = vals;
    imuRef.current = reading;
    // Render the latest packet once per display frame rather than once per packet.
    if (renderFrame.current === null) {
      renderFrame.current = requestAnimationFrame(() => {
        renderFrame.current = null;
        setFingers([...fingersRef.current]);
        setImu(imuRef.current);
      });
    }
    const frame: SensorFrame = { t, fingers: vals, ...reading, imu: imuVals };
    listeners.current.forEach((fn) => {
      try {
        fn(frame);
      } catch (err) {
        console.error("Sensor subscriber failed:", err);
      }
    });
  }

  function resetReadings() {
    cancelPendingRender();
    setFingers([0, 0, 0, 0, 0]);
    fingersRef.current = [0, 0, 0, 0, 0];
    setImu(EMPTY_IMU);
    imuRef.current = EMPTY_IMU;
  }

  function stopSim() {
    if (simTimer.current !== null) window.clearInterval(simTimer.current);
    simTimer.current = null;
  }

  useEffect(() => stopSim, []);

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
      deviceRef.current = device;
      setStatus("Connecting...");
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (e: Event) => {
        const t = performance.now();
        const dv = (e.target as any).value as DataView;
        if (!dv || dv.byteLength < PACKET_BYTES) return;
        const imuVals: number[] = [];
        for (let i = 0; i < IMU_COUNT; i++) imuVals.push(dv.getFloat32(i * 4, true));
        const vals: number[] = [];
        for (let i = 0; i < FLEX_COUNT; i++) vals.push(dv.getInt32(FLEX_OFFSET + i * 4, true));
        emit(t, vals, imuVals);
      });
      setConnected(true);
      setStatus("Connected ✓");
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("Disconnected");
        resetReadings();
      });
    } catch (err) {
      // Closing the browser's device picker isn't an error worth showing.
      if (err instanceof Error && err.name === "NotFoundError") {
        setStatus("Disconnected");
        return;
      }
      setStatus("Error: " + (err instanceof Error ? err.message : "Unknown"));
    }
  }

  function disconnect() {
    stopSim();
    setSimulatingState(false);
    deviceRef.current?.gatt?.disconnect();
    setConnected(false);
    setStatus("Disconnected");
    resetReadings();
  }

  function setSimulating(on: boolean) {
    stopSim();
    if (!on) {
      setSimulatingState(false);
      setConnected(false);
      setStatus("Disconnected");
      resetReadings();
      return;
    }
    if (deviceRef.current?.gatt?.connected) return; // real glove in use
    const start = performance.now();
    simTimer.current = window.setInterval(() => {
      const t = performance.now();
      const packet = simulatedPacket(t - start);
      emit(t, packet.fingers, packet.imu);
    }, SIM_INTERVAL_MS);
    setSimulatingState(true);
    setConnected(true);
    setStatus("Simulated glove (dev)");
  }

  return (
    <SensorContext.Provider value={{
        fingers, connected, status, connect, disconnect, fingersRef, imu, imuRef, subscribe,
        calibration, saveCalibration, clearCalibration, bends, imuLive: !imuLooksDisconnected(imu),
        simulating, setSimulating,
      }}>
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useSensor must be used inside SensorProvider");
  return ctx;
}
