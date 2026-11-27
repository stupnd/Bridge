"""
Train the sign classifier on data_collected/processed/ and save it to ml/models/.
(Not deployed to the Raspberry Pi yet: copy ml/models/, features.py and sign_model.py over when ready.)

Steps:
  1. Cut every recording into windows (the full recording plus a few random crops,
     so the model copes with the Pi's sliding window not lining up perfectly).
  2. Turn each window into features with ml/features.py (the code the Pi will run too).
  3. Compare a few small models with cross-validation that keeps every crop of a
     recording in the same fold, so the score is honest.
  4. Refit the best one on everything and export it to ONNX, plus a JSON file with
     the labels, feature names and window settings needed to run it.

Outputs:
  ml/models/sign_model.onnx
  ml/models/model_meta.json
  ml/models/calibration.json   (latest training session; recalibrate per wearer)
  ml/report.md                                 (scores + confusion matrix)

Run:  python ml/prepare_data.py && python ml/train.py
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import FEATURE_NAMES, FRAME_COLUMNS, window_features  # noqa: E402

PROCESSED = ROOT / "data_collected" / "processed"
MODEL_DIR = ROOT / "ml" / "models"
REPORT = ROOT / "ml" / "report.md"

REST_LABEL = "REST"            # Collect-page samples with sign_type "none"
WINDOW_MS = 2500               # live window on the Pi (= the Collect page's moving-sign window)
MIN_FRAMES = 20
MIN_PROBABILITY = 0.6          # below this the Pi reports "no sign"
CROPS_PER_RECORDING = 8
SEED = 0


def model_candidates():
    return {
        "logistic_regression": make_pipeline(
            StandardScaler(), LogisticRegression(C=1.0, max_iter=2000)),
        "random_forest": make_pipeline(
            StandardScaler(), RandomForestClassifier(n_estimators=100, max_depth=8,
                                                     min_samples_leaf=2, random_state=SEED)),
        "knn_k3": make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=3)),
    }


def load():
    sessions = pd.read_csv(PROCESSED / "sessions.csv")
    samples = pd.read_csv(PROCESSED / "samples.csv")
    frames = pd.read_csv(PROCESSED / "frames.csv")
    samples = samples[samples.has_calibration]
    samples = samples.assign(target=np.where(samples.sign_type == "none", REST_LABEL,
                                             samples.label.str.upper()))
    return sessions, samples, frames


def build_windows(sessions, samples, frames):
    """One row per window: features, label, and the recording it came from."""
    rng = np.random.default_rng(SEED)
    calib = {(r.session_id, r.hand): ([r[f"open_f{i}"] for i in range(1, 6)],
                                      [r[f"closed_f{i}"] for i in range(1, 6)])
             for _, r in sessions.iterrows()}
    by_sample = {k: g.sort_values("frame_idx")[FRAME_COLUMNS].to_numpy()
                 for k, g in frames.groupby(["sample_id", "hand"])}

    X, y, groups, sessions_of, is_full = [], [], [], [], []
    for s in samples.itertuples():
        arr = by_sample[(s.sample_id, s.hand)]
        open_, closed = calib[(s.session_id, s.hand)]
        t = arr[:, 0]
        dur = t[-1] - t[0]
        # Static poses can be cut short freely; moving signs keep most of the motion.
        min_len = min(1000.0, dur) if s.sign_type != "moving" else 0.85 * dur
        windows = [(t[0], t[-1], True)]
        for _ in range(CROPS_PER_RECORDING):
            length = rng.uniform(min_len, dur)
            start = t[0] + rng.uniform(0, dur - length)
            windows.append((start, start + length, False))
        for a, b, full in windows:
            w = arr[(t >= a) & (t <= b)]
            if len(w) < MIN_FRAMES:
                continue
            X.append(window_features(w, open_, closed))
            y.append(s.target)
            groups.append(s.sample_id)
            sessions_of.append(s.session_id)
            is_full.append(full)
    return (np.vstack(X), np.array(y), np.array(groups), np.array(sessions_of), np.array(is_full))


def grouped_cv(model, X, y, groups, is_full):
    """Accuracy on held-out recordings (all windows, and full recordings only)."""
    n_splits = min(5, pd.Series(y).groupby(groups).first().value_counts().min())
    cv = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    pred = np.empty_like(y)
    for train, test in cv.split(X, y, groups):
        pred[test] = model.fit(X[train], y[train]).predict(X[test])
    return accuracy_score(y, pred), accuracy_score(y[is_full], pred[is_full]), pred


def cross_session(model, X, y, sess):
    """Leave-one-session-out: train on the other sessions, test on this one.

    This is the score that matters for the Pi: every time someone puts the glove
    on is a new session. Only labels present in training are tested. Returns the
    mean over sessions, or None with a single session.
    """
    scores = []
    for held in dict.fromkeys(sess):
        train = sess != held
        test = ~train & np.isin(y, np.unique(y[train]))
        if train.any() and test.any():
            scores.append(accuracy_score(y[test], model.fit(X[train], y[train]).predict(X[test])))
    return float(np.mean(scores)) if scores else None


def export_onnx(model, n_features, path):
    from skl2onnx import to_onnx
    from skl2onnx.common.data_types import FloatTensorType
    onx = to_onnx(model, initial_types=[("features", FloatTensorType([None, n_features]))],
                  options={id(model): {"zipmap": False}}, target_opset=17)
    path.write_bytes(onx.SerializeToString())


def check_onnx(path, model, X):
    import onnxruntime as ort
    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    labels, probs = sess.run(None, {"features": X.astype(np.float32)})
    assert (labels == model.predict(X)).all(), "ONNX labels differ from scikit-learn"
    assert np.allclose(probs, model.predict_proba(X), atol=1e-4), "ONNX probabilities differ"


def main():
    sessions, samples, frames = load()
    X, y, groups, sess, is_full = build_windows(sessions, samples, frames)
    labels = sorted(map(str, set(y)))
    print(f"{len(samples)} recordings -> {len(X)} windows, {X.shape[1]} features, labels {labels}")

    results = {}
    for name, model in model_candidates().items():
        acc_all, acc_full, pred = grouped_cv(model, X, y, groups, is_full)
        xs = cross_session(model, X, y, sess)
        results[name] = dict(cv_windows=acc_all, cv_full=acc_full, cross_session=xs, pred=pred)
        print(f"  {name:20s} CV windows {acc_all:.3f}  full recordings {acc_full:.3f}  "
              f"cross-session {'n/a' if xs is None else f'{xs:.3f}'}")

    # Best = generalizes to a new session; then held-out recordings. Ties go to the earlier model.
    best = max(results, key=lambda n: (results[n]["cross_session"] or 0, results[n]["cv_windows"]))
    model = model_candidates()[best].fit(X, y)
    print(f"Chosen: {best}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = MODEL_DIR / "sign_model.onnx"
    export_onnx(model, X.shape[1], onnx_path)
    check_onnx(onnx_path, model, X)

    meta = {
        "model": best,
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "labels": list(model.classes_),
        "rest_label": REST_LABEL,
        "feature_names": FEATURE_NAMES,
        "frame_columns": FRAME_COLUMNS,
        "window_ms": WINDOW_MS,
        "min_frames": MIN_FRAMES,
        "min_probability": MIN_PROBABILITY,
        "hands": sorted(samples.hand.unique()),
        "training_data": {
            "recordings": int(len(samples)),
            "windows": int(len(X)),
            "participants": sorted(map(str, samples.participant_id.unique())),
            "sessions": int(samples.session_id.nunique()),
            "per_label": {k: int(v) for k, v in samples.target.value_counts().sort_index().items()},
        },
        "scores": {n: {k: (None if v is None else round(float(v), 4)) for k, v in r.items() if k != "pred"}
                   for n, r in results.items()},
    }
    (MODEL_DIR / "model_meta.json").write_text(json.dumps(meta, indent=2))

    latest = sessions.iloc[-1]
    calib = {"source": f"training session {latest.session_id} ({latest.calibrated_at})",
             "hand": latest.hand,
             "open": [int(latest[f"open_f{i}"]) for i in range(1, 6)],
             "closed": [int(latest[f"closed_f{i}"]) for i in range(1, 6)]}
    calib_path = MODEL_DIR / "calibration.json"
    if not calib_path.exists():
        calib_path.write_text(json.dumps(calib, indent=2))

    write_report(meta, results, best, y, labels)
    print(f"Wrote {onnx_path.relative_to(ROOT)} ({onnx_path.stat().st_size / 1024:.0f} KB) and {REPORT.relative_to(ROOT)}")


def write_report(meta, results, best, y, labels):
    td = meta["training_data"]
    lines = [
        "# Sign model report", "",
        f"Generated by `ml/train.py` on {meta['trained_at']}.", "",
        "## Training data", "",
        f"- {td['recordings']} recordings ({td['windows']} windows after cropping), "
        f"{len(td['participants'])} participant(s), {td['sessions']} session(s), hands: {', '.join(meta['hands'])}",
        "- Recordings per label: " + ", ".join(f"{k} {v}" for k, v in td["per_label"].items()), "",
        "## Model comparison", "",
        "Held-out = recordings the model never saw (all crops of a recording stay in one fold).", "",
        "Leave-one-session-out = train on the other sessions, test on an unseen one (like a fresh "
        "glove fitting). The model is chosen by this column.", "",
        "| Model | Held-out windows | Held-out full recordings | Leave-one-session-out |",
        "|---|---|---|---|",
    ]
    for n, r in results.items():
        xs = "n/a" if r["cross_session"] is None else f"{r['cross_session']:.1%}"
        mark = " **(chosen)**" if n == best else ""
        lines.append(f"| {n}{mark} | {r['cv_windows']:.1%} | {r['cv_full']:.1%} | {xs} |")
    cm = confusion_matrix(y, results[best]["pred"], labels=labels)
    lines += ["", f"## Confusion matrix ({best}, held-out windows)", "",
              "| true \\ predicted | " + " | ".join(labels) + " |",
              "|---" * (len(labels) + 1) + "|"]
    lines += [f"| {lab} | " + " | ".join(map(str, row)) + " |" for lab, row in zip(labels, cm)]
    lines += ["", "## Caveats", "",
              "- The model can only output the labels above. Anything else the wearer does is forced "
              "into one of them unless its probability is below `min_probability`.",
              f"- No `{REST_LABEL}` (sign type \"none\") recordings yet, so the model has not learned what "
              "\"not signing\" looks like." if REST_LABEL not in labels else
              f"- `{REST_LABEL}` recordings teach the model what \"not signing\" looks like.",
              "- Scores from one participant say little about a new wearer. Collect from more people.", ""]
    REPORT.write_text("\n".join(lines))


if __name__ == "__main__":
    main()
