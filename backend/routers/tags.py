"""
routers/tags.py — POST /api/v1/tags  &  GET /api/v1/tags/history

InfluxDB-only architecture. Tags are stored as FIELDS in the measurement
(e.g. machine_data). No Node-RED dependency.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from influx_client import fetch_latest_tag_values, fetch_tag_history, fetch_tag_history_bulk

log = logging.getLogger("dairy.tags")
router = APIRouter(prefix="/api/v1", tags=["Tags"])


# ── Request / Response schemas ────────────────────────────────────────────────

class TagReadRequest(BaseModel):
    tags: list[str]




class TagValue(BaseModel):
    value:     Optional[float]
    quality:   str             # "good" | "stale" | "bad"
    timestamp: str             # UTC ISO-8601 with Z suffix
    age_sec:   Optional[int]  = None  # seconds since data was written to InfluxDB
    error:     Optional[str]  = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/tags", response_model=dict[str, TagValue])
async def read_tags(body: TagReadRequest):
    """
    Fetch the most-recent InfluxDB value for each requested tag.

    Tags must be Field names in the measurement (e.g. "AI1", "TT1", "FM1").

    **Request:**
    ```json
    { "tags": ["AI1", "TT1", "FM1"] }
    ```

    **Response:**
    ```json
    {
      "AI1": { "value": 25.4, "quality": "good", "timestamp": "2026-04-27T..." },
      "TT1": { "value": null,  "quality": "bad",  "timestamp": "...", "error": "No recent data" }
    }
    ```
    """
    log.debug("Tag read request: %d tags", len(body.tags))
    raw = await fetch_latest_tag_values(body.tags)
    return {tag: TagValue(**data) for tag, data in raw.items()}


@router.get("/tags/history")
def get_tag_history_single(
    tag: str = Query(..., description="Field name to fetch history for (e.g. AI1)"),
    start_time: str = Query(default="-1h", description="Flux range start, e.g. -1h, -30m, -24h"),
):
    """
    Return time-series history for a single tag.

    **Response:**
    ```json
    [
      {"time": "2026-04-27T10:00:00Z", "value": 25.4},
      {"time": "2026-04-27T10:01:00Z", "value": 25.6}
    ]
    ```
    """
    log.info("History request: tag=%s start=%s", tag, start_time)
    return fetch_tag_history(tag=tag, start_time=start_time)


@router.get("/tags/history/bulk")
def get_tag_history_bulk(
    tags: str = Query(..., description="Comma-separated list of field names, e.g. AI1,TT1,FM1"),
    minutes: int = Query(default=120, ge=10, le=480),
):
    """
    Return the last `minutes` of data for multiple tags as fixed-length float arrays.
    Useful for pre-populating chart histories on dashboard load.

    **Response:**
    ```json
    {
      "AI1": [25.4, 25.3, 25.5, ...],
      "TT1": [8.2, 8.1, 0.0, ...]
    }
    ```
    """
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    log.info("Bulk history: %d tags, last %d minutes", len(tag_list), minutes)
    return fetch_tag_history_bulk(tag_list, minutes=minutes)
