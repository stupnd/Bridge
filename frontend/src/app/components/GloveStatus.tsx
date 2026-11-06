/** Header control: connect the glove from any page, and see at a glance if it's working. */
import { Bluetooth } from "lucide-react";
import { Link } from "react-router";
import { useSensor } from "../context/SensorContext";
import { Button, StatusDot } from "./common";

export default function GloveStatus() {
  const { connected, connect, status, imuLive, calibration } = useSensor();

  if (!connected) {
    const reconnecting = status === "Reconnecting...";
    const busy = reconnecting || status === "Scanning..." || status === "Connecting...";
    return (
      <Button size="sm" onClick={connect} disabled={busy}>
        <Bluetooth className="h-4 w-4" aria-hidden />
        {reconnecting ? "Reconnecting…" : busy ? "Connecting…" : "Connect glove"}
      </Button>
    );
  }

  const tone = !calibration || !imuLive ? "warn" : "ok";
  const detail = !calibration ? "Not calibrated" : !imuLive ? "Motion sensor off" : "Ready";
  return (
    <Link
      to="/app/glove"
      className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-hairline bg-surface px-3 text-xs transition-colors duration-150 hover:border-ink"
      title="Glove settings"
    >
      <StatusDot tone={tone} />
      <span className="font-semibold text-ink">Glove</span>
      <span className="text-ink-muted">{detail}</span>
    </Link>
  );
}
