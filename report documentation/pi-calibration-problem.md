# The Calibration Problem on the Raspberry Pi

*Bridge, CEG4913. Notes for the final report. Status as of 2026-11-27.*

This document explains why the glove must be calibrated for each wearer, why the model depends on it, why the Raspberry Pi currently does not receive the wearer's calibration, and the two options for fixing it. **No option has been chosen or built yet.**

---

## 1. What calibration is

Each finger has a flex sensor that gives a raw number (an ADC value from 0 to 4095; lower means more bent). These raw numbers are different for every person and every time the glove is put on, because of hand size, finger length, and exactly where each sensor sits.

Calibration records two poses:

| Pose | What it records |
|---|---|
| **Open hand** (fingers straight) | The raw value of each finger at 0% bend |
| **Fist** | The raw value of each finger at 100% bend |

In the web app, the user follows on-screen prompts: a 3 s countdown, then hold the open hand while the values are averaged, then the same for a fist (`frontend/src/app/components/Calibration.tsx`). The result is **10 numbers**: 5 open values and 5 fist values.

Each raw reading is then turned into a bend from 0 to 1:

```
bend = (raw − open) / (fist − open)        clipped to 0..1
```

The web app (`rawToBendNormalized`) and the model (`bend_from_raw` in `ml/features.py`) use the same formula.

**Design assumption:** every time a user puts the glove on, they recalibrate in the web app.

---

## 2. Why the model depends on it

The model never sees raw flex values. It sees **bends**. Of its 35 features, **21 are built from calibrated bends**:

| Features | Count | Uses calibration? |
|---|---|---|
| Bend per finger: mean, std, min, max | 20 | Yes |
| Largest bend range across fingers | 1 | Yes |
| Gravity direction (hand orientation) | 3 | No |
| Gyroscope energy, peak, per-axis RMS | 5 | No |
| Degrees turned per axis, and the largest | 4 | No |
| Acceleration jitter, direction reversals | 2 | No |

In training, each recording was converted with **the calibration from its own session** (`train.py` looks up the session's open and fist values). So the model learned what I, J and Z look like as 0 to 1 bend patterns. To work correctly on the Pi, it needs the bends computed with **the current wearer's** calibration.

---

## 3. The problem

Two things are missing.

### The web app keeps the calibration in the browser

When the user calibrates, `saveCalibration` in `SensorContext.tsx` stores the 10 numbers in the browser's `localStorage` (key `bridge-hand-flex-calibration`). It is not sent to Supabase, the glove, or the Pi. (The only exception is the Collect page, which saves calibration with its recordings for training data.)

### The Pi reads one fixed calibration at startup

`SignRecognizer` loads `models/calibration.json` once, when `main.py` starts, and never reloads it. That file holds **participant 2's calibration from 2026-11-13** (left hand). So right now, **every wearer is scored as if they were participant 2**.

### What goes wrong

When someone else wears the glove, or the same person puts it on again slightly differently:

- **Bends are shifted or squashed.** For example, their fist might read as 70% bent instead of 100%, and their open hand as 20% instead of 0%.
- **Values outside the old range are clipped** to 0 or 1, and that information is lost.
- **The model gets bend patterns it never saw in training.** It still outputs I, J or Z, but less confidently, or the wrong letter, or nothing (below the 0.6 confidence threshold).

The 14 motion features are not affected, so the moving letters (J, Z) will likely hold up better than static handshapes (I). Every future static letter will be affected the most.

---

## 4. What the fix needs

Whichever option is chosen, three parts are needed:

1. **A way to get the 10 numbers to the Pi** each time the user calibrates (sections 5 and 6).
2. **A way to apply them while running.** A new `SignRecognizer.set_calibration(open, closed)` method that replaces the values and clears the current 2.5 s window, so packets from before calibration aren't mixed with new ones.
3. **Saving to `calibration.json`** on the Pi, so the latest calibration survives a restart.

### Check first: can the glove handle two Bluetooth connections?

Both the web app (through Web Bluetooth) and the Pi connect to the glove over BLE. If the glove's ESP32 firmware only accepts **one connection at a time**, the web app and the Pi cannot both be connected. The user would have to calibrate in the web app, disconnect it, and only then let the Pi connect. The answer affects which option is better. Quick test: run `main.py` on the Pi, then try to connect the web app to the glove.

---

## 5. Option A: calibrate through the Pi over Bluetooth

The Bluetooth update (2026-11-27) made the Pi a BLE device that other devices can connect to, advertising as **"Bridge-Body-Unit"** (`modules/bluetooth.py`, using `bless`). The web app can connect to it with Web Bluetooth.

**How it would work:**

1. Add a writable "calibrate" characteristic to the Pi's BLE service.
2. The web app keeps its open-hand and fist screens. Instead of reading the glove itself, it connects to the Pi and sends commands: "capture open now", then "capture fist now".
3. The Pi averages its own incoming glove packets for each pose, calls `set_calibration()`, and saves `calibration.json`.
4. The Pi replies with the result so the web app can show it.

| Pros | Cons |
|---|---|
| No Wi-Fi or internet needed | Changes in three places: `bluetooth.py` (a teammate's file), the Pi's `main.py`, and the web app's calibration flow |
| The calibration comes from exactly the data the model will see | The web app needs a second Bluetooth connection type (to the Pi, not only the glove) |
| Works even if the glove allows only one connection, because the browser never needs to connect to the glove | |

## 6. Option B: send it through Supabase

**How it would work:**

1. The web app calibrates the way it does now, then also writes `{open, closed, hand, calibrated_at}` to a new `calibrations` table in Supabase.
2. The Pi checks for a newer row on startup and every few seconds, then calls `set_calibration()` and saves `calibration.json`.
3. The Pi needs a Supabase client (or plain HTTP requests) added to its offline `wheels/` and `requirements.txt`.

| Pros | Cons |
|---|---|
| Small web app change: one extra write after the current flow | The Pi needs Wi-Fi and internet |
| Keeps a history of calibrations | The web app must be connected to the glove while calibrating, which may clash with the Pi's connection |
| Supabase is already used by the project | A few seconds' delay before the Pi picks it up; needs a way to know which Pi/glove a calibration belongs to |

---

## 7. Comparison

| | Option A: Bluetooth via Pi | Option B: Supabase |
|---|---|---|
| Needs Wi-Fi | No | Yes |
| Works if the glove allows one connection | Yes | Only if the user disconnects the web app before the Pi connects |
| Size of change | Medium (Pi BLE + web app flow) | Small to medium (table + web app write + Pi polling) |
| Calibration matches what the Pi sees | Exactly (Pi measures it) | Same glove, measured by the browser |
| Delay before it takes effect | Immediate | A few seconds |

**Current recommendation:** Option A, mainly because it does not depend on Wi-Fi and avoids the one-connection problem. **Decision:** both options are being kept open for now.

---

## 8. Until it is fixed

- `models/calibration.json` on the Pi is participant 2's calibration. For live tests, have that person wear the glove, or paste the wearer's 10 values (from the web app) into `calibration.json` by hand before deploying.
- Training data is not affected: every recording already carries its own session's calibration.
