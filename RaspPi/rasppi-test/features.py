"""
Feature extraction for one hand over a window of glove frames.

This file is the single source of truth: train.py uses it to build the training
set and sign_model.py uses it live (on the Raspberry Pi, once deployed), so the
model always sees features computed exactly the same way.

Only depends on numpy (no pandas / scikit-learn on the Pi).

Frame layout (one row per BLE packet, matching the firmware and the Collect CSV):
    t_ms, raw_f1..raw_f5, ax, ay, az (mg), gx, gy, gz (deg/s)
Finger order: thumb, index, middle, ring, pinky.
The magnetometer is ignored on purpose: it depends on which way the user faces
and on nearby metal, not on the sign.
"""
import numpy as np

# Columns expected in a frames array, in this order.
FRAME_COLUMNS = ["t_ms", "raw_f1", "raw_f2", "raw_f3", "raw_f4", "raw_f5",
                 "ax", "ay", "az", "gx", "gy", "gz"]

FINGERS = ["thumb", "index", "middle", "ring", "pinky"]
REVERSAL_DEADBAND_DPS = 30.0   # same as frontend/src/app/lib/imu.ts
MAX_DT_S = 0.1                 # cap gaps from dropped packets when integrating the gyro


def bend_from_raw(raw, open_, closed):
    """Raw ADC -> 0..1 bend (0 = straight, 1 = fully bent), per the wearer's calibration.

    Same formula as rawToBendNormalized() in the web app, so pct_f* in the CSVs == 100 * this.
    """
    raw = np.asarray(raw, dtype=float)
    open_ = np.asarray(open_, dtype=float)
    span = np.asarray(closed, dtype=float) - open_
    span = np.where(np.abs(span) < 1, np.nan, span)
    bend = (raw - open_) / span
    # Uncalibrated fallback for a degenerate finger: lower raw = more bent.
    bend = np.where(np.isnan(bend), 1 - raw / 4095.0, bend)
    return np.clip(bend, 0.0, 1.0)


def _names():
    names = []
    for stat in ("mean", "std", "min", "max"):
        names += [f"bend_{f}_{stat}" for f in FINGERS]
    names += ["bend_range_max"]
    names += ["gravity_x", "gravity_y", "gravity_z"]
    names += ["gyro_rms", "gyro_peak", "gyro_x_rms", "gyro_y_rms", "gyro_z_rms"]
    names += ["turn_x_deg", "turn_y_deg", "turn_z_deg", "turn_abs_max_deg"]
    names += ["acc_std", "reversals"]
    return names


FEATURE_NAMES = _names()


def window_features(frames, open_, closed):
    """frames: (n, 12) array in FRAME_COLUMNS order, n >= 2. Returns a 1-D float32 vector."""
    f = np.asarray(frames, dtype=float)
    t = f[:, 0]
    bend = bend_from_raw(f[:, 1:6], open_, closed)
    acc = f[:, 6:9]
    gyr = f[:, 9:12]

    feats = [bend.mean(0), bend.std(0), bend.min(0), bend.max(0),
             [np.max(bend.max(0) - bend.min(0))]]

    acc_mean = acc.mean(0)
    g = np.linalg.norm(acc_mean) or 1.0
    feats.append(acc_mean / g)

    gmag = np.linalg.norm(gyr, axis=1)
    feats.append([np.sqrt(np.mean(gmag ** 2)), gmag.max()])
    feats.append(np.sqrt(np.mean(gyr ** 2, axis=0)))

    dt = np.minimum(np.diff(t) / 1000.0, MAX_DT_S)
    turn = (gyr[1:] * dt[:, None]).sum(0)
    feats.append(turn)
    feats.append([np.abs(turn).max()])

    # Direction changes on the busiest gyro axis (back-and-forth motions like Z).
    axis = int(np.argmax((gyr ** 2).sum(0)))
    v = gyr[:, axis]
    signs = np.sign(v[np.abs(v) >= REVERSAL_DEADBAND_DPS])
    reversals = int(np.count_nonzero(np.diff(signs))) if signs.size > 1 else 0
    feats.append([np.linalg.norm(acc, axis=1).std(), reversals])

    return np.concatenate([np.ravel(x) for x in feats]).astype(np.float32)
