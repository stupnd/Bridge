"""
Live sign recognition on the Raspberry Pi.

Feed every BLE packet from one glove into SignRecognizer.push(); it keeps the
last `window_ms` of frames, runs the ONNX model a few times a second, and
returns a letter once the prediction has been confident and stable for a moment.

Needs only numpy + onnxruntime (both already in the Pi's requirements.txt).
The model files come from ml/train.py; see ml/README.md. Not deployed yet.

    rec = SignRecognizer()                       # loads ml/models/
    letter = rec.push(accX, accY, accZ, gyrX, gyrY, gyrZ, f1, f2, f3, f4, f5)
    if letter: print(letter)
"""
import json
import time
from collections import deque
from pathlib import Path

import numpy as np
import onnxruntime as ort

from features import window_features

DEFAULT_MODEL_DIR = Path(__file__).resolve().parent / "models"


class SignRecognizer:
    def __init__(self, model_dir=DEFAULT_MODEL_DIR, stride_ms=250, stable_predictions=3):
        model_dir = Path(model_dir)
        self.meta = json.loads((model_dir / "model_meta.json").read_text())
        calib = json.loads((model_dir / "calibration.json").read_text())
        self.open, self.closed = calib["open"], calib["closed"]

        self.session = ort.InferenceSession(str(model_dir / "sign_model.onnx"),
                                            providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.labels = self.meta["labels"]
        self.window_ms = self.meta["window_ms"]
        self.min_frames = self.meta["min_frames"]
        self.min_probability = self.meta["min_probability"]
        self.rest_label = self.meta.get("rest_label", "REST")

        self.stride_ms = stride_ms
        self.stable_predictions = stable_predictions
        self.frames = deque()
        self.recent = deque(maxlen=stable_predictions)
        self.last_run_ms = -1e9
        self.last_emitted = None
        self.t0 = time.monotonic()

    def push(self, ax, ay, az, gx, gy, gz, f1, f2, f3, f4, f5, t_ms=None):
        """Add one packet. Returns a newly recognized label, or None."""
        if t_ms is None:
            t_ms = (time.monotonic() - self.t0) * 1000.0
        self.frames.append((t_ms, f1, f2, f3, f4, f5, ax, ay, az, gx, gy, gz))
        while self.frames and t_ms - self.frames[0][0] > self.window_ms:
            self.frames.popleft()

        if t_ms - self.last_run_ms < self.stride_ms:
            return None
        if len(self.frames) < self.min_frames or t_ms - self.frames[0][0] < 0.8 * self.window_ms:
            return None
        self.last_run_ms = t_ms

        label, prob = self.predict(np.array(self.frames))
        self.recent.append(label if prob >= self.min_probability else None)

        # Emit once the same confident label wins several windows in a row, and
        # don't repeat it until the hand does something else (or rests).
        if len(self.recent) == self.stable_predictions and len(set(self.recent)) == 1:
            current = self.recent[0]
            if current != self.last_emitted:
                self.last_emitted = current
                if current is not None and current != self.rest_label:
                    return current
        return None

    def predict(self, frames):
        """frames: (n, 12) array in features.FRAME_COLUMNS order. Returns (label, probability)."""
        x = window_features(frames, self.open, self.closed)[None, :]
        _, probs = self.session.run(None, {self.input_name: x})
        i = int(np.argmax(probs[0]))
        return self.labels[i], float(probs[0][i])

    def reset(self):
        self.frames.clear()
        self.recent.clear()
        self.last_emitted = None
        self.last_run_ms = -1e9
