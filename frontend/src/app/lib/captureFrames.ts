import type { SensorFrame, SubscribeFn } from "../context/SensorContext";

/**
 * Collect every sensor frame that arrives during the next `durationMs`.
 * Frame times are relative to the returned `start` (performance.now()).
 */
export function captureFrames(
  subscribe: SubscribeFn,
  durationMs: number,
  onProgress?: (fraction: number) => void
): Promise<{ start: number; frames: SensorFrame[] }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const frames: SensorFrame[] = [];
    const unsubscribe = subscribe((frame) => {
      if (frame.t - start <= durationMs) frames.push(frame);
    });

    let raf = 0;
    if (onProgress) {
      const tick = () => {
        onProgress(Math.min(1, (performance.now() - start) / durationMs));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    // setTimeout (not rAF) ends the capture so it still finishes in a background tab.
    window.setTimeout(() => {
      unsubscribe();
      cancelAnimationFrame(raf);
      onProgress?.(1);
      resolve({ start, frames });
    }, durationMs);
  });
}

/** Per-finger mean of raw flex values; falls back to `fallback` if no frames arrived. */
export function averageFingers(frames: SensorFrame[], fallback: number[]): number[] {
  if (frames.length === 0) return [...fallback];
  return fallback.map((_, i) =>
    Math.round(frames.reduce((sum, f) => sum + f.fingers[i], 0) / frames.length)
  );
}
