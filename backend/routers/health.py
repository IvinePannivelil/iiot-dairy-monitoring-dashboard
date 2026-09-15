"""
routers/health.py – GET /health

Checks connectivity to both Node-RED and InfluxDB and returns a single
aggregated status object — used by the frontend header indicator.
"""
from __future__ import annotations

from fastapi import APIRouter

from influx_client import is_influx_reachable
from nodered_client import is_nodered_reachable
from schemas import HealthResponse, PLCStatus

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Returns the connectivity status of the two upstream services.

    ```json
    {
      "status": "ok",
      "service": "Dairy Edge Gateway",
      "connections": {
        "nodered":  "online",
        "influxdb": "online"
      }
    }
    ```
    """
    nr_up      = is_nodered_reachable()
    influx_up  = is_influx_reachable()
    overall    = "ok" if (nr_up and influx_up) else "degraded"

    return HealthResponse(
        status=overall,
        connections=PLCStatus(
            nodered  = "online" if nr_up     else "offline",
            influxdb = "online" if influx_up else "offline",
        ),
    )
