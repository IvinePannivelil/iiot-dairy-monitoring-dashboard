"""
influx_client.py — Direct InfluxDB v2 client (InfluxDB-only architecture).

All tag data is fetched from InfluxDB using Flux queries.
No Node-RED dependency. Fields are stored directly in the measurement
(e.g. measurement=machine_data, fields: AI1, TT1, FM1...).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from influxdb_client import InfluxDBClient, Point, WriteOptions
from influxdb_client.client.exceptions import InfluxDBError
from influxdb_client.client.write_api import SYNCHRONOUS as _SYNC

from config import get_settings

log = logging.getLogger("dairy.influx")
cfg = get_settings()

# ── Global client singletons ──────────────────────────────────────────────────
_client = InfluxDBClient(
    url=cfg.influx_url,
    token=cfg.influx_token,
    org=cfg.influx_org,
    timeout=10_000,
)
_query_api       = _client.query_api()
_write_api       = _client.write_api(
    write_options=WriteOptions(batch_size=10, flush_interval=2_000)
)
_alarm_write_api = _client.write_api(write_options=_SYNC)


# ── Health ────────────────────────────────────────────────────────────────────

def is_influx_reachable() -> bool:
    """Ping InfluxDB health endpoint."""
    try:
        health = _client.health()
        return health.status == "pass"
    except Exception as exc:
        log.warning("InfluxDB health check failed: %s", exc)
        return False


# ── Live tag values ───────────────────────────────────────────────────────────

async def fetch_latest_tag_values(tags: list[str]) -> dict[str, Any]:
    """
    Fetch the most-recent value for each tag directly from InfluxDB.

    Tries two measurement formats in order:
      1. machine_data  — standard format: field key = tag name (e.g. "AI1")
      2. scada_tags    — legacy fallback format: _field=="value", tag tag_name=="AI1"

    Returns:
        { "AI1": {"value": 25.4, "quality": "good",
                  "timestamp": "2026-04-28T07:00:00Z", "age_sec": 4} }
    """
    if not tags:
        return {}

    now_ts  = datetime.now(timezone.utc)
    now_iso = now_ts.strftime("%Y-%m-%dT%H:%M:%SZ")
    result: dict[str, Any] = {}

    # ── Query 1: machine_data (new format — field key is the tag name) ────────
    field_filter = " or ".join(f'r["_field"] == "{t}"' for t in tags)
    flux_main = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: -10m)
  |> filter(fn: (r) => r["_measurement"] == "{cfg.influx_measurement}")
  |> filter(fn: (r) => {field_filter})
  |> last()
  |> keep(columns: ["_field", "_value", "_time"])
"""
    try:
        tables = _query_api.query(flux_main, org=cfg.influx_org)
        for table in tables:
            for record in table.records:
                field = record.values.get("_field")
                if field:
                    ts      = record.get_time()
                    age_sec = int((now_ts - ts).total_seconds())
                    result[field] = {
                        "value":     record.get_value(),
                        "quality":   "good" if age_sec < 300 else "stale",
                        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "age_sec":   age_sec,
                    }
    except (InfluxDBError, Exception) as exc:
        log.error("InfluxDB machine_data query failed: %s", exc)

    # ── Query 2: scada_tags fallback (legacy format — tag_name as InfluxDB tag) ─
    missing = [t for t in tags if t not in result]
    if missing:
        tag_filter = " or ".join(f'r["tag_name"] == "{t}"' for t in missing)
        flux_legacy = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: -10m)
  |> filter(fn: (r) => r["_measurement"] == "scada_tags")
  |> filter(fn: (r) => r["_field"] == "value")
  |> filter(fn: (r) => {tag_filter})
  |> last()
  |> keep(columns: ["tag_name", "_value", "_time"])
"""
        try:
            tables = _query_api.query(flux_legacy, org=cfg.influx_org)
            for table in tables:
                for record in table.records:
                    tag = record.values.get("tag_name")
                    if tag:
                        ts      = record.get_time()
                        age_sec = int((now_ts - ts).total_seconds())
                        result[tag] = {
                            "value":     record.get_value(),
                            "quality":   "good" if age_sec < 300 else "stale",
                            "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "age_sec":   age_sec,
                        }
        except (InfluxDBError, Exception) as exc:
            log.error("InfluxDB scada_tags fallback query failed: %s", exc)

    # ── Bad-quality placeholder for tags still not found ─────────────────────
    for tag in tags:
        if tag not in result:
            result[tag] = {
                "value":     None,
                "quality":   "bad",
                "timestamp": now_iso,
                "age_sec":   -1,
                "error":     "No data in InfluxDB (last 10 min)",
            }
    return result


# ── Tag history (single tag) ──────────────────────────────────────────────────

def fetch_tag_history(
    tag: str,
    start_time: str = "-1h",
    lookback_sec: int | None = None
) -> list[dict[str, Any]]:
    """
    Return chronologically sorted time-series data for a single tag.
    Tries machine_data first, falls back to scada_tags (legacy format).

    Returns: [ {"time": "2026-04-28T07:00:00Z", "value": 25.4}, ... ]
    """
    if lookback_sec is not None:
        start_time = f"-{lookback_sec}s"

    def _ts(record) -> str:
        return record.get_time().strftime("%Y-%m-%dT%H:%M:%SZ")

    # ── machine_data (new format) ─────────────────────────────────────────────
    flux_main = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: {start_time})
  |> filter(fn: (r) => r["_measurement"] == "{cfg.influx_measurement}")
  |> filter(fn: (r) => r["_field"] == "{tag}")
  |> sort(columns: ["_time"])
  |> keep(columns: ["_value", "_time"])
"""
    points: list[dict[str, Any]] = []
    try:
        tables = _query_api.query(flux_main, org=cfg.influx_org)
        for table in tables:
            for record in table.records:
                points.append({"time": _ts(record), "value": record.get_value()})
    except Exception as exc:
        log.error("History query failed for %s (machine_data): %s", tag, exc)

    # ── scada_tags fallback (legacy format) ───────────────────────────────────
    if not points:
        flux_legacy = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: {start_time})
  |> filter(fn: (r) => r["_measurement"] == "scada_tags")
  |> filter(fn: (r) => r["_field"] == "value")
  |> filter(fn: (r) => r["tag_name"] == "{tag}")
  |> sort(columns: ["_time"])
  |> keep(columns: ["_value", "_time"])
"""
        try:
            tables = _query_api.query(flux_legacy, org=cfg.influx_org)
            for table in tables:
                for record in table.records:
                    points.append({"time": _ts(record), "value": record.get_value()})
        except Exception as exc:
            log.error("History query failed for %s (scada_tags): %s", tag, exc)

    return points


# ── Bulk history (multiple tags, fixed-length arrays) ─────────────────────────

def fetch_tag_history_bulk(tags: list[str], minutes: int = 120) -> dict[str, list[float | None]]:
    """
    Return the last `minutes` of readings for each tag as a fixed-length array
    (1 slot per minute). Empty slots are None (not 0.0) so the frontend can
    distinguish "no data" from a genuine zero reading.

    Tries machine_data first, falls back to scada_tags for any tags not found.

    Returns: { "AI1": [25.4, None, 25.5, ...], "TT1": [8.2, 8.1, ...] }
    """
    if not tags:
        return {}

    def _bucket_points(records_iter, field_key: str) -> dict[str, list[tuple]]:
        raw: dict[str, list[tuple]] = {t: [] for t in tags}
        for table in records_iter:
            for record in table.records:
                field = record.values.get(field_key)
                if field and field in raw:
                    v = record.get_value()
                    if v is not None:
                        raw[field].append((record.get_time().timestamp(), float(v)))
        return raw

    # ── machine_data (new format) ─────────────────────────────────────────────
    field_filter = " or ".join(f'r["_field"] == "{t}"' for t in tags)
    flux_main = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: -{minutes}m)
  |> filter(fn: (r) => r["_measurement"] == "{cfg.influx_measurement}")
  |> filter(fn: (r) => {field_filter})
  |> aggregateWindow(every: 1m, fn: last, createEmpty: false)
  |> sort(columns: ["_time"])
  |> keep(columns: ["_value", "_time", "_field"])
"""
    raw: dict[str, list[tuple]] = {t: [] for t in tags}
    try:
        raw = _bucket_points(_query_api.query(flux_main, org=cfg.influx_org), "_field")
    except Exception as exc:
        log.error("Bulk history machine_data query failed: %s", exc)

    # ── scada_tags fallback for tags still empty ───────────────────────────────
    missing = [t for t in tags if not raw.get(t)]
    if missing:
        tag_filter = " or ".join(f'r["tag_name"] == "{t}"' for t in missing)
        flux_legacy = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: -{minutes}m)
  |> filter(fn: (r) => r["_measurement"] == "scada_tags")
  |> filter(fn: (r) => r["_field"] == "value")
  |> filter(fn: (r) => {tag_filter})
  |> aggregateWindow(every: 1m, fn: last, createEmpty: false)
  |> sort(columns: ["_time"])
  |> keep(columns: ["_value", "_time", "tag_name"])
"""
        try:
            legacy_raw = _bucket_points(
                _query_api.query(flux_legacy, org=cfg.influx_org), "tag_name"
            )
            for tag in missing:
                if legacy_raw.get(tag):
                    raw[tag] = legacy_raw[tag]
        except Exception as exc:
            log.error("Bulk history scada_tags fallback failed: %s", exc)

    # ── Map timestamped tuples → fixed-length array ───────────────────────────
    now_ts = datetime.now(timezone.utc).timestamp()
    window_start = now_ts - minutes * 60
    result: dict[str, list] = {}
    for tag in tags:
        arr: list = [None] * minutes
        for epoch, val in raw.get(tag, []):
            offset_min = int((epoch - window_start) / 60)
            if 0 <= offset_min < minutes:
                arr[offset_min] = val
        result[tag] = arr
    return result


# ── Alarm helpers ─────────────────────────────────────────────────────────────

def write_alarm_ack(alarm_id: str, title: str) -> bool:
    try:
        point = (
            Point("alarm_events")
            .tag("alarm_id", alarm_id)
            .field("title", title)
            .field("state", "acknowledged")
        )
        _alarm_write_api.write(
            bucket=cfg.influx_bucket, org=cfg.influx_org, record=point
        )
        return True
    except Exception as exc:
        log.error("Alarm ACK write failed: %s", exc)
        return False


def write_alarm_event(alarm: dict) -> bool:
    """Persist a triggered alarm into the alarm_log measurement."""
    try:
        point = (
            Point("alarm_log")
            .tag("alarm_id",  alarm["id"])
            .tag("severity",  alarm["severity"])
            .tag("source",    alarm["source"])
            .field("description", alarm["description"])
            .field("category",    alarm["category"])
            .field("deleted",     False)
        )
        _alarm_write_api.write(
            bucket=cfg.influx_bucket, org=cfg.influx_org, record=point
        )
        return True
    except Exception as exc:
        log.error("Alarm event write failed: %s", exc)
        return False


def fetch_alarm_log() -> list[dict]:
    """Return all non-deleted alarm_log entries, newest first."""
    flux = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: -30d)
  |> filter(fn: (r) => r["_measurement"] == "alarm_log")
  |> filter(fn: (r) => r["_field"] == "deleted" and r["_value"] == false)
  |> sort(columns: ["_time"], desc: true)
  |> keep(columns: ["_time", "alarm_id", "severity", "source", "_value"])
"""
    alarms: list[dict] = []
    try:
        tables = _query_api.query(flux, org=cfg.influx_org)
        for table in tables:
            for record in table.records:
                alarms.append({
                    "id":          record.values.get("alarm_id", ""),
                    "severity":    record.values.get("severity", "warning"),
                    "source":      record.values.get("source", ""),
                    "timestamp":   record.get_time().isoformat(),
                    "raw_time":    record.get_time().isoformat(),
                })
    except Exception as exc:
        log.error("Fetch alarm log failed: %s", exc)
    return alarms


def delete_alarm_event(composite_id: str, alarm_id: str, raw_time: str) -> bool:
    """
    Mark an alarm as deleted by writing a new point with deleted=True
    (InfluxDB v2 does not support row-level deletes in the same way, so we
    overwrite via a tombstone point and filter on read).
    """
    try:
        point = (
            Point("alarm_log")
            .tag("alarm_id", alarm_id)
            .tag("severity", "deleted")
            .tag("source",   "deleted")
            .field("description", "DELETED")
            .field("category",    "DELETED")
            .field("deleted",     True)
        )
        _alarm_write_api.write(
            bucket=cfg.influx_bucket, org=cfg.influx_org, record=point
        )
        return True
    except Exception as exc:
        log.error("Alarm delete failed for %s: %s", alarm_id, exc)
        return False


def delete_alarm_events_batch(alarms: list[dict]) -> bool:
    """Delete multiple alarms at once (tombstone approach)."""
    try:
        points = []
        for alarm in alarms:
            points.append(
                Point("alarm_log")
                .tag("alarm_id", alarm["alarm_id"])
                .tag("severity", "deleted")
                .tag("source",   "deleted")
                .field("description", "DELETED")
                .field("category",    "DELETED")
                .field("deleted",     True)
            )
        _alarm_write_api.write(
            bucket=cfg.influx_bucket, org=cfg.influx_org, record=points
        )
        return True
    except Exception as exc:
        log.error("Batch alarm delete failed: %s", exc)
        return False


def fetch_acked_alarm_ids() -> list[str]:
    flux = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "alarm_events")
  |> filter(fn: (r) => r["_field"] == "state" and r["_value"] == "acknowledged")
  |> keep(columns: ["alarm_id", "_time"])
  |> last()
"""
    ids: list[str] = []
    try:
        tables = _query_api.query(flux, org=cfg.influx_org)
        for table in tables:
            for record in table.records:
                aid = record.values.get("alarm_id")
                if aid:
                    ids.append(aid)
    except Exception as exc:
        log.error("Fetch acked alarms failed: %s", exc)
    return ids


# ── Predictions ───────────────────────────────────────────────────────────────

def write_predictions(predictions: dict[str, dict]) -> None:
    """
    Write prediction results to the 'predictions' measurement in InfluxDB.
    Called by workers/prediction_worker.py after each regression cycle.

    Args:
        predictions: { "AI1": {"val_plus_5m": 26.1, "val_plus_10m": 26.8,
                                "slope_per_sec": 0.000305}, ... }
    """
    points = []
    for tag, pred in predictions.items():
        p = (
            Point("predictions")
            .tag("sensor", tag)
            .field("val_plus_5m",   pred["val_plus_5m"])
            .field("val_plus_10m",  pred["val_plus_10m"])
            .field("slope_per_sec", pred["slope_per_sec"])
        )
        points.append(p)
    try:
        _write_api.write(bucket=cfg.influx_bucket, org=cfg.influx_org, record=points)
    except Exception as exc:
        log.error("Prediction write failed: %s", exc)

async def fetch_latest_predictions() -> dict[str, Any]:
    """
    Return the most-recent 5-min and 10-min forward predictions for all sensors.
    Written by prediction_worker into the 'predictions' measurement.

    Returns:
        {
          "AI1": {"val_plus_5m": 26.1, "val_plus_10m": 26.8,
                  "slope_per_sec": 0.000305, "quality": "good"},
        }
    """
    flux = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: -2m)
  |> filter(fn: (r) => r["_measurement"] == "predictions")
  |> last()
  |> pivot(rowKey: ["_time", "tag"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["tag", "val_plus_5m", "val_plus_10m", "slope_per_sec"])
"""
    result: dict[str, Any] = {}
    try:
        tables = _query_api.query(flux, org=cfg.influx_org)
        for table in tables:
            for record in table.records:
                tag = record.values.get("tag")
                if tag:
                    result[tag] = {
                        "val_plus_5m":   record.values.get("val_plus_5m"),
                        "val_plus_10m":  record.values.get("val_plus_10m"),
                        "slope_per_sec": record.values.get("slope_per_sec"),
                        "quality":       "good",
                    }
    except Exception as exc:
        log.error("Fetch predictions failed: %s", exc)
    return result


# ── Historical Reports ────────────────────────────────────────────────────────

async def fetch_historical_reports(start_iso: str, end_iso: str) -> list[dict]:
    """
    Generate historical batch reports by processing raw 1-minute telemetry data.
    Automatically detects contiguous running periods and calculates exact volumes.
    """
    flux = f"""
from(bucket: "{cfg.influx_bucket}")
  |> range(start: {start_iso}, stop: {end_iso})
  |> filter(fn: (r) => r["_measurement"] == "{cfg.influx_measurement}")
  |> filter(fn: (r) => r["_field"] == "AO1" or r["_field"] == "AI4" or r["_field"] == "AI6" or r["_field"] == "AI9" or
                       r["_field"] == "FM1" or r["_field"] == "TT1" or r["_field"] == "TT3" or 
                       r["_field"] == "CF1" or r["_field"] == "CT5" or r["_field"] == "CT6" or r["_field"] == "CC1")
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"])
"""
    reports: list[dict] = []
    
    # State trackers
    past_batch = None
    rec_batch = None
    cip_batch = None

    def finalize_batch(batch, sys_type):
        if not batch or len(batch["times"]) < 5: return None # Ignore blips < 5 mins
        
        start_t = batch["times"][0]
        end_t = batch["times"][-1]
        duration_hrs = (end_t - start_t).total_seconds() / 3600.0
        duration_mins = int((end_t - start_t).total_seconds() / 60)
        
        dur_str = f"{duration_mins // 60}h {duration_mins % 60}m" if duration_mins >= 60 else f"{duration_mins}m"
        batch_id = f"B-{sys_type[0]}{int(start_t.timestamp()) % 100000}"
        
        avg_flow = sum(batch["flows"]) / len(batch["flows"]) if batch["flows"] else 0
        volume = avg_flow * duration_hrs
        
        report = {
            "id": batch_id,
            "type": sys_type,
            "product": "Milk" if sys_type == "Pasteurizer" else ("Raw Milk" if sys_type == "Reception" else "CIP Solution"),
            "status": "Passed",
            "statusReason": "",
            "startTime": start_t.isoformat(),
            "endTime": end_t.isoformat(),
            "duration": dur_str,
            "volume": f"{int(volume):,} L",
            "timestamp": end_t.isoformat(),
            "_epoch": end_t.timestamp(),
        }
        
        if sys_type == "Pasteurizer":
            ai4_avg = sum(batch["ai4"]) / len(batch["ai4"]) if batch["ai4"] else 0
            ai6_avg = sum(batch["ai6"]) / len(batch["ai6"]) if batch["ai6"] else 0
            report["avgTemp1"] = f"{round(ai4_avg, 1)} °C"
            report["avgTemp2"] = f"{round(ai6_avg, 1)} °C"
            report["t1Label"] = "Avg Holding"
            report["t2Label"] = "Avg Hot Water"
            # FSSAI limits
            min_holding = min(batch["ai4"]) if batch["ai4"] else 0
            if min_holding < 72.0:
                report["status"] = "Failed"
                report["statusReason"] = f"Holding Temp dipped to {round(min_holding, 1)}°C"
                
        elif sys_type == "Reception":
            tt1_avg = sum(batch["tt1"]) / len(batch["tt1"]) if batch["tt1"] else 0
            tt3_avg = sum(batch["tt3"]) / len(batch["tt3"]) if batch["tt3"] else 0
            report["avgTemp1"] = f"{round(tt1_avg, 1)} °C"
            report["avgTemp2"] = f"{round(tt3_avg, 1)} °C"
            report["t1Label"] = "Avg Unloading"
            report["t2Label"] = "Avg Separator"
            max_tt1 = max(batch["tt1"]) if batch["tt1"] else 0
            if max_tt1 > 8.0:
                report["status"] = "Warning"
                report["statusReason"] = f"Unload Temp hit {round(max_tt1, 1)}°C"
                
        elif sys_type == "CIP":
            ct5_avg = sum(batch["ct5"]) / len(batch["ct5"]) if batch["ct5"] else 0
            ct6_avg = sum(batch["ct6"]) / len(batch["ct6"]) if batch["ct6"] else 0
            cc1_max = max(batch["cc1"]) if batch["cc1"] else 0
            report["avgTemp1"] = f"{round(ct5_avg, 1)} °C"
            report["avgTemp2"] = f"{round(ct6_avg, 1)} °C"
            report["t1Label"] = "Avg Supply"
            report["t2Label"] = "Avg Return"
            report["maxCond"] = f"{round(cc1_max, 2)} mS/cm"
            if ct5_avg < 72.0:
                report["status"] = "Warning"
                report["statusReason"] = f"Supply Temp only {round(ct5_avg, 1)}°C"
                
        return report

    try:
        tables = _query_api.query(flux, org=cfg.influx_org)
        if not tables: return []
        
        for record in tables[0].records:
            t = record.get_time()
            v = record.values
            
            # Extract values
            ao1 = v.get("AO1") or 0.0
            ai9 = v.get("AI9") or 0.0
            ai4 = v.get("AI4") or 0.0
            ai6 = v.get("AI6") or 0.0
            
            fm1 = v.get("FM1") or 0.0
            tt1 = v.get("TT1") or 0.0
            tt3 = v.get("TT3") or 0.0
            
            cf1 = v.get("CF1") or 0.0
            ct5 = v.get("CT5") or 0.0
            ct6 = v.get("CT6") or 0.0
            cc1 = v.get("CC1") or 0.0
            
            # --- Pasteurizer Logic ---
            if ao1 > 2.0: # Pump active
                if not past_batch: past_batch = {"times": [], "flows": [], "ai4": [], "ai6": []}
                past_batch["times"].append(t)
                past_batch["flows"].append(ai9 if ai9 > 100 else (ao1 * 50)) # Fallback to 5000LPH max if AI9 bad
                past_batch["ai4"].append(ai4)
                past_batch["ai6"].append(ai6)
            else:
                if past_batch:
                    rep = finalize_batch(past_batch, "Pasteurizer")
                    if rep: reports.append(rep)
                    past_batch = None
                    
            # --- Reception Logic ---
            if fm1 > 500.0: # Flow active
                if not rec_batch: rec_batch = {"times": [], "flows": [], "tt1": [], "tt3": []}
                rec_batch["times"].append(t)
                rec_batch["flows"].append(fm1)
                rec_batch["tt1"].append(tt1)
                rec_batch["tt3"].append(tt3)
            else:
                if rec_batch:
                    rep = finalize_batch(rec_batch, "Reception")
                    if rep: reports.append(rep)
                    rec_batch = None
                    
            # --- CIP Logic ---
            if cf1 > 500.0: # CIP Flow active
                if not cip_batch: cip_batch = {"times": [], "flows": [], "ct5": [], "ct6": [], "cc1": []}
                cip_batch["times"].append(t)
                cip_batch["flows"].append(cf1)
                cip_batch["ct5"].append(ct5)
                cip_batch["ct6"].append(ct6)
                cip_batch["cc1"].append(cc1)
            else:
                if cip_batch:
                    rep = finalize_batch(cip_batch, "CIP")
                    if rep: reports.append(rep)
                    cip_batch = None
                    
        # Finalize any running batches at the end of the window
        if past_batch:
            rep = finalize_batch(past_batch, "Pasteurizer")
            if rep: reports.append(rep)
        if rec_batch:
            rep = finalize_batch(rec_batch, "Reception")
            if rep: reports.append(rep)
        if cip_batch:
            rep = finalize_batch(cip_batch, "CIP")
            if rep: reports.append(rep)
            
    except Exception as exc:
        log.error("Historical reports query failed: %s", exc)

    reports.sort(key=lambda x: x["_epoch"], reverse=True)
    for r in reports:
        r.pop("_epoch", None)
    return reports

