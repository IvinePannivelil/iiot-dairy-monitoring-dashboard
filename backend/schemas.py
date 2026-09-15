"""
schemas.py – Pydantic v2 request/response models
Strict validation on all API boundaries prevents malformed data
from reaching InfluxDB or the frontend.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


# ── /api/v1/tags ─────────────────────────────────────────────────────────────

class TagReadRequest(BaseModel):
    """POST body: list of IEC-style S7 tag addresses to read."""
    tags: list[str] = Field(
        ...,
        min_length=1,
        example=["%DB1.DBD204", "%DB3.DBD406", "%DB12.DBD4"],
    )


class TagValue(BaseModel):
    """Single tag read result."""
    value: float | bool | int | None = None
    quality: Literal["good", "bad", "stale"] = "bad"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    error: str | None = None


TagReadResponse = dict[str, TagValue]  # keyed by tag address


# ── /api/v1/alarms/ack ───────────────────────────────────────────────────────

class AlarmAckRequest(BaseModel):
    """POST body: acknowledge a single alarm."""
    id: int | str = Field(..., description="Alarm numeric or string ID")
    title: str = Field(default="Unknown Alarm")


class AlarmAckResponse(BaseModel):
    success: bool
    message: str


class AlarmAckedListResponse(BaseModel):
    """GET response: list of acknowledged alarm IDs."""
    acked: list[str]


# ── /health ──────────────────────────────────────────────────────────────────

class PLCStatus(BaseModel):
    nodered: Literal["online", "offline"]
    influxdb: Literal["online", "offline"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str = "Dairy Edge Gateway"
    connections: PLCStatus
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


# ── /api/v1/predictions ──────────────────────────────────────────────────────

class PredictionPoint(BaseModel):
    val_plus_5m: float
    val_plus_10m: float
    slope_per_sec: float
    quality: Literal["good", "insufficient_data"] = "good"


PredictionsResponse = dict[str, PredictionPoint]  # keyed by tag address
