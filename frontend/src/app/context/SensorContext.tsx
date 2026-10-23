import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { EMPTY_IMU, FlexCalibration, Frame, ImuReading, imuLooksDisconnected } from "../lib/imu";
import {
  clearFlexCalibrationStorage,
  loadFlexCalibration,
  rawToBendNormalized,
  saveFlexCalibration,
} from "../lib/flexCalibrationStorage";

const SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
const CHARACTERISTIC_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

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
  subscribe: (fn: (frame: Frame) => void) => () => void;
  /** Open-hand / fist readings shared by every page; null until calibrated. */
  calibration: FlexCalibration | null;
  saveCalibration: (c: FlexCalibration) => void;
  clearCalibration: () => void;
  /** Per-finger bend, 0 = straight, 1 = fully bent (raw/4095 until calibrated). */
  bends: number[];
  /** False while the 9-axis sensor sends all zeros (missing or reconnecting). */
  imuLive: boolean;
};

const SensorContext = createContext<SensorContextType | null>(null);

export function SensorProvider({ children }: { children: ReactNode }) {
  const [fingers, setFingers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const fingersRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const [imu, setImu] = useState<ImuReading>(EMPTY_IMU);
  const imuRef = useRef<ImuReading>(EMPTY_IMU);
  const listeners = useRef(new Set<(frame: Frame) => void>());
  const renderFrame = useRef<number | null>(null);
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
  const subscribe = useCallback((fn: (frame: Frame) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  function cancelPendingRender() {
    if (renderFrame.current !== null) cancelAnimationFrame(renderFrame.current);
    renderFrame.current = null;
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
      deviceRef.current = device;
      setStatus("Connecting...");
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (e: Event) => {
        const dv = (e.target as any).value as DataView;
        if (!dv) return;
        // Packet layout (esp32.ino): 9 float32 acc/gyr/mag, then 5 int32 fingers.
        const f = (i: number) => dv.getFloat32(i * 4, true);
        const reading: ImuReading = {
          acc: [f(0), f(1), f(2)],
          gyr: [f(3), f(4), f(5)],
          mag: [f(6), f(7), f(8)],
        };
        const vals: number[] = [];
        for (let i = 0; i < 5; i++) vals.push(dv.getInt32(36 + i * 4, true));
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
        const frame: Frame = { t: performance.now(), fingers: vals, ...reading };
        listeners.current.forEach((fn) => fn(frame));
      });
      setConnected(true);
      setStatus("Connected ✓");
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("Disconnected");
        cancelPendingRender();
        setFingers([0, 0, 0, 0, 0]);
        fingersRef.current = [0, 0, 0, 0, 0];
        setImu(EMPTY_IMU);
        imuRef.current = EMPTY_IMU;
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
    deviceRef.current?.gatt?.disconnect();
    setConnected(false);
    setStatus("Disconnected");
    cancelPendingRender();
    setFingers([0, 0, 0, 0, 0]);
    fingersRef.current = [0, 0, 0, 0, 0];
    setImu(EMPTY_IMU);
    imuRef.current = EMPTY_IMU;
  }

  return (
    <SensorContext.Provider value={{
        fingers, connected, status, connect, disconnect, fingersRef, imu, imuRef, subscribe,
        calibration, saveCalibration, clearCalibration, bends, imuLive: !imuLooksDisconnected(imu),
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
