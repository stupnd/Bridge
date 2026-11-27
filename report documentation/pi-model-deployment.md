# Deploying the Sign Model to the Raspberry Pi

*Bridge, CEG4913. Notes for the final report. Status as of 2026-11-27.*

This document explains how the trained sign model gets from the laptop to the Raspberry Pi, what files the Pi needs, how the Pi picks up new code, and what to do every time the model is retrained. For how the model is built and tested, see `ml-sign-model-approach.md`.

> **Status:** the model and the Pi code are on `main` (commits `25318a0` and `8868e26`). It has been checked on a laptop (replay: 47/47 recordings correct), but **not yet run on the Pi with the glove**. The Pi still uses one fixed calibration (see `pi-calibration-problem.md`) and does not speak the letter yet (see `sign-recognition-on-pi.md`).

---

## 1. The big picture

Training and running the model happen on different machines.

| | Laptop | Raspberry Pi |
|---|---|---|
| Job | Collect data, train, test, export the model | Run the model live on glove data |
| Code | `ml/` | `RaspPi/rasppi-test/` |
| Libraries | numpy, pandas, scikit-learn, skl2onnx, onnxruntime | numpy, onnxruntime only |
| Output | `sign_model.onnx` + `model_meta.json` | A letter each time a sign is recognized |

The model is exported to **ONNX**, a portable model format. The Pi runs it with `onnxruntime`, which was already installed for the Piper text-to-speech voice. This means the Pi does **not** need scikit-learn and nothing new had to be installed for the model itself.

```
data_collected/raw/  ──prepare_data.py──►  data_collected/processed/
                                                  │
                                              train.py            (laptop)
                                                  ▼
                       ml/models/sign_model.onnx + model_meta.json
                                                  │  copy
                                                  ▼
                       RaspPi/rasppi-test/models/                  (repo)
                                                  │  copy onto the Pi's USB drive
                                                  ▼
                       /opt/payload/  ── watcher.py runs main.py   (Pi)
```

---

## 2. Files the Pi needs

Everything lives in `RaspPi/rasppi-test/`. This folder is exactly what goes onto the Pi.

```
rasppi-test/
├── main.py                 receives glove packets, runs the recognizer, prints letters
├── features.py             turns a window of packets into 35 features   (copy of ml/features.py)
├── sign_model.py           SignRecognizer: rolling window + ONNX model  (copy of ml/sign_model.py)
├── models/
│   ├── sign_model.onnx     the trained random forest (40 KB)
│   ├── model_meta.json     labels, feature names, window length, confidence threshold
│   └── calibration.json    open-hand / fist raw values for the wearer
├── modules/
│   ├── bluetooth.py        BLE: receive from the glove, advertise as "Bridge-Body-Unit"
│   └── tts.py              Piper text-to-speech (not connected yet)
└── requirements.txt
```

### Why `features.py` and `sign_model.py` are copied, not shared

`sign_model.py` imports `features` and loads `models/` from the folder it sits in, so all of these must be side by side on the Pi. The same feature code is used in training and on the Pi. If the Pi ran different feature code, the model would get numbers it was never trained on.

**Risk:** there are now two copies of these files (`ml/` and `RaspPi/rasppi-test/`). If either file changes in `ml/`, it must be copied to `RaspPi/rasppi-test/` again before deploying.

### Why the `.onnx` files are force-added to git

The repository's `.gitignore` ignores every `*.onnx` file (the Piper voice models are large). The sign model is small (40 KB), and committing it means the Pi can be updated without retraining. It has to be added with:

```sh
git add -f ml/models/sign_model.onnx RaspPi/rasppi-test/models/sign_model.onnx
```

---

## 3. How the model is connected in `main.py`

`main.py` creates one recognizer when it starts, then passes every glove packet to it:

```python
from sign_model import SignRecognizer

recognizer = SignRecognizer()          # loads models/ next to this file
print(f"Sign model loaded: {recognizer.labels}")

# for every packet:
accX, accY, accZ, gyrX, gyrY, gyrZ, magX, magY, magZ, f1, f2, f3, f4, f5 = struct.unpack('<9f5i', data)

# Feed data to model (it doesn't use the magnetometer)
letter = recognizer.push(accX, accY, accZ, gyrX, gyrY, gyrZ, f1, f2, f3, f4, f5)
if letter:
    print(f"SIGN ({hand_name}): {letter}")

    # Transmit output
    # await ble.transmitter.transmit_data((letter, data))
```

- **Packet format:** each BLE packet is 56 bytes: 9 floats (acceleration, gyroscope, magnetometer) then 5 integers (raw flex sensor values).
- **The magnetometer is left out.** It changes with the direction the wearer is facing, so it was excluded from training.
- **`push()` returns a letter only when a new sign is recognized,** and `None` the rest of the time. See `sign-recognition-on-pi.md` for when that happens.
- **The per-packet print is commented out.** At 40 packets a second it hides the `SIGN:` lines. Uncomment it to debug the raw values.
- **Sending the letter over Bluetooth is commented out.** `transmit_data()` accepts a string or bytes, but the placeholder line passes a tuple, which would fail. When this is enabled it should be `await ble.transmitter.transmit_data(letter)`, in whatever format the receiving device expects.

When `main.py` starts, it prints `Sign model loaded: ['I', 'J', 'Z']`. If that line does not appear, the model files are missing or in the wrong place.

---

## 4. How code gets onto the Pi (the USB drive)

The Pi does **not** pull from GitHub. Code is delivered through USB:

1. The Pi is plugged into a laptop over USB. It acts as a **USB drive** (named `PISHARE`), backed by the file `/piusb/piusb.bin` on the Pi.
2. Files are copied onto that drive from the laptop. **This step is manual.**
3. `watcher.py` (in `RaspPi/Raspberry Pi Setup/`, running as a service on the Pi) does the rest automatically:

| Step | What `watcher.py` does |
|---|---|
| Detect | Is notified by the Linux kernel (inotify) when the drive is written to. No polling. |
| Wait | Waits until there have been no writes for **8 s**, so a copy in progress isn't picked up half-done (gives up waiting after 120 s). |
| Check | Compares a SHA-256 hash of the drive with the last one. If nothing changed, it stops. |
| Stop | Stops the running `main.py`. |
| Copy | Mounts the drive read-only and replaces `/opt/payload/` with its contents. |
| Start | Runs `/opt/payload/main.py` with the Python in `/opt/payload-venv` (or the system Python if that venv doesn't exist). Output goes to the system journal. |

The watcher also runs this check once at boot, so files copied while the Pi was off are picked up.

**Important:** copy the **contents** of `rasppi-test/` to the top level of the drive, not the `rasppi-test` folder itself. The watcher only looks for `main.py` at the top level.

---

## 5. One-time setup: Python packages on the Pi

The Pi installs packages **offline** from wheel files, following `RaspPi/package-export.txt`.

- **The model needs nothing new.** `numpy` (2.2.6) and `onnxruntime` (1.23.2) are already in `requirements.txt` for Piper.
- **The Bluetooth update needs `bless`** (the BLE server library, added by the Bluetooth update on 2026-11-27). Without it, `main.py` fails at `import modules.bluetooth`.

Steps (only needed when a new library is added):

1. On the laptop, download Linux ARM (aarch64, Python 3.12) wheels into a `wheels/` folder. The exact `pip download` commands are in `RaspPi/package-export.txt`, including `bleak`, `bless` and their dependencies.
2. Copy `wheels/` onto the Pi's USB drive with the other files.
3. On the Pi (SSH or keyboard and screen):

```sh
sudo python3 -m venv /opt/payload-venv
sudo /opt/payload-venv/bin/pip install --no-index --find-links=/opt/payload/wheels -r /opt/payload/requirements.txt
sudo /opt/payload-venv/bin/pip install --no-index --find-links=/opt/payload/wheels bleak bless
```

---

## 6. Deploying for a test: checklist

1. Make sure `RaspPi/rasppi-test/` is up to date (`git pull`).
2. Check `bless` is installed on the Pi (section 5).
3. Plug the Pi into the laptop. Copy the **contents** of `RaspPi/rasppi-test/` onto the USB drive.
4. Wait about 10 s. The watcher restarts `main.py`.
5. On the Pi, check the output (for example `journalctl -f` for the watcher's service). Expect:
   - `Sign model loaded: ['I', 'J', 'Z']`
   - `Advertising as "Bridge-Body-Unit"...`
   - `Connected to MyArduinoDevice`
6. Sign I, J and Z with the glove. Each should print `SIGN (MyArduinoDevice): <letter>` about 1 to 1.5 s after the sign starts.

**For the test to be fair:** the Pi uses participant 2's calibration (left hand). Until the calibration problem is fixed, results will be best with that person wearing the glove.

---

## 7. When more data is collected: retraining and redeploying

### Where each step happens

| Step | Where | Folder / tool |
|---|---|---|
| Record new signs | Web app, Collect page (glove connected to the browser) | `frontend/` |
| Store the exports | Laptop, in the repository | `data_collected/raw/` |
| Clean and merge | Laptop | `ml/prepare_data.py` → `data_collected/processed/` |
| Train and test | Laptop | `ml/train.py` → `ml/models/`, `ml/report.md` |
| Check like the Pi would | Laptop | `ml/replay.py` |
| Prepare the Pi copy | Laptop, in the repository | `RaspPi/rasppi-test/models/` |
| Run the model | Raspberry Pi | `/opt/payload/` (from the USB drive) |

**Training never happens on the Pi.** The Pi has no scikit-learn, no training data, and only runs the finished `.onnx` model. Training takes a few seconds on a laptop with the current amount of data.

### Data flow

```
Collect page (browser)
   │  export CSVs: asl-samples-*.csv, asl-frames-*.csv, asl-calibration-*.csv
   ▼
data_collected/raw/          every export ever made, kept as-is
   │  prepare_data.py: merge all exports, drop repeated samples, one "hand" column
   ▼
data_collected/processed/    sessions.csv · samples.csv · frames.csv
   │  train.py: cut into windows (whole + 8 random crops), 35 features each,
   │            compare 3 models, pick the best on leave-one-session-out
   ▼
ml/models/                   sign_model.onnx · model_meta.json
ml/report.md                 data counts, scores, confusion matrix
   │  copy
   ▼
RaspPi/rasppi-test/models/   → USB drive → Pi
```

### Step by step

1. **Record** on the web app's Collect page.
   - Each session starts with a calibration (open hand, then fist). The calibration is saved with the session, and every recording in that session is converted with it during training.
   - Enter a participant ID and the hand (L/R) so sessions can be told apart.
   - Choose the sign type: `static` (held handshape, ~1.5 s), `moving` (J, Z, ~2.5 s) or `none` (no sign, for the REST class).
   - Export the CSVs when done.
2. **Add the exports to `data_collected/raw/`.** Keep all older files. Each export contains every sample recorded so far, so newer exports repeat older ones; `prepare_data.py` removes the repeats. Deleting old exports could lose samples that were only in them.
3. **Install the training libraries** (first time only, Python 3.10+):
   ```sh
   pip install -r ml/requirements.txt
   ```
4. **Rebuild the processed tables:**
   ```sh
   python ml/prepare_data.py
   ```
   This overwrites `data_collected/processed/`. It prints how many recordings and sessions it found; check the new ones are included.
5. **Train:**
   ```sh
   python ml/train.py
   ```
   This:
   - turns every recording into windows and features, using each session's own calibration,
   - compares logistic regression, random forest and k-nearest-neighbours,
   - scores each on held-out recordings **and** on leave-one-session-out (train on the other sessions, test on an unseen one),
   - picks the model with the best leave-one-session-out score,
   - exports it to `ml/models/sign_model.onnx` and checks the ONNX output matches scikit-learn exactly,
   - writes `ml/models/model_meta.json` (labels, feature names, window length, confidence threshold) and `ml/report.md`.

   **New letters need no code changes.** The labels come from the data, so recording a new letter (for example A) and retraining adds it to the model and to `model_meta.json` automatically.
6. **Check the results** in `ml/report.md`:
   - **Leave-one-session-out** is the important score: it predicts how the model does on a fresh glove fitting or a new person.
   - Look at the confusion matrix for letters that get mixed up.
   - Compare with the previous report (git keeps the old one). If the new model is worse, find out why before deploying it.
7. **Check it the way the Pi runs it:**
   ```sh
   python ml/replay.py
   ```
   This streams every recording, with 1.5 s of still hand before it, through the same `SignRecognizer` the Pi uses, and reports whether exactly the right letter was output. Recordings that fail are listed.
8. **Copy the new model to the Pi folder:**
   - `ml/models/sign_model.onnx` → `RaspPi/rasppi-test/models/`
   - `ml/models/model_meta.json` → `RaspPi/rasppi-test/models/`
   - `ml/features.py` and `ml/sign_model.py` → `RaspPi/rasppi-test/`, **if they changed**
   - `calibration.json` only if you want a different default wearer (see `pi-calibration-problem.md`)
9. **Commit and push** the new data, the model and the Pi copy:
   ```sh
   git add data_collected ml "RaspPi/rasppi-test"
   git add -f ml/models/sign_model.onnx RaspPi/rasppi-test/models/sign_model.onnx
   git commit -m "Retrain sign model with <what was added>"
   git push
   ```
10. **Deploy** to the Pi as in section 6 (copy the folder onto the USB drive). `main.py` prints the new label list when it starts, for example `Sign model loaded: ['A', 'I', 'J', 'Z']`, which confirms the new model is running.

Step 8 is the easiest one to forget. If it is skipped, the Pi quietly keeps running the old model.

### What changes and what doesn't

| Changes with every retrain | Stays the same (unless the code is changed) |
|---|---|
| `sign_model.onnx` (the trained model) | `features.py` (the 35 features) |
| `model_meta.json` (labels, settings) | `sign_model.py` (window, stride, 3-in-a-row rule) |
| `report.md` (scores) | `main.py` on the Pi |
| `data_collected/processed/` | Pi packages (numpy, onnxruntime) |

If `features.py` is changed (for example, adding a feature), the model **must** be retrained, and both files must be copied to the Pi together. An old model with new features, or the reverse, will give wrong results or fail to load.

### What data helps most

- **More participants and sessions.** All data so far is one person's left hand. The score on an unseen session is what predicts real use.
- **"No sign" recordings** (Collect page sign type `none`). The model can learn a REST class, but there are none yet. Without them, every confident window is forced to be I, J or Z, and only the 0.6 confidence threshold prevents false letters.
- **Right-hand data**, if a second glove is used.

---

## 8. Open items

| Item | Notes |
|---|---|
| Calibration | Fixed to participant 2. See `pi-calibration-problem.md`. |
| Audio | `tts.play()` is not connected. It blocks the Bluetooth loop, so it must run in a background thread. See `sign-recognition-on-pi.md`. |
| Sending the letter out | Transmit line is commented out and passes a tuple instead of a string. |
| Live test | Not yet run on the Pi with the glove. |
| Duplicate code | `features.py` and `sign_model.py` exist in both `ml/` and `RaspPi/rasppi-test/`. A small copy script would prevent them drifting apart. |
| `ml/README.md` | Still says the `.onnx` model is not in the repository, which is no longer true. |
