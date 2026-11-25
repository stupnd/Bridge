# Sign Recognition Model: Data and ML Approach

*Bridge, CEG4913. Notes for the final report. Status as of 2026-11-25.*

This document explains how the glove data is organized, how the machine-learning model is built and tested, which models were compared, and how they compare with the kNN currently on the web app's Collect page. All numbers come from the data in `data_collected/` as of this date. They will change once more data is collected.

> The training code (`ml/`) is kept locally for now and is not yet in the repository. The model has **not** been deployed to the Raspberry Pi yet.

---

## 1. The data

### What the glove records

The glove streams about **40 readings per second** over Bluetooth. Each reading contains:

| Signal | Sensor | Units |
|---|---|---|
| 5 finger bends (thumb, index, middle, ring, pinky) | flex sensors | raw ADC value (lower = more bent) |
| Acceleration X/Y/Z (which way gravity points) | ICM-20948 accelerometer | mg |
| Rotation speed X/Y/Z | ICM-20948 gyroscope | °/s |
| Magnetic field X/Y/Z | ICM-20948 magnetometer | µT |

A **recording** (or sample) is one sign performed once: about 1.5 s for static letters and 2.5 s for moving letters (J, Z), with the letter as its label.

### What we have so far

| | |
|---|---|
| Unique recordings | **47** (4,312 sensor readings) |
| Letters | **I** ×10 (static), **J** ×19 (moving), **Z** ×18 (moving) |
| Participants | 1 (participant 2) |
| Hand | left only |
| Sessions | 2 (2026-10-24 and 2026-11-13); session 2 contains only J and Z |
| "Rest" / not-signing recordings | none yet |

An earlier export (2026-10-09, participant 1) has one averaged sample for each of 24 letters. It has no motion data and no per-reading frames, so it is kept for reference but not used for training.

### Organizing the data (`data_collected/`)

- **`raw/`** holds the exports exactly as downloaded from the Collect page.
- **`processed/`** holds clean tables generated from them:
  - `sessions.csv`: one row per calibration session
  - `samples.csv`: one row per recording
  - `frames.csv`: one row per sensor reading

Cleanup was needed because every export from the Collect page contains *all* samples recorded so far, so newer exports repeat older ones. Two files were also byte-for-byte duplicates ("… copy.csv"). After merging and removing repeats, the five frame exports reduce to the 47 unique recordings above.

### Data-quality finding

Between the two sessions:
- The accelerometer's Y-axis reading flips sign (gravity Y ≈ −0.7 in session 1 vs +0.9 in session 2).
- The rotation of the J motion reverses direction.
- Session 2's movements are about twice as fast and include the transition into the handshape.

Either the IMU was mounted differently or the hand was held differently. This shows how much the data can shift between glove fittings, which shaped how the model is evaluated (see §2, step 6). Recommendation: record the IMU mounting and hand pose in each session's notes.

---

## 2. The ML pipeline, step by step

### Step 1: Collect

Recordings are made with the web app's Collect page and exported as CSV (frames and calibration files) into `data_collected/raw/`.

### Step 2: Clean

A script merges all exports, removes repeated samples, and reshapes the data into the tidy tables in `data_collected/processed/`.

### Step 3: Calibrate

Raw flex values differ between people and every time the glove is put on. In one session a fully bent middle finger read 808, in another 734. So each finger is converted to a **bend from 0 to 1** (0 = straight, 1 = fist) using that session's calibration (an open-hand reading and a fist reading):

```
bend = clamp((raw − open) / (closed − open), 0, 1)
```

This is the same formula the web app uses for its percentage values.

### Step 4: Turn readings into features

A model can't take "100 rows of readings" directly, so each recording (or window of readings) is summarized as **35 numbers**, called features:

| Group | Features | Why |
|---|---|---|
| Finger bend (×5 fingers) | mean, standard deviation, min, max, plus the largest single-finger range | handshape, and whether the fingers moved |
| Hand orientation | gravity direction (unit vector X/Y/Z) | palm up/down/sideways |
| Motion | gyro RMS, gyro peak, per-axis gyro RMS | how much the hand moved |
| Rotation | degrees turned about X/Y/Z, largest turn | twisting motions (J) |
| Back-and-forth | number of direction reversals, acceleration jitter | zig-zag motions (Z) |

These features are what make **I** and **J** distinguishable: both use the same handshape, but J adds a twist.

The magnetometer is deliberately left out. It depends on which direction the user faces and on nearby metal, not on the sign.

### Step 5: Augment

Each recording is used whole and also cut into **8 random shorter windows**:
- Static signs are cropped to anywhere from 1 s up to the full length.
- Moving signs keep at least 85 % of the recording so the motion is preserved.

This turns 47 recordings into 423 training examples. It also prepares the model for live use, where a sliding window won't line up exactly with the start and end of a sign.

### Step 6: Train and test fairly

This is the most important step. Two ways of measuring accuracy were used:

1. **Held-out recordings.** The model is tested on recordings it never saw, but they come from the same sessions as the training data. All crops of one recording are kept together, so a crop of a test recording never leaks into training.
2. **Leave-one-session-out.** The model is trained on one session and tested on the other. This simulates a new glove fitting, which is exactly what happens in real use.

Testing only the first way is misleading. Every model scored about 100 % that way, but some collapsed on an unseen session. **The model is therefore chosen by the leave-one-session-out score.**

### Step 7: Pick, save and check

The best model is retrained on all the data and saved in **ONNX** format, a small (≈40 KB) portable model file. On the Raspberry Pi it can run with `onnxruntime`, which is already installed there for Piper text-to-speech, so scikit-learn isn't needed on the Pi.

As a final check, every recording is replayed reading by reading through the same live-recognition code the Pi would run. All 47 recordings produced exactly the correct letter. This replay uses the training recordings, so it confirms the pipeline works end to end, not accuracy on new data.

### Planned live behaviour on the Pi (not deployed yet)

- The recognizer keeps the last **2.5 s** of readings and predicts 4 times per second.
- A letter is output only when 3 predictions in a row (≈0.75 s) agree with at least 60 % confidence. It is not repeated until the hand does something else.
- One prediction takes about 0.24 ms on a laptop, so even a Raspberry Pi 4 running many times slower has ample headroom.
- Each wearer needs a quick calibration (open hand, then fist).

---

## 3. Models compared

| Model | How it works | Held-out recordings | Unseen session |
|---|---|---|---|
| k-nearest neighbours (k = 3) | finds the 3 most similar training examples and takes a majority vote | 100 % | 57 % |
| Logistic regression | weighs each feature and sums them into a score per letter | 99.8 % | 69 % |
| **Random forest** *(chosen)* | 100 decision trees, each asking yes/no questions (e.g. "is the pinky straight?"), then voting | 97.9 % | **97 %** |

All three use the same features, with each feature standardized (rescaled to mean 0, standard deviation 1).

**Why random forest wins:** kNN and logistic regression both depend on distances or weighted sums of feature values. When session 2's movements were faster and the sensor orientation shifted, those values moved outside what the models had seen, and predictions broke. Decision trees split on thresholds ("rotation above X degrees"), which tolerate this kind of shift much better.

Removing the orientation features was also tested. It did not improve generalization, so they were kept. Orientation will matter for future letters (e.g. H vs U, K vs P).

---

## 4. Comparison with the kNN on the Collect page

The web app's Collect page (Movement Lab section) trains a k-nearest-neighbours model in the browser. It uses 14 features (average bend per finger, gravity direction, rotation per axis, gyro RMS, acceleration jitter, reversals) with k = 3. Reproducing it on the same data:

| Test | Accuracy |
|---|---|
| Leave-one-out (the score the page displays) | **100 %** |
| Unseen session | ~60 % |
| Unseen session, using the page's 2 s live window | ~53 % |
| Flex sensors only, unseen session | ~59 % |
| Random forest on the same 14 features, unseen session | ~94 % |

**Takeaway:** the Collect-page kNN is useful as a quick sanity check while recording. Its 100 % comes from testing against recordings from the same session, so it overstates real-world accuracy. Its live window (2 s) is also shorter than the 2.5 s moving-sign recordings it is trained on. Switching to a tree-based model, and/or measuring accuracy across sessions, would give more realistic results.

---

## 5. Limitations

- The model only knows **3 letters (I, J, Z)** from **one person, left hand**.
- There are no "rest" recordings, so anything the wearer does is pushed toward one of the 3 letters unless the model's confidence is below the threshold.
- Only 2 sessions exist, so the unseen-session score rests on very little data.
- If a J is started from a held I handshape, the live recognizer may output I and then J.

## 6. Next steps

1. **Collect more data:**
   - more letters
   - "none"/rest recordings (relaxed hand, transitions between letters)
   - more participants, each over several sessions with the glove removed and recalibrated in between
   - at least 10 repetitions per letter per session

   Right-hand data is needed if two gloves will be used.
2. Re-run the pipeline on the new data and re-check the model comparison. With more letters, model rankings and feature choices may change.
3. Deploy to the Raspberry Pi once accuracy across people and sessions is acceptable.
4. Consider updating the Collect-page model or its accuracy display to report cross-session accuracy.
