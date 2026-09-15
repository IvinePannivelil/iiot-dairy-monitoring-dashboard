"""
routers/predictions.py – GET /api/v1/predictions

Returns the latest computed predictions for every sensor in the target list.
The React AIDiagnostics component polls this endpoint every 10 s to redraw
the "ghost line" projection on each Sparkline Trend Tile.

DATA FLOW
---------
  prediction_worker.py writes → InfluxDB (predictions measurement)
  This router reads ← InfluxDB (predictions measurement)
  React frontend reads ← GET /api/v1/predictions

WHY A SEPARATE ENDPOINT?
--------------------------
Predictions are intentionally decoupled from live tag reads (/api/v1/tags)
because:
  - Tags are fetched on a 2 s frontend poll (high-frequency, small payload).
  - Predictions are computed every 10 s by the worker and change slowly.
  - Keeping them separate allows the frontend to use different polling intervals
    and avoids adding regression latency to the live data path.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter

from influx_client import fetch_latest_predictions
from schemas import PredictionsResponse, PredictionPoint

log = logging.getLogger("dairy.predictions")
router = APIRouter(prefix="/api/v1", tags=["Predictions"])


@router.get("/predictions", response_model=PredictionsResponse)
async def get_predictions():
    """
    Return the most recent 5-min and 10-min forward projections for all sensors.

    **Response example**
    ```json
    {
      "%DB1.DBD216": {
        "val_plus_5m":   77.2,
        "val_plus_10m":  78.1,
        "slope_per_sec": 0.000305,
        "quality":       "good"
      },
      "%DB3.DBD406": {
        "val_plus_5m":  null,
        "val_plus_10m": null,
        "quality":      "insufficient_data"
      }
    }
    ```
    The frontend uses `slope_per_sec` to colour the ghost line:
      - slope > 0.01  → orange/red  (rising trend)
      - slope < -0.01 → blue/cyan   (falling trend)
      - near zero     → grey/neutral
    """
    raw = await fetch_latest_predictions()
    return {tag: PredictionPoint(**data) for tag, data in raw.items()}
