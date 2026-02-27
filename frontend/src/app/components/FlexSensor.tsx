import { useState } from "react";

export default function FlexSensor() {
  const [value, setValue] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");

  async function connect() {
    try {
      if (!("bluetooth" in navigator)) {
        setStatus("Error: Web Bluetooth is not supported in this browser");
        return;
      }

      setStatus("Scanning...");
      const bluetooth = (navigator as any).bluetooth;
      const device = await bluetooth.requestDevice({
        // Let the browser show all nearby BLE devices; you'll pick your ESP32
        acceptAllDevices: true,
        optionalServices: ["0000180c-0000-1000-8000-00805f9b34fb"],
      });

      setStatus("Connecting...");
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(
        "0000180c-0000-1000-8000-00805f9b34fb",
      );
      const characteristic = await service.getCharacteristic(
        "00002a56-0000-1000-8000-00805f9b34fb",
      );

      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        (e: Event) => {
          const target = e.target as any;
          const dataView: DataView | undefined = target.value;
          if (!dataView) return;
          const val = dataView.getInt16(0, true);
          setValue(val);
        },
      );

      setConnected(true);
      setStatus("Connected ✓");

      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setStatus("Disconnected");
        setValue(null);
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown Bluetooth error";
      setStatus("Error: " + message);
    }
  }

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
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Connect via Bluetooth
          </button>
        )}

        {value !== null && (
          <div className="pt-2">
            <p className="text-sm text-gray-500 mb-1">Current flex value</p>
            <p className="text-3xl font-semibold text-indigo-600">{value}</p>
          </div>
        )}

        <p className="text-xs text-gray-500 pt-2">
          Works best in Chrome or Edge on desktop. Web Bluetooth is not
          supported in iOS Safari.
        </p>
      </div>
    </div>
  );
}
