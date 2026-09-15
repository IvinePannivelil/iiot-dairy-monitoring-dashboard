"""
main.py — Dairy Edge Gateway API
════════════════════════════════════════════════════════════════════════════════

OVERVIEW
--------
This is the entry point for the Dairy Edge Gateway API.
It is a production-grade FastAPI service designed to bridge industrial
PLC automation, InfluxDB time-series storage, and the React monitoring dashboard:

  • FastAPI — async-native, auto OpenAPI documentation at /docs
  • Pydantic v2 schemas — strict request/response validation
  • InfluxDB as the single source of truth for plant telemetry
  • Node-RED handles physical PLC polling and writes to InfluxDB
  • Lightweight linear regression prediction engine running in the background
  • Built-in simulation daemon writer for offline demos and development

SYSTEM ARCHITECTURE
-------------------
  ┌─────────────────┐       S7 TCP/102       ┌──────────────────────┐
  │  Siemens S7 PLC │ ◄────────────────────► │  Node-RED (port 1880)│
  │  (Plant Units)  │                         │  - Polls PLC tags    │
  └─────────────────┘                         │  - Writes InfluxDB   │
                                              └──────────┬───────────┘
                                                         │ writes
                                                         ▼
                                              ┌──────────────────────┐
                                              │  InfluxDB (port 8086)│
                                              │  Bucket: plc_tags    │
                                              │  Measurement:        │
                                              │    machine_data      │
                                              └──────────┬───────────┘
                                                         │ reads (Flux)
                                         ┌───────────────┼───────────────┐
                                         ▼               ▼               ▼
                              ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐
                              │ FastAPI      │  │ Prediction  │  │ FastAPI          │
                              │ /api/v1/tags │  │ Worker      │  │ /api/v1/         │
                              │ /health      │  │ (thread)    │  │ predictions      │
                              │ /alarms/ack  │  │             │  │ alarms/ack       │
                              └──────────────┘  └─────────────┘  └──────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ React Frontend       │
                              │ (Vite dev / nginx)   │
                              │ port 3001 (prod)     │
                              └──────────────────────┘

PORT NOTES
----------
  - This API runs on port 5000 (same as the old Node.js backend).
    The React frontend's VITE_API_URL points to http://localhost:5000.
    Changing this port would require updating the frontend .env.

ENDPOINTS
---------
  GET  /health                 → Node-RED + InfluxDB connectivity status
  POST /api/v1/tags            → Fetch latest live values from InfluxDB
  POST /api/v1/alarms/ack      → Persist an alarm acknowledgement
  GET  /api/v1/alarms/ack      → Fetch acknowledged alarm IDs (last 24 h)
  GET  /api/v1/predictions     → Latest ghost-line projection data
  GET  /docs                   → Interactive Swagger UI (auto-generated)
  GET  /redoc                  → ReDoc alternative API docs

RUNNING LOCALLY
---------------
  # 1. Create and activate a virtual environment
  python -m venv .venv
  .venv\\Scripts\\activate          # Windows
  source .venv/bin/activate       # Linux / Radxa

  # 2. Install dependencies
  pip install -r requirements.txt

  # 3. Copy and edit environment config
  copy .env.example .env          # Windows
  cp .env.example .env            # Linux / Radxa

  # 4. Start the server (dev mode with auto-reload)
  uvicorn main:app --host 0.0.0.0 --port 5000 --reload

  # 5. Open http://localhost:5000/docs in Chrome to verify all endpoints

DEPLOYMENT
----------
  docker build -t dairy-backend-python .
  docker run -p 5000:5000 --env-file .env dairy-backend-python
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import all route modules — each file handles one logical domain
from routers import alarms, health, predictions, tags, reports

# Import the background workers
from workers.prediction_worker import start_prediction_worker_thread
from workers.sim_writer import start_sim_writer_thread

from config import get_settings

# ── Logging configuration ─────────────────────────────────────────────────────
# We configure the root logger to stdout so Docker / systemd can capture it.
# In production on the Radxa, increase the level to WARNING to reduce noise.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("dairy.main")

cfg = get_settings()


# ── Application lifespan (startup / shutdown hooks) ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.

    Code BEFORE ``yield`` runs at startup:
      - Starts prediction worker thread
      - Starts simulation writer thread (ensures demo works with zero PLCs)
      - Logs the boot summary

    Code AFTER ``yield`` runs at shutdown.
    """
    # ── Startup ──────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("  Dairy Edge Gateway API — Starting Up")
    log.info("  Port        : %d", cfg.port)
    log.info("  InfluxDB    : %s", cfg.influx_url)
    log.info("  Bucket      : %s", cfg.influx_bucket)
    log.info("  Measurement : %s", cfg.influx_measurement)
    log.info("=" * 60)

    # Start the linear regression prediction engine in the background.
    start_prediction_worker_thread()

    # Start the standalone simulation writer (auto-seeds InfluxDB when PLCs offline).
    start_sim_writer_thread(interval_sec=10)

    yield   # ← FastAPI serves requests between startup and shutdown

    # ── Shutdown ─────────────────────────────────────────────────────────────
    # The prediction worker is a daemon thread — Python kills it automatically.
    # If we had non-daemon resources (e.g. a DB connection pool) we'd close them here.
    log.info("[Dairy Backend] Shutdown complete.")


# ── FastAPI app instance ──────────────────────────────────────────────────────
app = FastAPI(
    title="Dairy Edge Gateway API",
    description=(
        "Python FastAPI backend for the IIoT Dairy Monitoring Dashboard. "
        "Bridges PLC telemetry → InfluxDB → React frontend. "
        "Includes a built-in linear regression prediction engine for the "
        "AI Diagnostics ghost-line feature and an automatic simulation writer."
    ),
    version="2.0.0",
    lifespan=lifespan,
    # Disable the default /openapi.json redirect to keep the root URL clean
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── CORS Middleware ───────────────────────────────────────────────────────────
# Allow the React dev server (port 5173) and any production origin.
# In production, restrict allow_origins to your actual domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production: ["http://192.168.x.x:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler.

    If any unhandled exception escapes a route handler, we return a structured
    JSON error instead of a raw 500 HTML page. This prevents the React frontend
    from trying to parse HTML as JSON and crashing its error boundary.

    The ``quality: "bad"`` field matches the TagValue schema so the frontend
    can display a sensor-offline indicator rather than an uncaught exception.
    """
    log.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={
            "error":   "Service temporarily unavailable",
            "detail":  str(exc),
            "quality": "bad",       # matches TagValue schema for frontend compatibility
            "path":    str(request.url.path),
        },
    )


# ── Route registration ────────────────────────────────────────────────────────
# Each router module (routers/*.py) owns one logical domain.
# The prefix is defined in the router file so the module is self-contained.

app.include_router(health.router)           # GET  /health
app.include_router(tags.router)             # POST /api/v1/tags
app.include_router(alarms.router)           # POST /api/v1/alarms/ack  +  GET /api/v1/alarms/ack
app.include_router(predictions.router)      # GET  /api/v1/predictions
app.include_router(reports.router)          # GET  /api/v1/reports


# ── Root route ────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"], include_in_schema=False)
async def root():
    """
    Simple alive check — useful for curl/ping tests.
    The /health endpoint provides the full connectivity status.
    """
    return {
        "message": "Dairy Python Edge Gateway is running",
        "docs":    "/docs",
        "health":  "/health",
    }


# ── Direct execution entry point ──────────────────────────────────────────────
# This block only runs when you call `python main.py` directly.
# In production and Docker, use `uvicorn main:app` instead.
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=cfg.port,
        reload=True,        # Auto-reload on file changes — disable in production
        log_level="info",
    )
