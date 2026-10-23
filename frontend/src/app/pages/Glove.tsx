import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader, StatusDot } from "../components/common";
import { CalibrationPrompt, useCalibration } from "../components/Calibration";
import FingerBars from "../components/FingerBars";
import HandDiagram from "../components/HandDiagram";
import { AXES, tiltFromAcc, upAxisLabel } from "../lib/imu";

export default function Glove() {
  const { connected, disconnect, calibration, clearCalibration, bends, status } = useSensor();
  const calib = useCalibration();

  return (
    <Page>
      <PageHeader
        title="Glove"
        description="Connect, calibrate, and check that every sensor is working."
        action={connected && <Button variant="secondary" onClick={disconnect}>Disconnect</Button>}
      />

      <div className="space-y-6">
        <Card title="Live hand">
          <GloveGate what="see your hand move" needsCalibration={false}>
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="flex justify-center">
                <HandDiagram bends={bends} className="w-52" label="Live view of your hand" />
              </div>
              <FingerBars bends={bends} />
            </div>
            {!calibration && (
              <p className="mt-4 text-sm text-amber-700">
                These bars aren't accurate until you calibrate below.
              </p>
            )}
          </GloveGate>
        </Card>

        <Card
          title="Calibration"
          description="Records your open hand and your fist so bends read 0–100% for you. Redo it if you re-wear the glove or readings drift."
          action={
            calibration && (
              <span className="flex items-center gap-1.5 text-sm text-green-700">
                <StatusDot tone="ok" /> Calibrated
              </span>
            )
          }
        >
          {calib.running ? (
            <CalibrationPrompt step={calib.step} countdown={calib.countdown} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={calib.run} disabled={!connected}>
                {calibration ? "Calibrate again" : "Start calibration"}
              </Button>
              {calibration && (
                <Button variant="ghost" onClick={clearCalibration}>
                  Clear calibration
                </Button>
              )}
              {!connected && <p className="self-center text-sm text-gray-500">Connect the glove first.</p>}
            </div>
          )}
        </Card>

        <MotionSensorCard />

        {status.startsWith("Error") && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{status}</p>
        )}
        <p className="text-sm text-gray-500">
          Bluetooth works in Chrome or Edge on a computer. If the glove doesn't show up, check it's
          powered and not connected to another tab.
        </p>
      </div>
    </Page>
  );
}

function MotionSensorCard() {
  const { connected, imu, imuLive } = useSensor();
  const { rollDeg, pitchDeg } = tiltFromAcc(imu.acc);
  const g = Math.hypot(...imu.acc) || 1;
  const rows: [string, number[], string, number][] = [
    ["Acceleration", imu.acc, "mg", 0],
    ["Rotation", imu.gyr, "°/s", 1],
    ["Magnetic field", imu.mag, "µT", 1],
  ];

  return (
    <Card
      title="Motion sensor"
      description="Tracks hand tilt and movement, needed for moving letters like J and Z."
      action={
        connected && (
          <span className={`flex items-center gap-1.5 text-sm ${imuLive ? "text-green-700" : "text-amber-700"}`}>
            <StatusDot tone={imuLive ? "ok" : "warn"} /> {imuLive ? "Working" : "Not responding"}
          </span>
        )
      }
    >
      {!connected ? (
        <p className="text-sm text-gray-500">Connect the glove to check the motion sensor.</p>
      ) : !imuLive ? (
        <p className="text-sm text-gray-700">
          The glove is reconnecting to the motion sensor. If this doesn't clear within a few seconds,
          check its wires (SDA → A4, SCL → A5, power → 3.3V).
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Facing" value={upAxisLabel([imu.acc[0] / g, imu.acc[1] / g, imu.acc[2] / g])} />
            <Stat label="Roll" value={`${Math.round(rollDeg)}°`} />
            <Stat label="Pitch" value={`${Math.round(pitchDeg)}°`} />
          </dl>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">Raw readings</summary>
            <table className="mt-2 w-full text-xs tabular-nums">
              <tbody>
                {rows.map(([name, v, unit, digits]) => (
                  <tr key={name}>
                    <td className="py-0.5 pr-2 text-gray-500">{name}</td>
                    {AXES.map((ax, i) => (
                      <td key={ax} className="text-right text-gray-700">
                        <span className="text-gray-400">{ax} </span>
                        {v[i].toFixed(digits)}
                      </td>
                    ))}
                    <td className="pl-2 text-gray-400">{unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 tabular-nums">{value}</dd>
    </div>
  );
}
