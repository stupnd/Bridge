# Collected glove data

Recordings from the web app's **Collect** page, used to train the sign model in `ml/`.

```
data_collected/
├── raw/          exports exactly as downloaded from the Collect page (don't edit)
└── processed/    clean tables built by `ml/prepare_data.py` (don't edit by hand either)
```

## Adding new data

1. On the Collect page, export the **frames** CSV and the **calibration** CSV.
2. Drop both files into `raw/` unchanged. It's fine if they repeat samples from older exports: every export contains everything recorded so far, and the script removes repeats.
3. Run `python ml/prepare_data.py`, then `python ml/train.py` (see `ml/README.md`).

## Raw files

| File type | One row per | Notes |
|---|---|---|
| `asl-frames-*.csv` | sensor packet (~40 Hz) | `R_*` / `L_*` columns; each row fills only the hand that sent it |
| `asl-calibration-*.csv` | calibration session | raw flex reading per finger with the hand **open** and **closed** |
| `asl-samples-*.csv` | sample (summary) | early export format, averaged values only, no IMU. Kept for reference, not used for training |

Fingers `f1`–`f5` = thumb, index, middle, ring, pinky. `raw_*` is the ADC reading (lower = more bent). `pct_*` = 0 % straight to 100 % bent, using that session's calibration. IMU: `ax..az` mg, `gx..gz` °/s, `mx..mz` µT.

## Processed tables

| File | Contents |
|---|---|
| `sessions.csv` | one row per calibration session (deduplicated) |
| `samples.csv` | one row per recording: label, sign type, rep, frame count, sample rate, largest gap between packets |
| `frames.csv` | every packet, deduplicated, with a `hand` column instead of `R_`/`L_` prefixes. Join to `samples.csv` on `sample_id` + `hand` |
| `legacy_static_samples.csv` | copy of the early summary export |

## What's here (as of 2026-11-25)

- **47 recordings, 4,312 frames**, all from participant 2, left hand, in 2 sessions (2026-10-24 and 2026-11-13).
- Letters: **I** ×10 (static), **J** ×19 (moving), **Z** ×18 (moving). Session 2 only has J and Z.
- No `none` (resting / not signing) recordings yet.
- The legacy summary file has one static sample for each of 24 letters (participant 1, no IMU), too little and in the wrong format to train on.

Cleanup done: the 4 older frame/calibration exports were subsets of the 2026-11-13 export, and two files named `... copy.csv` were byte-for-byte duplicates and were removed.

### Data-quality note

Between the two sessions the accelerometer's Y axis flips sign (gravity Y ≈ −0.7 in session 1 vs +0.9 in session 2) and the J rotation reverses direction. Either the IMU was mounted differently or the hand was held differently. Record the IMU mounting and hand pose in each session's `notes` so this can be told apart in future.

## Priorities for the next collection

1. **More letters.** The model can only recognize letters it has seen.
2. **`none` / rest recordings** (relaxed hand, hand moving between letters), so the model learns when *not* to output a letter.
3. **More people**, several sessions each (take the glove off and recalibrate in between). Aim for at least 10 reps per letter per session.
4. Right hand, if the Pi will read two gloves.
