import { createContext, useContext, useRef, useState, ReactNode } from "react";

const SERVICE_UUID = "3104838b-5ed7-4e6c-ac03-7823dd9d4c7b";
const CHARACTERISTIC_UUID = "77283f94-81cf-4438-be8a-642fe725ccbd";

type SensorContextType = {
  fingers: number[];
  connected: boolean;
  status: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  fingersRef: React.MutableRefObject<number[]>;
};

const SensorContext = createContext<SensorContextType | null>(null);

export function SensorProvider({ children }: { children: ReactNode }) {
  const [fingers, setFingers] = useState<number[]>([0, 0, 0, 0, 0]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const fingersRef = useRef<number[]>([0, 0, 0, 0, 0]);

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
        const vals: number[] = [];
        for (let i = 0; i < 5; i++) vals.push(dv.getInt32(36 + i * 4, true));
        fingersRef.current = vals;
        setFingers([...vals]);
      });
      setConnected(true);
      setStatus("Connected ✓");
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("Disconnected");
        setFingers([0, 0, 0, 0, 0]);
        fingersRef.current = [0, 0, 0, 0, 0];
      });
    } catch (err) {
      setStatus("Error: " + (err instanceof Error ? err.message : "Unknown"));
    }
  }

  function disconnect() {
    deviceRef.current?.gatt?.disconnect();
    setConnected(false);
    setStatus("Disconnected");
    setFingers([0, 0, 0, 0, 0]);
    fingersRef.current = [0, 0, 0, 0, 0];
  }

  return (
    <SensorContext.Provider value={{ fingers, connected, status, connect, disconnect, fingersRef }}>
      {children}
    </SensorContext.Provider>
  );
}

export function useSensor() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useSensor must be used inside SensorProvider");
  return ctx;
}
