# How a Sign Is Recognized on the Raspberry Pi

*Bridge, CEG4913. Notes for the final report. Status as of 2026-11-27.*

This document explains what happens in time when a user wears the glove and makes a sign: how the Pi measures time, how it decides that a sign has happened, when it outputs a letter, and how speed affects it. It includes a test of fast J signs. The code is `ml/sign_model.py` (copied to `RaspPi/rasppi-test/`).

> **Status:** the Pi prints the recognized letter. **It does not play audio yet** (section 7).

---

## 1. From the glove to the Pi

The glove sends one Bluetooth packet about **every 25 ms (40 per second)**. This rate was measured in the recordings (median 39.6 to 39.9 Hz). Each packet holds:

| Data | Used by the model? |
|---|---|
| 5 raw flex sensor values (one per finger) | Yes, as calibrated 0 to 1 bends |
| Acceleration X/Y/Z | Yes |
| Gyroscope (rotation speed) X/Y/Z | Yes |
| Magnetometer X/Y/Z | No (changes with the direction the wearer faces) |

`main.py` passes every packet to `SignRecognizer.push()`.

### Where the time comes from

The packets do not contain a timestamp. `push()` stamps each packet with the **Pi's clock when the packet is processed** (`time.monotonic()`). These timestamps are used to keep the window 2.5 s long and to work out how far the hand turned (rotation speed × time between packets).

---

## 2. The settings that control timing

| Setting | Value | Defined in | Meaning |
|---|---|---|---|
| Window | **2.5 s** (~100 packets) | `train.py` → `model_meta.json` (`window_ms`) | The model always looks at the most recent 2.5 s of packets |
| Stride | **250 ms** | `sign_model.py` (`stride_ms`) | The model runs 4 times a second, not on every packet |
| Stability | **3 in a row** | `sign_model.py` (`stable_predictions`) | The same letter must win 3 consecutive runs |
| Confidence | **60%** | `train.py` → `model_meta.json` (`min_probability`) | A run counts only if the model is at least 60% sure |
| Minimum data | **20 packets and 2 s** | `model_meta.json` (`min_frames`), `sign_model.py` | Needed before the first prediction after startup |

The 2.5 s window matches the length of a moving-sign recording on the web app's Collect page. A J recording is about 2.46 s long; a static I is about 1.5 s.

---

## 3. The rolling window

The Pi **does not know when a sign starts or ends**. There is no "start" button. Instead, it keeps the last 2.5 s of packets in a buffer:

- Every new packet is added to the end.
- Packets older than 2.5 s are dropped from the front.
- Every 250 ms, the whole buffer is turned into 35 numbers (features) and given to the model.

```
packets:  ... ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ ← newest
                    └──────── last 2.5 s ────────┘
                                               every 250 ms → features → model → letter + confidence
```

### What the 35 features describe

The features summarize the whole window, so they capture both the **handshape** and the **movement**:

| Group | Count | What it captures |
|---|---|---|
| Finger bends: mean, std, min, max per finger | 20 | The handshape, and how much each finger moved |
| Largest bend range | 1 | Whether any finger moved a lot |
| Gravity direction | 3 | Which way the hand is tilted |
| Gyroscope energy, peak, per-axis RMS | 5 | How much and how fast the hand rotated |
| Degrees turned per axis, and the largest | 4 | How far the hand turned in total (the hook of a J) |
| Acceleration jitter, direction reversals | 2 | Shaking, and back-and-forth motion (the zig-zag of a Z) |

**Time order inside the window is not used directly.** The model sees totals and statistics over the 2.5 s. This is why it works whether the sign is at the start, middle or end of the window.

---

## 4. When a letter is output

After each run, the result is recorded as the letter (if confidence ≥ 60%) or as "no sign" (if below). A letter is output when:

1. The **last 3 runs agree** on the same letter, and
2. That letter is **different from the last one output**.

After a letter is output, it is **not repeated** while the window still contains the sign. To sign the same letter twice, the user lowers or rests the hand briefly in between, so the runs change to "no sign" or another letter before the second sign.

Right after `main.py` starts, nothing is output for about 2 s while the window fills.

---

## 5. Example: signing J

J is the I handshape (pinky up) with the pinky drawing a hook downward and toward the body.

```
time →  0s        0.5       1.0       1.5       2.0       2.5       3.0
hand:   [rest]    [I shape → pinky draws the hook ──────]  [rest]
runs:   ?    ?    ?    I    I    J    J    J  → output "J"   J    J   (no repeat)
        └ every 250 ms, the model looks at the last 2.5 s ┘
```

1. **Before the J:** the window holds mostly a still hand. Confidence is low, so these runs are "no sign".
2. **Start of the J:** the hand is in the I shape. The model may briefly say I.
3. **During the hook:** once enough of the movement is in the window, the runs switch to J.
4. **3 J's in a row** (about 0.5 s after the first J) → `push()` returns `"J"` and `main.py` prints `SIGN (MyArduinoDevice): J`.
5. **After:** the J is still in the window for up to 2.5 s, so the runs keep saying J, but nothing more is output.

In the replay of the real recordings, a J is output about **1 to 1.25 s after the sign starts**.

### Why the model copes with signs not lining up with the window

During training, every recording was used whole **and** cut into 8 random shorter pieces (`CROPS_PER_RECORDING` in `train.py`). For moving signs, each piece keeps at least 85% of the recording. So the model learned to recognize a sign that only partly fills the window or sits off-centre. `replay.py` checks this by adding 1.5 s of still hand before each recording, like a real user. Result: **47 of 47 recordings output exactly the right letter**.

---

## 6. Does the user need to repeat a quick sign?

**No. One J is enough.** A quick J (under 1 s) stays inside the 2.5 s window for about 2.5 s after it happens. That gives about 10 runs that can see it, and only 3 in a row are needed.

### Speed test

To check, the 19 real J recordings (and the I and Z recordings) were replayed through the same recognizer at higher speeds. Time was compressed, rotation speed scaled up to match (same motion, done faster), the data was resampled back to the glove's 40 packets a second, and still-hand periods were added before (1.5 s) and after (2.5 s).

| Speed | J lasts | Signed once → output | J output after the sign starts (median) |
|---|---|---|---|
| 1× (as recorded) | ~2.5 s | 15/19 "J"; 4/19 "I then J" | ~1.25 s |
| 1.5× | ~1.6 s | 17/19 "J"; 2/19 "I then J" | ~1.0 s |
| 2× | ~1.2 s | **19/19 "J"** | ~1.0 s |
| 3× | ~0.8 s | **19/19 "J"** | ~1.0 s |

I and Z were 100% correct at every speed.

**Why faster signs work:** most features do not depend on speed. The finger bends are the same, the total angle the hand turns is the same, and the number of direction reversals is the same. A faster J also spends less time holding the I shape at the start.

**The real issue is a slow J.** If the hand holds the I shape before the hook, the Pi can output **"I" and then "J"**. Possible fixes:
- wait slightly longer before outputting I, in case it becomes a J,
- or record more slow J's so the model learns that a held I can lead into a J.

**Limitation:** this test speeds up one person's J on the computer. Different people sign J in their own way. That needs more participants in the training data, and the calibration fix (`pi-calibration-problem.md`).

---

## 7. Audio: not connected yet

`RaspPi/rasppi-test/modules/tts.py` has `play(text)`, which speaks text with the Piper voice. In `main.py` the TTS import is commented out, so the Pi only prints the letter.

Adding `tts.play(letter)` next to the print would work, but would cause a timing problem:

1. **`play()` blocks** until the word has been spoken. It runs in the same loop that handles Bluetooth packets, so packets pile up while it speaks.
2. **Packets are timestamped when processed, not when they arrive** (section 1). After speech, the backlog is processed all at once and gets nearly identical timestamps. This corrupts the "degrees turned" features for the next couple of seconds, which could make the following sign wrong.

**Fix (not yet done):**
- Run speech in a background thread: `asyncio.create_task(asyncio.to_thread(tts.play, letter))`.
- Timestamp each packet when it arrives in `bluetooth.py`, and pass that time to `push(..., t_ms=...)`.
- Put a Piper voice model (`.onnx` and `.onnx.json`) in a `tts-model/` folder on the Pi, which `tts.py` expects.

### End-to-end delay (expected once audio is added)

| Stage | Time |
|---|---|
| Sign starts → letter recognized | ~1 to 1.5 s |
| Piper starts speaking | not measured yet on the Pi |
