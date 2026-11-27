"""
Turn the raw Collect-page exports in data_collected/raw/ into clean tables in
data_collected/processed/.

Why this is needed: each export from the Collect page contains *every* sample
recorded so far, so newer exports repeat older ones. This script merges all
exports, drops the repeats, and reshapes the wide R_/L_ columns into one
"hand" column.

Outputs (data_collected/processed/):
    sessions.csv  one row per calibration session (open/closed raw values per finger)
    samples.csv   one row per recording: label, sign type, rep, frame count, rate ...
    frames.csv    one row per sensor packet (tidy, deduplicated)
    legacy_static_samples.csv  the early one-row-per-sample export (no frames, no IMU)

Run:  python ml/prepare_data.py
"""
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data_collected" / "raw"
OUT = ROOT / "data_collected" / "processed"

FINGER = [f"f{i}" for i in range(1, 6)]
SENSOR = [f"raw_{f}" for f in FINGER] + [f"pct_{f}" for f in FINGER] + \
         ["ax", "ay", "az", "gx", "gy", "gz", "mx", "my", "mz"]
META = ["sample_id", "session_id", "participant_id", "label", "sign_type", "rep",
        "window_ms", "recorded_at", "notes"]


def load_frames() -> pd.DataFrame:
    parts = []
    for path in sorted(RAW.glob("asl-frames-*.csv")):
        wide = pd.read_csv(path)
        for hand in ("L", "R"):
            cols = {f"{hand}_{c}": c for c in SENSOR}
            sub = wide[META + ["frame_idx", "t_ms"] + list(cols)].rename(columns=cols)
            sub = sub[sub["raw_f1"].notna()]  # each row fills one hand only
            sub.insert(3, "hand", hand)
            sub["source_file"] = path.name
            parts.append(sub)
    frames = pd.concat(parts, ignore_index=True)
    # Same packet appears in several exports; keep the first (oldest file) copy.
    frames = frames.drop_duplicates(["sample_id", "hand", "frame_idx"], keep="first")
    return frames.sort_values(["recorded_at", "sample_id", "frame_idx"]).reset_index(drop=True)


def load_sessions() -> pd.DataFrame:
    df = pd.concat([pd.read_csv(p) for p in sorted(RAW.glob("asl-calibration-*.csv"))])
    df = df.drop_duplicates(["session_id", "hand"], keep="last")
    return df.sort_values("calibrated_at").reset_index(drop=True)


def summarize(frames: pd.DataFrame, sessions: pd.DataFrame) -> pd.DataFrame:
    g = frames.groupby(["sample_id", "hand"], sort=False)
    samples = g[META[1:]].first()
    samples["n_frames"] = g.size()
    samples["duration_ms"] = g["t_ms"].max() - g["t_ms"].min()
    samples["rate_hz"] = (samples["n_frames"] - 1) / (samples["duration_ms"] / 1000)
    samples["max_gap_ms"] = g["t_ms"].apply(lambda t: t.diff().max())
    samples["first_seen_in"] = g["source_file"].first()
    samples = samples.reset_index()
    known = set(zip(sessions.session_id, sessions.hand))
    samples["has_calibration"] = [(s, h) in known for s, h in zip(samples.session_id, samples.hand)]
    return samples.round({"rate_hz": 1})


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = load_frames()
    sessions = load_sessions()
    samples = summarize(frames, sessions)

    sessions.to_csv(OUT / "sessions.csv", index=False)
    samples.to_csv(OUT / "samples.csv", index=False)
    frames.drop(columns=["source_file"] + META[1:]).to_csv(OUT / "frames.csv", index=False)

    legacy = sorted(RAW.glob("asl-samples-*.csv"))
    if legacy:
        pd.concat([pd.read_csv(p) for p in legacy]).to_csv(OUT / "legacy_static_samples.csv", index=False)

    print(f"{len(sessions)} sessions, {len(samples)} recordings, {len(frames)} frames")
    print(samples.groupby(["label", "sign_type"]).size().rename("recordings").to_string())
    missing = samples[~samples.has_calibration]
    if len(missing):
        print(f"WARNING: {len(missing)} recordings have no calibration session and can't be used.")


if __name__ == "__main__":
    main()
