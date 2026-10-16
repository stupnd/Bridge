/** Fake glove packets for testing the Collect page without Bluetooth (dev only). */

const OPEN_RAW = [1400, 1300, 1250, 1300, 1350];
const CLOSED_RAW = [2600, 3100, 3200, 3050, 2900];

function noise(amp: number): number {
  return (Math.random() * 2 - 1) * amp;
}

export function simulatedPacket(elapsedMs: number): { fingers: number[]; imu: number[] } {
  const s = elapsedMs / 1000;

  // Each finger slowly opens and closes (4 s period), slightly out of phase.
  const fingers = OPEN_RAW.map((open, i) => {
    const bend = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * s + i * 0.6);
    return Math.round(open + (CLOSED_RAW[i] - open) * bend + noise(20));
  });

  const imu = [
    // accelerometer (mg): gravity on Z
    noise(30),
    noise(30),
    1000 + noise(30),
    // gyroscope (dps): gentle wrist rotation about X
    20 * Math.sin(2 * Math.PI * 0.5 * s) + noise(3),
    noise(3),
    noise(3),
    // magnetometer (µT)
    22 + noise(1),
    -4 + noise(1),
    40 + noise(1),
  ];

  return { fingers, imu };
}
