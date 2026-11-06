import { useSensor } from "../context/SensorContext";
import { Button, Card, GloveGate, Page, PageHeader, StatusDot } from "../components/common";
import { CalibrationPrompt, FIST, OPEN_HAND, useCalibration } from "../components/Calibration";
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
        <Card title="Live hand" description={connected ? "Bend a finger and watch its bar follow." : undefined}>
          <GloveGate what="see your hand move" needsCalibration={false}>
            <div className="grid items-center gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
              <div className="flex justify-center rounded-[var(--radius-card)] bg-ground py-4 md:py-8">
                <HandDiagram bends={bends} className="w-36 sm:w-56 md:w-60" label="Live view of your hand" />
              </div>
              <FingerBars bends={bends} />
            </div>
            {!calibration && (
              <p className="mt-5 rounded-[var(--radius-control)] bg-warn-wash px-4 py-3 text-sm text-warn">
                These bars aren't accurate until you calibrate below.
              </p>
            )}
          </GloveGate>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            className={calib.running ? "lg:col-span-2" : ""}
            title="Calibration"
            description="Records your open hand and your fist so bends read 0 to 100% for you. Redo it if you put the glove back on or readings drift."
            action={
              calibration && (
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ok">
                  <StatusDot tone="ok" /> Calibrated
                </span>
              )
            }
          >
            {calib.running ? (
              <CalibrationPrompt step={calib.step} countdown={calib.countdown} />
            ) : (
              <>
                <ol className="mb-6 grid grid-cols-2 gap-3">
                  {[
                    { bends: OPEN_HAND, name: "Open hand", note: "Fingers straight" },
                    { bends: FIST, name: "Fist", note: "Fingers folded" },
                  ].map((p) => (
                    <li key={p.name} className="flex items-center gap-3 rounded-[var(--radius-control)] bg-ground px-3 py-3">
                      <HandDiagram bends={p.bends} className="w-12 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{p.name}</span>
                        <span className="block text-xs text-ink-muted">{p.note}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={calib.run} disabled={!connected}>
                    {calibration ? "Calibrate again" : "Start calibration"}
                  </Button>
                  {calibration && (
                    <Button variant="ghost" onClick={clearCalibration}>
                      Clear calibration
                    </Button>
                  )}
                  {!connected && <p className="text-sm text-ink-muted">Connect the glove first.</p>}
                </div>
                <p className="mt-3 text-sm text-ink-muted">A 3 second count before each pose, then hold still. About 10 seconds in all.</p>
              </>
            )}
          </Card>

          <MotionSensorCard />
        </div>

        {status.startsWith("Error") && (
          <p className="rounded-[var(--radius-control)] bg-danger-wash px-4 py-3 text-sm text-danger" role="alert">
            {status}
          </p>
        )}
        <p className="text-sm text-ink-muted">
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
      description="Tracks how your hand tilts and moves. The moving letters J and Z will need it."
      action={
        connected && (
          <span className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold ${imuLive ? "text-ok" : "text-warn"}`}>
            <StatusDot tone={imuLive ? "ok" : "warn"} /> {imuLive ? "Working" : "Not responding"}
          </span>
        )
      }
    >
      {!connected ? (
        <p className="text-sm text-ink-muted">Connect the glove to check the motion sensor.</p>
      ) : !imuLive ? (
        <p className="rounded-[var(--radius-control)] bg-warn-wash px-4 py-3 text-sm text-warn">
          The glove is reconnecting to the motion sensor. If this doesn't clear within a few seconds,
          check its wires (SDA → A4, SCL → A5, power → 3.3V).
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Facing" value={upAxisLabel([imu.acc[0] / g, imu.acc[1] / g, imu.acc[2] / g])} />
            <Stat label="Roll" value={`${Math.round(rollDeg)}°`} />
            <Stat label="Pitch" value={`${Math.round(pitchDeg)}°`} />
          </dl>
          <details className="group mt-5 text-sm">
            <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-control)] font-semibold text-ink-muted transition-colors duration-150 hover:text-ink">
              Raw readings
            </summary>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-xs tabular">
                <caption className="sr-only">Raw motion sensor readings per axis</caption>
                <tbody>
                  {rows.map(([name, v, unit, digits]) => (
                    <tr key={name} className="border-t border-hairline">
                      <th scope="row" className="py-2 pr-2 text-left font-normal text-ink-muted">{name}</th>
                      {AXES.map((ax, i) => (
                        <td key={ax} className="py-2 text-right text-ink">
                          <span className="text-ink-muted">{ax} </span>
                          {v[i].toFixed(digits)}
                        </td>
                      ))}
                      <td className="py-2 pl-2 text-ink-muted">{unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-control)] bg-ground px-3 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-display text-xl font-bold text-ink tabular">{value}</dd>
    </div>
  );
}
