"""
Replay recorded glove data through the live recognizer (no glove needed).

Streams every recording in data_collected/processed/ packet by packet into
ml/sign_model.SignRecognizer (the code meant for the Pi), using each session's own
calibration, and checks which letters it emits. This tests the code that will
run on the Pi, including the sliding window and smoothing.

Note: recordings in the training set were also used to train the model, so this
checks the pipeline end to end, not accuracy on new data (see ml/report.md).

Run:  python ml/replay.py
"""
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import FRAME_COLUMNS  # noqa: E402
from sign_model import SignRecognizer  # noqa: E402

PROCESSED = ROOT / "data_collected" / "processed"
LEAD_IN_MS = 1500  # hand held still before each sign, like a real user


def stream(arr):
    """Lead-in (first frame held), then the recording; static poses are held a bit longer."""
    t = arr[:, 0] - arr[0, 0]
    dt = np.median(np.diff(t)) or 25
    lead = np.repeat(arr[:1], int(LEAD_IN_MS / dt), axis=0)
    lead[:, 0] = np.arange(len(lead)) * dt
    body = arr.copy()
    body[:, 0] = t + lead[-1, 0] + dt
    return np.vstack([lead, body])


def main():
    sessions = pd.read_csv(PROCESSED / "sessions.csv").set_index(["session_id", "hand"])
    samples = pd.read_csv(PROCESSED / "samples.csv")
    frames = pd.read_csv(PROCESSED / "frames.csv")
    by_sample = {k: g.sort_values("frame_idx")[FRAME_COLUMNS].to_numpy()
                 for k, g in frames.groupby(["sample_id", "hand"])}

    rec = SignRecognizer()
    outcome = Counter()
    for s in samples.itertuples():
        c = sessions.loc[(s.session_id, s.hand)]
        rec.open = [c[f"open_f{i}"] for i in range(1, 6)]
        rec.closed = [c[f"closed_f{i}"] for i in range(1, 6)]
        rec.reset()
        emitted = []
        for row in stream(by_sample[(s.sample_id, s.hand)]):
            t, f1, f2, f3, f4, f5, ax, ay, az, gx, gy, gz = row
            letter = rec.push(ax, ay, az, gx, gy, gz, f1, f2, f3, f4, f5, t_ms=t)
            if letter:
                emitted.append(letter)
        result = ("correct" if emitted == [s.label] else
                  "correct + extra" if s.label in emitted else
                  "nothing" if not emitted else "wrong")
        outcome[(s.label, result)] += 1
        if result != "correct":
            print(f"  {s.label} rep {s.rep} ({s.session_id[:8]}): emitted {emitted or 'nothing'}")

    table = pd.Series(outcome).unstack(fill_value=0)
    print(table.to_string())
    total = sum(outcome.values())
    print(f"Exactly the right letter: {sum(v for (_, r), v in outcome.items() if r == 'correct')}/{total}")


if __name__ == "__main__":
    main()
