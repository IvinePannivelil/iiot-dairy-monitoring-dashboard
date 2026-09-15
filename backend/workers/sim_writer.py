"""
workers/sim_writer.py — Simulation Data Writer
═══════════════════════════════════════════════════════════════════════════════

Runs as a daemon background thread. Periodically checks whether real PLC
data has arrived in InfluxDB. If NOT (i.e. physical PLCs are offline or in
demo/simulation mode), it automatically generates realistic simulated values
for all monitored plant tags and writes them directly to InfluxDB.

This ensures:
  - Charts always have history to display (survive page refresh)
  - Reports always have batch data to query and export
  - AI Diagnostics sparklines always have seeded trends and ghost-line projections
  - Demos run completely standalone with zero hardware dependencies

The writer is self-healing: if real PLC data starts arriving, the gap
detection detects it and pauses the simulation writer.
"""
from __future__ import annotations

import logging
import random
import threading
import time
from datetime import datetime, timezone
from influxdb_client import Point

log = logging.getLogger("dairy.sim_writer")

# Simulated realistic operating ranges (anonymized standard dairy values)
SIM_TAGS: dict[str, tuple[float, float]] = {
    # ── Pasteurizer Temperatures & Flow ──────────────────────────────
    "AI1": (11.0, 13.5),       # Product Inlet (°C)
    "AI2": (60.0, 64.0),       # Homogenizer Inlet (°C)
    "AI3": (73.0, 75.0),       # Holding Inlet (°C)
    "AI4": (75.0, 77.5),       # Holding Outlet (°C)
    "AI5": (8.0, 9.5),         # Product Outlet (°C)
    "AI6": (81.0, 83.5),       # Main Hot Water (°C)
    "AI7": (67.0, 70.0),       # Pre Hot Water (°C)
    "AI8": (1.5, 2.5),         # Chilled Water Inlet (°C)
    "AI9": (4800.0, 5200.0),   # Past Flow (LPH)

    # Alternate IEC addresses mapped in historical systems
    "%DB1.DBD204": (11.0, 13.5),
    "%DB1.DBD208": (60.0, 64.0),
    "%DB1.DBD212": (73.0, 75.0),
    "%DB1.DBD216": (75.0, 77.5),
    "%DB1.DBD220": (8.0, 9.5),
    "%DB1.DBD224": (81.0, 83.5),
    "%DB1.DBD228": (67.0, 70.0),
    "%DB1.DBD232": (1.5, 2.5),
    "%DB1.DBD252": (4800.0, 5200.0),

    # ── CIP System Sensors ───────────────────────────────────────────
    "CT2": (76.0, 79.0),       # Caustic Supply Temp (°C)
    "CT3": (70.0, 73.0),       # Acid Supply Temp (°C)
    "CT4": (62.0, 65.0),       # Intermediate Rinse Temp (°C)
    "CT5": (73.0, 76.0),       # Return Temp (°C)
    "CT6": (66.0, 69.0),       # Final Rinse Temp (°C)
    "CF1": (8200.0, 8800.0),   # CIP Supply Flow (LPH)
    "CC1": (0.38, 0.44),       # Conductivity (mS/cm)

    "%DB12.DBD4": (76.0, 79.0),
    "%DB13.DBD4": (70.0, 73.0),
    "%DB14.DBD4": (62.0, 65.0),
    "%DB15.DBD4": (73.0, 76.0),
    "%DB16.DBD4": (66.0, 69.0),
    "%DB17.DBD4": (8200.0, 8800.0),
    "%DB18.DBD4": (0.38, 0.44),

    # ── Reception System Sensors ─────────────────────────────────────
    "TT1": (7.5, 8.8),         # Reception Raw Milk Inlet Temp (°C)
    "TT2": (7.0, 8.2),         # Deaerator Temp (°C)
    "TT3": (6.5, 7.8),         # Chilled Water Outlet Temp (°C)
    "TT4": (5.0, 6.0),         # Cream Outlet Temp (°C)
    "TT5": (4.5, 5.5),         # Skim Outlet Temp (°C)
    "TT6": (4.0, 5.0),         # Silo Inlet Temp (°C)
    "TT7": (3.8, 4.8),         # Chilled Water Return Temp (°C)
    "FM1": (11500.0, 12500.0), # Reception Flow Rate (LPH)
    "FM2": (4200.0, 4800.0),   # Cream Flow Rate (LPH)
    "TOT_RECEPTION": (32400.0, 32800.0),
    "TOT_WATER_FLUSH": (140.0, 150.0),
    "RCM_TEMP": (5.0, 5.4),
    "RMST_TEMP": (4.8, 5.1),

    "%DB3.DBD10": (7.5, 8.8),
    "%DB3.DBD18": (51.0, 53.0),
    "%DB3.DBD26": (47.0, 49.0),
    "%DB3.DBD34": (44.0, 46.0),
    "%DB3.DBD42": (43.0, 45.0),
    "%DB3.DBD50": (45.0, 47.0),
    "%DB3.DBD58": (43.5, 45.5),
    "%DB3.DBD66": (41.0, 43.0),
}

# Digital states to maintain
SIM_DIGITALS: dict[str, int] = {
    "RCM_HIGH": 1,
    "RCM_LOW": 1,
    "RMST_HIGH": 0,
    "RMST_LOW": 1,
    "unloadTankRCM": 1,
    "unloadTankRMST": 0,
    "destRcmTank": 1,
    "destRmstTank": 0,
    "FEED_PUMP": 1,
    "BOOST_PUMP": 1,
    "HOMO_START": 1,
    "SV1": 1,
    "SV3": 1,
    "SV6": 1,
    "SV7": 1,
    "SV9": 1,
    "HW_HIGH": 1,
    "HW_LOW": 1,
    "LYE_HIGH": 1,
    "LYE_LOW": 1,
    "ACID_HIGH": 1,
    "ACID_LOW": 1,
    "Sup_Pump": 1,
    "Ret_P1": 1,
    "CIP_ALM_W0": 0,
    "CIP_ALM_W1": 0,
}

_current: dict[str, float] = {}


def _rand_walk(current_val: float, lo: float, hi: float, step: float = 0.02) -> float:
    """Small random walk clamped to [lo, hi] for natural-looking trends."""
    delta = (random.random() - 0.48) * (hi - lo) * step
    new_val = current_val + delta
    return max(lo, min(hi, new_val))


def _has_recent_plc_data(query_api, org: str, bucket: str, window_sec: int = 90) -> bool:
    """Return True if real PLC/Node-RED data has arrived in the last window_sec seconds."""
    flux = f'''
from(bucket: "{bucket}")
  |> range(start: -{window_sec}s)
  |> filter(fn: (r) => r["_measurement"] == "machine_data" or r["_measurement"] == "scada_tags")
  |> first()
  |> limit(n: 5)
'''
    try:
        tables = query_api.query(flux, org=org)
        for table in tables:
            for record in table.records:
                if record.values.get("source") != "simulation":
                    return True
        return False
    except Exception as exc:
        log.debug("Sim writer: PLC activity check failed: %s", exc)
        return False


def _write_sim_tick(write_api, org: str, bucket: str):
    """Generate one tick of simulated values and write to InfluxDB."""
    now = datetime.now(timezone.utc)
    points = []

    # Process analog tags with smooth random walk
    for tag, (lo, hi) in SIM_TAGS.items():
        curr = _current.get(tag, (lo + hi) / 2)
        new_val = _rand_walk(curr, lo, hi)
        _current[tag] = new_val

        # Write to machine_data (standard)
        p1 = (
            Point("machine_data")
            .tag("source", "simulation")
            .field(tag, float(round(new_val, 2)))
            .time(now)
        )
        points.append(p1)

        # Also write to scada_tags measurement format for backward compatibility
        p2 = (
            Point("scada_tags")
            .tag("tag_name", tag)
            .tag("source", "simulation")
            .field("value", float(round(new_val, 2)))
            .time(now)
        )
        points.append(p2)

    # Process digital status bits
    for tag, val in SIM_DIGITALS.items():
        p1 = (
            Point("machine_data")
            .tag("source", "simulation")
            .field(tag, int(val))
            .time(now)
        )
        points.append(p1)

        p2 = (
            Point("scada_tags")
            .tag("tag_name", tag)
            .tag("source", "simulation")
            .field("value", int(val))
            .time(now)
        )
        points.append(p2)

    try:
        write_api.write(bucket=bucket, org=org, record=points)
        log.debug("Sim writer: wrote %d tags to InfluxDB", len(points))
    except Exception as exc:
        log.warning("Sim writer: InfluxDB write failed — %s", exc)


def _run_sim_writer(interval_sec: int):
    """Main loop — runs forever as a daemon thread."""
    from influx_client import _query_api, _write_api, cfg

    log.info("Simulation writer thread started (interval=%ds)", interval_sec)

    # Initialise current midpoint states
    for tag, (lo, hi) in SIM_TAGS.items():
        _current[tag] = (lo + hi) / 2

    while True:
        try:
            if _has_recent_plc_data(_query_api, cfg.influx_org, cfg.influx_bucket):
                log.debug("Sim writer: real PLC data detected — skipping sim tick")
            else:
                _write_sim_tick(_write_api, cfg.influx_org, cfg.influx_bucket)
        except Exception as exc:
            log.error("Sim writer loop error: %s", exc)

        time.sleep(interval_sec)


def start_sim_writer_thread(interval_sec: int = 10):
    """Start the simulation writer as a background daemon thread."""
    t = threading.Thread(
        target=_run_sim_writer,
        args=(interval_sec,),
        name="sim-writer",
        daemon=True,
    )
    t.start()
    log.info("Simulation writer daemon thread launched.")
