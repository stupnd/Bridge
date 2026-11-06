import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { EMPTY_IMU, FlexCalibration, Frame, ImuReading, imuLooksDisconnected } from "../lib/imu";
import {
  clearFlexCalibrationStorage,
  loadFlexCalibration,
  rawToBendNormalized,
  rawToBendUncalibrated,
  saveFlexCalibration,
} from "../lib/flexCalibrationStorage";
import { CLOSED_RAW, OPEN_RAW, simulatedPacket } from "../lib/gloveSimulator";

const SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
const CHARACTERISTIC_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd";
/** BLE.setLocalName() in esp32.ino. */
const GLOVE_NAME = "MyArduinoDevice";

// Packet layout (esp32.ino, little-endian): 9 × float32 IMU (acc mg, gyro dps, mag µT), then 5 × int32 flex.
const IMU_COUNT = 9;
const FLEX_COUNT = 5;
const FLEX_OFFSET = IMU_COUNT * 4;
const PACKET_BYTES = FLEX_OFFSET + FLEX_COUNT * 4;
const SIM_INTERVAL_MS = 20; // 50 Hz
const RECONNECT_TRIES = 5;
const RECONNECT_DELAY_MS = 2000;

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
  /** Devices and characteristics whose events are already hooked up (once each, across reconnects). */
  const watched = useRef(new WeakSet<object>());
  /** True after the user presses Disconnect, so the drop isn't auto-reconnected. */
  const userDisconnected = useRef(false);
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
      : rawToBendUncalibrated(raw)
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

  // Screenshot builds (`vite build --mode capture`) show live pages: a simulated,
  // calibrated glove from the first frame. Never set in a production build.
  useEffect(() => {
    if (import.meta.env.VITE_CAPTURE !== "1") return;
    saveCalibration({ open: [...OPEN_RAW], closed: [...CLOSED_RAW] });
    setSimulating(true);
  }, []);

  /** Opens the link to a glove that's already been chosen and starts its data stream. */
  async function openGlove(device: BluetoothDevice) {
    deviceRef.current = device;
    if (!watched.current.has(device)) {
      watched.current.add(device);
      device.addEventListener("gattserverdisconnected", () => onGloveLost(device));
    }
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    await characteristic.startNotifications();
    // Chrome may hand back the same object after a reconnect; listen once, or every packet arrives twice.
    if (watched.current.has(characteristic)) {
      setConnected(true);
      setStatus("Connected ✓");
      return;
    }
    watched.current.add(characteristic);
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
  }

  // A dropped glove (loose wire, reset, out of range) reconnects in the
  // background, so it doesn't mean going through the browser's picker again.
  async function onGloveLost(device: BluetoothDevice) {
    setConnected(false);
    resetReadings();
    for (let i = 0; i < RECONNECT_TRIES && !userDisconnected.current && deviceRef.current === device; i++) {
      setStatus("Reconnecting...");
      try {
        await openGlove(device);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
      }
    }
    if (deviceRef.current === device) setStatus("Disconnected");
  }

  // After a page reload, reconnect to a glove this browser has already paired
  // with, without the picker. Only where Chrome exposes getDevices().
  useEffect(() => {
    const bt = (navigator as any).bluetooth;
    if (import.meta.env.VITE_CAPTURE === "1" || !bt?.getDevices) return;
    bt.getDevices()
      .then((devices: BluetoothDevice[]) => {
        const glove = devices.find((d) => d.name === GLOVE_NAME);
        if (!glove || deviceRef.current) return;
        userDisconnected.current = false;
        setStatus("Reconnecting...");
        void onGloveLost(glove);
      })
      .catch(() => {});
  }, []);

  async function connect() {
    try {
      if (!("bluetooth" in navigator)) {
        setStatus("Error: Web Bluetooth not supported");
        return;
      }
      userDisconnected.current = false;
      setStatus("Scanning...");
      // Only list the glove: it advertises our service, and its name is the
      // fallback (the Pi's receiver also finds it by name, so keep both in sync).
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }, { name: GLOVE_NAME }],
        optionalServices: [SERVICE_UUID],
      });
      setStatus("Connecting...");
      await openGlove(device);
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
    userDisconnected.current = true;
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
