import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { simulatedPacket } from "../lib/gloveSimulator";

const SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
const CHARACTERISTIC_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

// Packet layout (little-endian): 9 × float32 IMU (acc mg, gyro dps, mag µT), then 5 × int32 flex.
const IMU_COUNT = 9;
const FLEX_COUNT = 5;
const FLEX_OFFSET = IMU_COUNT * 4;
const PACKET_BYTES = FLEX_OFFSET + FLEX_COUNT * 4;
const SIM_INTERVAL_MS = 20; // 50 Hz

const zeroFingers = () => new Array<number>(FLEX_COUNT).fill(0);
const zeroImu = () => new Array<number>(IMU_COUNT).fill(0);

export type SensorFrame = {
  /** performance.now() when the packet arrived */
  t: number;
  fingers: number[];
  imu: number[];
};

export type FrameListener = (frame: SensorFrame) => void;
export type SubscribeFn = (cb: FrameListener) => () => void;

type SensorContextType = {
  fingers: number[];
  imu: number[];
  connected: boolean;
  status: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  fingersRef: React.MutableRefObject<number[]>;
  imuRef: React.MutableRefObject<number[]>;
  /** Called on every packet; returns an unsubscribe function. */
  subscribe: SubscribeFn;
  /** Dev only: fake glove frames at 50 Hz through the same subscribe() path. */
  simulating: boolean;
  setSimulating: (on: boolean) => void;
};

const SensorContext = createContext<SensorContextType | null>(null);

export function SensorProvider({ children }: { children: ReactNode }) {
  const [fingers, setFingers] = useState<number[]>(zeroFingers);
  const [imu, setImu] = useState<number[]>(zeroImu);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [simulating, setSimulatingState] = useState(false);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const fingersRef = useRef<number[]>(zeroFingers());
  const imuRef = useRef<number[]>(zeroImu());
  const listenersRef = useRef(new Set<FrameListener>());
  const simTimerRef = useRef<number | null>(null);

  function emit(t: number, fingerVals: number[], imuVals: number[]) {
    fingersRef.current = fingerVals;
    imuRef.current = imuVals;
    setFingers(fingerVals);
    setImu(imuVals);
    const frame: SensorFrame = { t, fingers: fingerVals, imu: imuVals };
    listenersRef.current.forEach((cb) => {
      try {
        cb(frame);
      } catch (err) {
        console.error("Sensor subscriber failed:", err);
      }
    });
  }

  function resetReadings() {
    setFingers(zeroFingers());
    setImu(zeroImu());
    fingersRef.current = zeroFingers();
    imuRef.current = zeroImu();
  }

  const subscribe = useCallback<SubscribeFn>((cb) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  function stopSim() {
    if (simTimerRef.current !== null) {
      window.clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
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
        const fingerVals: number[] = [];
        for (let i = 0; i < FLEX_COUNT; i++) fingerVals.push(dv.getInt32(FLEX_OFFSET + i * 4, true));
        emit(t, fingerVals, imuVals);
      });
      setConnected(true);
      setStatus("Connected ✓");
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("Disconnected");
        resetReadings();
      });
    } catch (err) {
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
    simTimerRef.current = window.setInterval(() => {
      const t = performance.now();
      const packet = simulatedPacket(t - start);
      emit(t, packet.fingers, packet.imu);
    }, SIM_INTERVAL_MS);
    setSimulatingState(true);
    setConnected(true);
    setStatus("Simulated glove (dev)");
  }

  return (
    <SensorContext.Provider
      value={{
        fingers,
        imu,
        connected,
        status,
        connect,
        disconnect,
        fingersRef,
        imuRef,
        subscribe,
        simulating,
        setSimulating,
      }}
    >
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useSensor must be used inside SensorProvider");
  return ctx;
}
