/** Header control: connect the glove from any page, and see at a glance if it's working. */
import { Bluetooth } from "lucide-react";
import { Link } from "react-router";
import { useSensor } from "../context/SensorContext";
import { Button, StatusDot } from "./common";

export default function GloveStatus() {
  const { connected, connect, status, imuLive, calibration } = useSensor();

  if (!connected) {
    const busy = status === "Scanning..." || status === "Connecting...";
    return (
      <Button size="sm" onClick={connect} disabled={busy}>
        <Bluetooth className="w-4 h-4" />
        {busy ? "Connecting…" : "Connect glove"}
      </Button>
    );
  }

  const tone = !calibration || !imuLive ? "warn" : "ok";
  const detail = !calibration ? "Not calibrated" : !imuLive ? "Motion sensor off" : "Ready";
  return (
    <Link
      to="/app/glove"
      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
      title="Glove settings"
    >
      <StatusDot tone={tone} />
      <span className="font-medium">Glove</span>
      <span className="text-gray-500">{detail}</span>
    </Link>
  );
}
