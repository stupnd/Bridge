# Sign model (training)

Trains a classifier on the glove recordings in `data_collected/`. **Not deployed to the Raspberry Pi yet.** The model stays in `ml/models/` until the team decides to ship it.

```
data_collected/raw/*.csv ──prepare_data.py──► data_collected/processed/
                                                    │
                                                train.py
                                                    ▼
                          ml/models/sign_model.onnx  + model_meta.json
                                                    │
                          ml/sign_model.py  (live recognizer, for the Pi later)
```

## Run

On a laptop (Python 3.10+):

```sh
pip install -r ml/requirements.txt
python ml/prepare_data.py   # merge + dedupe raw exports
python ml/train.py          # train, compare models, export ONNX, write ml/report.md
python ml/replay.py         # stream the recordings through the Pi code as a check
```

`ml/models/*.onnx` is gitignored (the repo ignores all `.onnx` files), so the model is rebuilt locally from the data.

## How it works

- **Windows.** The Pi looks at the last **2.5 s** of packets. In training, every recording is used whole plus 8 random crops, so the model copes with the window not lining up exactly with a sign.
- **Features** (35 per window) come from `ml/features.py`, the same file the live recognizer uses, so training and live features can't drift apart:
  - finger bend (0–1, from the wearer's calibration): mean, std, min, max per finger
  - gravity direction (hand orientation)
  - gyro energy, peak, per-axis RMS, degrees turned per axis, direction reversals
  - acceleration jitter

  The magnetometer is left out because it changes with the direction the wearer faces.
- **Models compared:** logistic regression, random forest, k-nearest-neighbours, each scored two ways:
  - held-out recordings (every crop of a recording stays in the same fold)
  - **leave-one-session-out**: train on other sessions, test on an unseen one. This is what a fresh glove fitting looks like, and it picks the model.
- **Export:** ONNX, run with `onnxruntime`, which is already on the Pi for Piper TTS. No scikit-learn on the Pi.

## Current result

See `report.md`. With today's data: **random forest**, 97.9 % on held-out recordings and 97.1 % leave-one-session-out. It only knows **I, J, Z** from one person. kNN and logistic regression score ~100 % within a session but drop to 57 % and 69 % on an unseen session, which is why session-level testing matters.

## Later: running it on the Pi

Copy `features.py`, `sign_model.py` and `models/` to the Pi and feed each BLE packet to `SignRecognizer.push()` in `main.py`. The Pi only needs numpy and onnxruntime, both already installed for Piper. Each wearer needs a calibration (open hand + fist) saved as `models/calibration.json`.

`SignRecognizer` emits a letter once 3 predictions in a row (≈0.75 s) agree with probability ≥ `min_probability` (0.6, set in `train.py`), and won't repeat it until the hand does something else. If a J is started from a held I, you may see `I` and then `J`.

The default `calibration.json` is participant 2's latest session.
