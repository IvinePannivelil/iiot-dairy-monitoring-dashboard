"""
workers/prediction_worker.py
════════════════════════════════════════════════════════════════════════════════
Dairy Monitoring — Moving Linear Regression Prediction Engine

PURPOSE
-------
This background thread periodically polls InfluxDB for recent (last 60 s) values
of critical temperature and flow sensors. For each sensor it fits a
linear regression model (slope + intercept) using NumPy's least-squares solver,
then projects that slope forward by 5 min and 10 min.

The resulting "ghost line" predictions are written back into InfluxDB under the
``predictions`` measurement. The React frontend's AIDiagnostics component reads
these values to draw the dashed projection line on each Sparkline Trend Tile.

ARCHITECTURE
------------
  Node-RED / Simulation → writes live values → InfluxDB (telemetry measurement)
                                                      ↑
  This worker reads from InfluxDB ────────────────────┘
                ↓
  Writes predictions → InfluxDB (predictions measurement)
                ↓
  FastAPI /api/v1/predictions → React frontend reads predictions

WHY NUMPY INSTEAD OF SCIKIT-LEARN?
------------------------------------
For a simple y = mx + c fit over ~60 data points, np.polyfit is 10–30× faster
than sklearn.LinearRegression and has no additional overhead.

DAMPING LOGIC
-------------
Raw process data can spike ±3°C on a single scan due to electrical noise. We average
the earliest 20% and latest 20% of the window before computing slope — this gives
us a "trend direction" that is resistant to transient spikes while still reacting
to genuine temperature drift within ~15–20 seconds.
"""
from __future__ import annotations

import logging
import threading
import time
from typing import TYPE_CHECKING

import numpy as np

# Synchronous InfluxDB helpers
from influx_client import fetch_tag_history, write_predictions
from config import get_settings

log = logging.getLogger("dairy.prediction_worker")
cfg = get_settings()

# ── Sensor registry ───────────────────────────────────────────────────────────
# Analog tags feeding the AIDiagnostics "ghost line" projection UI.
TARGET_TAGS: list[str] = [
    # ── Pasteurizer (Unit 2) — temperature sensors ────────────────────────────
    "AI1", "%DB1.DBD204",   # AI1 — Product Inlet
    "AI2", "%DB1.DBD208",   # AI2 — Homogenizer Inlet
    "AI3", "%DB1.DBD212",   # AI3 — Holding Inlet
    "AI4", "%DB1.DBD216",   # AI4 — Holding Outlet  ← critical
    "AI5", "%DB1.DBD220",   # AI5 — Product Outlet
    "AI6", "%DB1.DBD224",   # AI6 — Main Hot Water
    "AI7", "%DB1.DBD228",   # AI7 — Pre Hot Water
    "AI8", "%DB1.DBD232",   # AI8 — Chilled Water Inlet

    # ── CIP System (Unit 3) — supply/return temp sensors ──────────────────────
    "CT2", "%DB12.DBD4",    # CT2 — Hot Water Tank
    "CT3", "%DB13.DBD4",    # CT3 — Lye Tank
    "CT4", "%DB14.DBD4",    # CT4 — Acid Tank
    "CT5", "%DB15.DBD4",    # CT5 — Supply Line
    "CT6", "%DB16.DBD4",    # CT6 — Return Line

    # ── Milk Reception (Unit 1) — raw milk and separator temps ────────────────
    "TT1",   # Raw Milk Inlet Temp
    "TT2",   # Separator Inlet
    "TT3",   # Separator Outlet
    "TT6",   # Standardization Inlet
]

# Minimum number of data points required before we attempt a regression.
# With a 10 s poll interval and 60 s lookback we expect ~6–12 points.
# Fewer than 5 means the sensor just came online or data is very sparse.
MIN_POINTS_REQUIRED = 5

# ── Core regression logic ─────────────────────────────────────────────────────

def _damped_slope(times: np.ndarray, values: np.ndarray) -> float:
    """
    Compute the least-squares linear slope (°C/s or LPH/s) for a sensor,
    with damping applied to reduce spike sensitivity.

    Parameters
    ----------
    times  : 1-D array of Unix timestamps (seconds), sorted ascending
    values : 1-D array of matching sensor readings

    Returns
    -------
    slope : float — units per second (positive = rising, negative = falling)

    Damping detail:
        We average the bottom 20% and top 20% of the window instead of using
        the raw first/last points. This is equivalent to a windowed slope
        estimator and avoids the common issue of a single noisy scan inflating
        the regression gradient.
    """
    n = len(times)
    window = max(1, int(n * 0.20))   # 20 % of the data window

    # Average the early and late segments separately
    t_start = np.mean(times[:window])
    v_start = np.mean(values[:window])
    t_end   = np.mean(times[-window:])
    v_end   = np.mean(values[-window:])

    dt = t_end - t_start
    if dt <= 0:
        # Timestamps are identical — no time progression, slope is undefined
        return 0.0

    return (v_end - v_start) / dt   # rise / run → slope in units per second


def _run_regression(data_points: list[dict]) -> dict | None:
    """
    Fit a linear model to a single sensor's historical data and return
    the 5-min and 10-min forward projections.

    Parameters
    ----------
    data_points : list of {"time": float (epoch), "value": float}

    Returns
    -------
    dict with keys:
        val_plus_5m   (float) — projected value 5 minutes from now
        val_plus_10m  (float) — projected value 10 minutes from now
        slope_per_sec (float) — raw trend gradient for UI gradient colouring
    None if there are not enough data points.
    """
    if len(data_points) < MIN_POINTS_REQUIRED:
        return None  # Not enough history — skip and let the frontend show "--"

    # Sort by timestamp ascending (InfluxDB usually returns sorted, but be safe)
    data_points.sort(key=lambda p: p["time"])

    times  = np.array([p["time"]  for p in data_points], dtype=np.float64)
    values = np.array([p["value"] for p in data_points], dtype=np.float64)

    # Current value = latest reading (used as anchor for projection)
    current_value = values[-1]

    slope = _damped_slope(times, values)

    return {
        "val_plus_5m":   round(current_value + slope * 300,  2),   # 5 min = 300 s
        "val_plus_10m":  round(current_value + slope * 600,  2),   # 10 min = 600 s
        "slope_per_sec": round(slope, 6),
    }


# ── Worker loop ───────────────────────────────────────────────────────────────

def _prediction_cycle() -> None:
    """
    Single execution of the prediction cycle:
      1. For each target tag, query InfluxDB for the last N seconds of history.
      2. Run linear regression on that history.
      3. Batch-write all successful predictions back to InfluxDB.

    Called repeatedly by the background thread at PREDICTION_INTERVAL_SEC cadence.
    """
    predictions: dict[str, dict] = {}

    for tag in TARGET_TAGS:
        try:
            # Fetch raw time-series from InfluxDB (synchronous call — safe in a thread)
            history = fetch_tag_history(tag, lookback_sec=cfg.prediction_lookback_sec)

            result = _run_regression(history)
            if result:
                predictions[tag] = result
                log.debug(
                    "  %s → +5m=%.2f  +10m=%.2f  slope=%.4f/s",
                    tag, result["val_plus_5m"], result["val_plus_10m"], result["slope_per_sec"],
                )
            else:
                log.debug("  %s — insufficient data (%d points)", tag, len(history))

        except Exception as exc:
            # Never let a single sensor failure abort the whole cycle
            log.warning("Prediction failed for %s: %s", tag, exc)

    if predictions:
        write_predictions(predictions)
        log.info(
            "[Prediction Worker] Wrote %d/%d predictions",
            len(predictions), len(TARGET_TAGS),
        )
    else:
        log.warning("[Prediction Worker] No predictions written — check InfluxDB connectivity")


def run_prediction_worker() -> None:
    """
    Entry point for the background daemon thread.

    Runs _prediction_cycle() every PREDICTION_INTERVAL_SEC seconds.
    Uses time.sleep() for simplicity — acceptable because this thread has
    no async code. The loop is intentionally forgiving: an exception in one
    cycle is logged and the worker continues to the next cycle rather than
    crashing the entire backend process.
    """
    log.info(
        "[Prediction Worker] Starting — interval=%ds, lookback=%ds, sensors=%d",
        cfg.prediction_interval_sec,
        cfg.prediction_lookback_sec,
        len(TARGET_TAGS),
    )

    while True:
        try:
            _prediction_cycle()
        except Exception as exc:
            # Belt-and-suspenders: catch anything _prediction_cycle missed
            log.error("[Prediction Worker] Unhandled exception in cycle: %s", exc)

        # Sleep until the next cycle
        time.sleep(cfg.prediction_interval_sec)


def start_prediction_worker_thread() -> threading.Thread:
    """
    Create and start the prediction worker as a daemon thread.

    Daemon=True means Python will not wait for this thread to finish when the
    main process exits — it will be killed automatically on shutdown, which is
    the correct behaviour for a background polling loop.

    Returns the Thread object in case the caller wants to monitor it.
    """
    thread = threading.Thread(
        target=run_prediction_worker,
        name="PredictionWorker",
        daemon=True,   # ← stops automatically when FastAPI shuts down
    )
    thread.start()
    log.info("[Prediction Worker] Thread started (id=%s)", thread.ident)
    return thread
