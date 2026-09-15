"""
routers/alarms.py

Persistent alarm log:
  GET  /api/v1/alarms          — full history (newest first), never cleared automatically
  POST /api/v1/alarms/ack      — legacy ACK (kept for compatibility)
  POST /api/v1/alarms/delete   — permanently remove a single alarm entry
  GET  /api/v1/alarms/ack      — list acked IDs (legacy)

Every time the GET endpoint detects a new condition, it persists the alarm to
InfluxDB so it stays in the log until the user explicitly deletes it.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from influx_client import (
    fetch_acked_alarm_ids,
    write_alarm_ack,
    write_alarm_event,
    fetch_alarm_log,
    delete_alarm_event,
    delete_alarm_events_batch,
    fetch_latest_tag_values,
)
from schemas import AlarmAckRequest, AlarmAckResponse, AlarmAckedListResponse

log = logging.getLogger("dairy.alarms")
router = APIRouter(prefix="/api/v1/alarms", tags=["Alarms"])


class DeleteAlarmRequest(BaseModel):
    id: str           # composite row id
    alarm_id: str     # original alarm_id tag
    raw_time: str     # ISO timestamp from record

class DeleteAlarmBatchRequest(BaseModel):
    alarms: list[DeleteAlarmRequest]

class AlarmEventRequest(BaseModel):
    id: str
    severity: str
    source: str
    category: str
    description: str


# ── Alarm condition definitions ───────────────────────────────────────────────
# Architecture: PLC computes conditions; dashboard monitors boolean result bits.
# 1=alarm active, 0=clear.
ALARM_CONDITIONS = [
    # RECEPTION — Unit 1 boolean bits
    {"id": "ALM-REC-ESTOP",     "tag": "REC_ALM_ESTOP",     "check": lambda v: v==1, "severity": "critical", "source": "Reception (DB_UNIT1,X4.0)", "category": "Safety",    "desc_fn": lambda v: "Emergency Stop"},
    {"id": "ALM-REC-AIR",       "tag": "REC_ALM_AIR",       "check": lambda v: v==1, "severity": "critical", "source": "Reception (DB_UNIT1,X4.1)", "category": "Equipment", "desc_fn": lambda v: "Air Pressure Fail"},
    {"id": "ALM-REC-SPP",       "tag": "REC_ALM_SPP",       "check": lambda v: v==1, "severity": "critical", "source": "Reception (DB_UNIT1,X4.2)", "category": "Equipment", "desc_fn": lambda v: "SPP Feedback Fail"},
    {"id": "ALM-REC-RCM-HI",    "tag": "REC_ALM_RCM_HI",    "check": lambda v: v==1, "severity": "warning",  "source": "Reception (DB_UNIT1,X4.3)", "category": "Process",   "desc_fn": lambda v: "RCM Tank High Level"},
    {"id": "ALM-REC-RMST-HI",   "tag": "REC_ALM_RMST_HI",   "check": lambda v: v==1, "severity": "warning",  "source": "Reception (DB_UNIT1,X4.4)", "category": "Process",   "desc_fn": lambda v: "RMST Tank High Level"},
    {"id": "ALM-REC-SEP",       "tag": "REC_ALM_SEP",       "check": lambda v: v==1, "severity": "critical", "source": "Reception (DB_UNIT1,X4.5)", "category": "Equipment", "desc_fn": lambda v: "Cream Separator Trip"},
    {"id": "ALM-REC-VENT",      "tag": "REC_ALM_VENTURI",   "check": lambda v: v==1, "severity": "critical", "source": "Reception (DB_UNIT1,X4.6)", "category": "Equipment", "desc_fn": lambda v: "Venturi Pump Trip"},
    {"id": "ALM-REC-RCM-AGIT",  "tag": "REC_ALM_RCM_AGIT",  "check": lambda v: v==1, "severity": "warning",  "source": "Reception (DB_UNIT1,X4.7)", "category": "Equipment", "desc_fn": lambda v: "RCM Agitator Trip"},
    {"id": "ALM-REC-RMST-AGIT", "tag": "REC_ALM_RMST_AGIT", "check": lambda v: v==1, "severity": "warning",  "source": "Reception (DB_UNIT1,X5.0)", "category": "Equipment", "desc_fn": lambda v: "RMST Agitator Trip"},
    {"id": "ALM-REC-CHILL",     "tag": "REC_ALM_CHILL",     "check": lambda v: v==1, "severity": "critical", "source": "Reception (DB_UNIT1,X5.1)", "category": "Equipment", "desc_fn": lambda v: "Chilled Water Pump Trip"},

    # CIP — Unit 3 boolean bits
    {"id": "ALM-CIP-ESTOP",     "tag": "CIP_ALM_ESTOP",    "check": lambda v: v==1, "severity": "critical", "source": "CIP (DB_UNIT3,X0.0)", "category": "Safety",    "desc_fn": lambda v: "Emergency Stop"},
    {"id": "ALM-CIP-AIR",       "tag": "CIP_ALM_AIR",      "check": lambda v: v==1, "severity": "critical", "source": "CIP (DB_UNIT3,X0.2)", "category": "Equipment", "desc_fn": lambda v: "Air Pressure Low"},
    {"id": "ALM-CIP-SPL",       "tag": "CIP_ALM_SPL",      "check": lambda v: v==1, "severity": "critical", "source": "CIP (DB_UNIT3,X0.3)", "category": "Equipment", "desc_fn": lambda v: "SPL Fault"},
    {"id": "ALM-CIP-SUP-FB",    "tag": "CIP_ALM_SUP_FB",   "check": lambda v: v==1, "severity": "critical", "source": "CIP (DB_UNIT3,X0.4)", "category": "Equipment", "desc_fn": lambda v: "Supply Pump Feedback Fail"},
    {"id": "ALM-CIP-RET-FS",    "tag": "CIP_ALM_RET_FS",   "check": lambda v: v==1, "severity": "warning",  "source": "CIP (DB_UNIT3,X0.6)", "category": "Process",   "desc_fn": lambda v: "Return Flow Sensor Fault"},
    {"id": "ALM-CIP-RT-LL",     "tag": "CIP_ALM_RT_LL",    "check": lambda v: v==1, "severity": "warning",  "source": "CIP (DB_UNIT3,X2.1)", "category": "Process",   "desc_fn": lambda v: "Return Temp Low Limit"},
    {"id": "ALM-CIP-HT-LL",     "tag": "CIP_ALM_HT_LL",    "check": lambda v: v==1, "severity": "warning",  "source": "CIP (DB_UNIT3,X2.2)", "category": "Process",   "desc_fn": lambda v: "Hot Temp Low Limit"},
    {"id": "ALM-CIP-LT-LL",     "tag": "CIP_ALM_LT_LL",    "check": lambda v: v==1, "severity": "warning",  "source": "CIP (DB_UNIT3,X2.3)", "category": "Process",   "desc_fn": lambda v: "Low Temp Low Limit"},
    {"id": "ALM-CIP-AT-LL",     "tag": "CIP_ALM_AT_LL",    "check": lambda v: v==1, "severity": "warning",  "source": "CIP (DB_UNIT3,X2.4)", "category": "Process",   "desc_fn": lambda v: "Acid Temp Low Limit"},
    {"id": "ALM-CIP-FLOW-LO",   "tag": "CIP_ALM_FLOW_LO",  "check": lambda v: v==1, "severity": "warning",  "source": "CIP (DB_UNIT3,X3.0)", "category": "Process",   "desc_fn": lambda v: "Supply Flow Too Low"},

    # PASTEURIZER — Unit 2 boolean bits
    {"id": "ALM-PAST-ESTOP",     "tag": "PAST_ALM_ESTOP",     "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X0.0)", "category": "Safety",    "desc_fn": lambda v: "Emergency Stop PB"},
    {"id": "ALM-PAST-AIR",       "tag": "PAST_ALM_AIR",       "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X0.2)", "category": "Equipment", "desc_fn": lambda v: "Air Pressure Low"},
    {"id": "ALM-PAST-FEED-FB",   "tag": "PAST_ALM_FEED_FB",   "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X0.4)", "category": "Equipment", "desc_fn": lambda v: "Feed Pump ON Feedback Failed"},
    {"id": "ALM-PAST-FEED-TRIP", "tag": "PAST_ALM_FEED_TRIP", "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X0.5)", "category": "Equipment", "desc_fn": lambda v: "Feed Pump Trip"},
    {"id": "ALM-PAST-PMST-FB",   "tag": "PAST_ALM_PMST_FB",   "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X1.0)", "category": "Equipment", "desc_fn": lambda v: "PMST Pump Feedback Failed"},
    {"id": "ALM-PAST-PMST-AGIT", "tag": "PAST_ALM_PMST_AGIT", "check": lambda v: v==1, "severity": "warning",  "source": "Pasteurizer (DB_UNIT2,X1.1)", "category": "Equipment", "desc_fn": lambda v: "PMST Agitator Feedback Failed"},
    {"id": "ALM-PAST-HOMO-FS",   "tag": "PAST_ALM_HOMO_FS",   "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X1.2)", "category": "Equipment", "desc_fn": lambda v: "Homogenizer Flow Switch Fault"},
    {"id": "ALM-PAST-FLOW",      "tag": "PAST_ALM_FLOW",      "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X1.3)", "category": "Process",   "desc_fn": lambda v: "Past Flow Fault"},
    {"id": "ALM-PAST-LOW-LONG",  "tag": "PAST_ALM_LOW_LONG",  "check": lambda v: v==1, "severity": "warning",  "source": "Pasteurizer (DB_UNIT2,X1.5)", "category": "Process",   "desc_fn": lambda v: "Low Level Long Time"},
    {"id": "ALM-PAST-BAL-HI",    "tag": "PAST_ALM_BAL_HI",    "check": lambda v: v==1, "severity": "warning",  "source": "Pasteurizer (DB_UNIT2,X2.0)", "category": "Process",   "desc_fn": lambda v: "Balance Tank Level High"},
    {"id": "ALM-PAST-BAL-LO",    "tag": "PAST_ALM_BAL_LO",    "check": lambda v: v==1, "severity": "warning",  "source": "Pasteurizer (DB_UNIT2,X2.1)", "category": "Process",   "desc_fn": lambda v: "Balance Tank Level Low"},
    {"id": "ALM-PAST-HOT-LO",    "tag": "PAST_ALM_HOT_LO",    "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X3.0)", "category": "Process",   "desc_fn": lambda v: "Past Hot Temp Low"},
    {"id": "ALM-PAST-HOT-HI",    "tag": "PAST_ALM_HOT_HI",    "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X3.1)", "category": "Process",   "desc_fn": lambda v: "Past Hot Temp High"},
    {"id": "ALM-PAST-OUT-LO",    "tag": "PAST_ALM_OUT_LO",    "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X3.2)", "category": "Process",   "desc_fn": lambda v: "Past Out Temp Low"},
    {"id": "ALM-PAST-OUT-HI",    "tag": "PAST_ALM_OUT_HI",    "check": lambda v: v==1, "severity": "critical", "source": "Pasteurizer (DB_UNIT2,X3.3)", "category": "Process",   "desc_fn": lambda v: "Past Out Temp High"},
    {"id": "ALM-PAST-PMST-HI",   "tag": "PAST_ALM_PMST_HI",   "check": lambda v: v==1, "severity": "warning",  "source": "Pasteurizer (DB_UNIT2_AUX,X0.1)", "category": "Process",   "desc_fn": lambda v: "PMST High Level Alarm"},
]
@router.get("", response_model=list[dict])
async def get_alarms():
    """
    1. Evaluate live PLC data against alarm conditions.
    2. Persist any newly triggered alarms to InfluxDB alarm_log.
    3. Return the full alarm history (newest first).
    """
    tags = list({c["tag"] for c in ALARM_CONDITIONS})
    live_data = await fetch_latest_tag_values(tags)

    # Check conditions and write new alarm events if triggered
    for cond in ALARM_CONDITIONS:
        tag_data = live_data.get(cond["tag"], {})
        val = tag_data.get("value")
        if val is not None and cond["check"](val):
            alarm_entry = {
                "id":          cond["id"],
                "severity":    cond["severity"],
                "source":      cond["source"],
                "category":    cond["category"],
                "description": cond["desc_fn"](val),
            }
            write_alarm_event(alarm_entry)

    # Return full persistent log
    return fetch_alarm_log()


@router.post("/event")
async def create_alarm_event(body: AlarmEventRequest):
    """
    Persist a single alarm event directly — called by frontend components
    (e.g. SparklineTrendTile when a threshold breach is projected by the AI engine).
    """
    alarm_entry = {
        "id":          body.id,
        "severity":    body.severity,
        "source":      body.source,
        "category":    body.category,
        "description": body.description,
    }
    success = write_alarm_event(alarm_entry)
    if not success:
        raise HTTPException(status_code=503, detail="Failed to write alarm event to InfluxDB")
    log.info("AI/frontend alarm event persisted: %s", body.id)
    return {"success": True, "message": f"Alarm {body.id} recorded"}


@router.post("/delete")
async def delete_alarm(body: DeleteAlarmRequest):
    """Permanently remove a single alarm entry from the log."""
    success = delete_alarm_event(body.id, body.alarm_id, body.raw_time)
    if not success:
        raise HTTPException(status_code=503, detail="Failed to delete alarm — InfluxDB unavailable")
    log.info("Alarm deleted: %s (%s)", body.alarm_id, body.id)
    return {"success": True, "message": f"Alarm {body.id} deleted"}


@router.post("/delete_batch")
async def delete_alarms_batch(body: DeleteAlarmBatchRequest):
    """Permanently remove multiple alarm entries from the log in one go."""
    alarms_list = [{"id": a.id, "alarm_id": a.alarm_id, "raw_time": a.raw_time} for a in body.alarms]
    success = delete_alarm_events_batch(alarms_list)
    if not success:
        raise HTTPException(status_code=503, detail="Failed to delete alarms — InfluxDB unavailable")
    log.info("%d alarms deleted in batch", len(body.alarms))
    return {"success": True, "message": f"{len(body.alarms)} alarms deleted"}


@router.post("/ack", response_model=AlarmAckResponse)
async def acknowledge_alarm(body: AlarmAckRequest):
    """Legacy ACK endpoint — kept for compatibility with Header notification panel."""
    alarm_id = str(body.id)
    success = write_alarm_ack(alarm_id, body.title)
    if not success:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to persist acknowledgement for alarm {alarm_id} — InfluxDB unavailable",
        )
    log.info("Alarm %s acknowledged: %s", alarm_id, body.title)
    return AlarmAckResponse(
        success=True,
        message=f"Alarm {alarm_id} acknowledged in InfluxDB",
    )


@router.get("/ack", response_model=AlarmAckedListResponse)
async def get_acked_alarms():
    """Return all alarm IDs acknowledged in the last 24 hours (legacy)."""
    ids = fetch_acked_alarm_ids()
    return AlarmAckedListResponse(acked=ids)
