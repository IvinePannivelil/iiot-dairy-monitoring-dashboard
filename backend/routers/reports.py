"""
reports.py — Generates historical batch reports
"""
from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])

from influx_client import fetch_historical_reports

@router.get("")
async def get_reports(
    start_date: Optional[str] = Query(None, description="ISO datetime string for start (UTC)"),
    end_date: Optional[str] = Query(None, description="ISO datetime string for end (UTC)"),
    system_type: str = Query("all", description="System type filter: all, Pasteurizer, CIP, Reception")
) -> List[Dict[str, Any]]:
    """
    Generates historical batch reports for the IIoT monitoring dashboard using real InfluxDB data.
    Frontend always sends UTC ISO strings with a trailing Z (e.g. 2026-04-23T05:00:00.000Z).
    We parse them as UTC-aware datetimes and pass RFC3339 timestamps to Flux to avoid drift.
    """
    now_utc = datetime.now(timezone.utc)

    try:
        if start_date:
            # JS sends YYYY-MM-DDTHH:MM:SS.sssZ — parse as UTC-aware
            start = datetime.strptime(start_date[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        else:
            start = now_utc - timedelta(days=7)

        if end_date:
            end = datetime.strptime(end_date[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
        else:
            end = now_utc
    except ValueError:
        start = now_utc - timedelta(days=7)
        end = now_utc

    # Ensure start is before end
    if start > end:
        start = end - timedelta(days=7)

    # Format as RFC3339 UTC for Flux (e.g. 2026-04-23T05:00:00Z)
    start_iso = start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_iso   = end.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Query InfluxDB for real historical reports
    reports = await fetch_historical_reports(start_iso, end_iso)

    # Filter by system type if necessary
    if system_type and system_type.lower() != "all":
        reports = [r for r in reports if r["type"].lower() == system_type.lower()]

    return reports
