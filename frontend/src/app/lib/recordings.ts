/**
 * Collect-page samples reduced to what Movement Lab needs: a label, whether
 * the sign moves, and the features of its frame window.
 */
import type { CollectData } from "./collectData";
import { computeFeatures, Features, Frame } from "./imu";

export type Recording = {
  letter: string;
  mode: "static" | "movement";
  features: Features;
};

export function recordingsFromCollectData(data: CollectData): Recording[] {
  const sessions = new Map(data.sessions.map((s) => [s.session_id, s]));
  return data.samples
    .filter((s) => s.frames.length > 0)
    .map((s) => {
      const session = sessions.get(s.session_id);
      const frames: Frame[] = s.frames.map((f) => ({
        t: f.t_ms,
        fingers: f.raw,
        acc: [f.imu[0], f.imu[1], f.imu[2]],
        gyr: [f.imu[3], f.imu[4], f.imu[5]],
        mag: [f.imu[6], f.imu[7], f.imu[8]],
      }));
      return {
        letter: s.label,
        mode: s.sign_type === "moving" ? "movement" : "static",
        features: computeFeatures(frames, session ? { open: session.open, closed: session.closed } : null),
      };
    });
}
