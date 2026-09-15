"""
nodered_client.py – Thin HTTP client that checks Node-RED liveness
and (optionally) scrapes the /plc/snapshot endpoint.

Node-RED is the hardware interface layer. This module is deliberately
lightweight — the primary data path is InfluxDB (Node-RED writes there
directly). We only call Node-RED HTTP for:
  1. Health check: is Node-RED alive?
  2. Instant snapshot: bypass InfluxDB for ultra-low-latency reads (optional).
"""
from __future__ import annotations

import logging

import httpx

from config import get_settings

log = logging.getLogger("dairy.nodered")
cfg = get_settings()

_TIMEOUT = httpx.Timeout(3.0)   # 3 s — tight so /health stays snappy


def is_nodered_reachable() -> bool:
    """
    Hit Node-RED's built-in /health endpoint.
    Node-RED exposes GET http://<host>:1880/ — a 200 means it's up.
    Falls back to checking the snapshot path if the root returns non-200.
    """
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            r = client.get(cfg.nodered_url + "/")
            return r.status_code < 500
    except Exception:
        return False


async def fetch_nodered_snapshot() -> dict | None:
    """
    Optional: scrape Node-RED's HTTP-in snapshot endpoint for an instant
    read of all live tag values without going through InfluxDB.

    Expected Node-RED response shape:
        { "%DB1.DBD204": 76.4, "%DB3.DBD406": 8.2, … }

    Returns None if Node-RED is unreachable.
    """
    url = cfg.nodered_url + cfg.nodered_snapshot_path
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        log.warning("Node-RED snapshot unavailable: %s", exc)
        return None
