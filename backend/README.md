# Dairy Monitoring — Python FastAPI Backend (`backend/`)

> **Version 2.0** — Production-grade Python FastAPI backend.
> Connects to InfluxDB for time-series data, runs a linear regression
> prediction engine ("ghost line"), and includes an automatic simulation writer
> for offline development and standalone demos.

---

## Architecture

```
3× Siemens S7 PLCs (or Simulation Writer)
   └── Node-RED (port 1880)     ← S7 polling, tag normalisation
           └── InfluxDB (port 8086)  ← time-series storage
                   └── FastAPI (port 5000)  ← this service
                           ├── /api/v1/tags          → React frontend live data
                           ├── /api/v1/predictions   → AI Diagnostics ghost line
                           ├── /api/v1/alarms/ack    → alarm persistence
                           ├── /api/v1/reports       → batch/shift reports
                           └── /health               → connectivity status
```

## Project Structure

```
backend/
├── main.py                     # FastAPI app, CORS, global exception handler, lifespan
├── config.py                   # Pydantic settings loaded from .env
├── schemas.py                  # Pydantic v2 request/response models (all endpoints)
├── influx_client.py            # InfluxDB singleton client + Flux query helpers
├── nodered_client.py           # Node-RED HTTP health check + snapshot client
├── requirements.txt            # Pinned Python dependencies
├── .env.example                # Environment variable template — copy to .env
├── Dockerfile                  # Multi-stage ARM64 image for Radxa E52C / x86
├── routers/
│   ├── health.py               # GET  /health
│   ├── tags.py                 # POST /api/v1/tags
│   ├── alarms.py               # POST/GET /api/v1/alarms
│   ├── reports.py              # GET  /api/v1/reports
│   └── predictions.py          # GET  /api/v1/predictions
└── workers/
    ├── prediction_worker.py    # Background thread: linear regression engine
    └── sim_writer.py           # Background thread: automatic simulation data writer
```

## Quick Start (Linux / Radxa / Windows)

```bash
cd backend
python -m venv .venv
# Activate venv:
#   source .venv/bin/activate    (Linux/Mac)
#   .venv\Scripts\activate       (Windows)
pip install -r requirements.txt
cp .env.example .env            # edit with your InfluxDB token
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | API listen port |
| `INFLUX_URL` | `http://localhost:8086` | InfluxDB base URL |
| `INFLUX_TOKEN` | *(required)* | InfluxDB auth token |
| `INFLUX_ORG` | `plant_a` | InfluxDB organisation name |
| `INFLUX_BUCKET` | `plc_tags` | Primary data bucket |
| `NODERED_URL` | `http://localhost:1880` | Node-RED base URL |
| `NODERED_SNAPSHOT_PATH` | `/plc/snapshot` | Node-RED HTTP-in snapshot path |
| `PREDICTION_INTERVAL_SEC` | `10` | Prediction cycle cadence |
| `PREDICTION_LOOKBACK_SEC` | `60` | History window for regression |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Node-RED + InfluxDB connectivity |
| `POST` | `/api/v1/tags` | Latest tag values from InfluxDB |
| `POST` | `/api/v1/alarms` | Alarm status and historical event logging |
| `POST` | `/api/v1/alarms/ack` | Acknowledge an alarm |
| `GET` | `/api/v1/predictions` | Ghost-line prediction data |
| `GET` | `/api/v1/reports` | Batch and shift report generation |
| `GET` | `/docs` | Interactive Swagger UI |

## Docker (Radxa E52C / ARM64 & x86)

```bash
docker build --platform linux/arm64 -t dairy-backend-python .
docker run -p 5000:5000 --env-file .env dairy-backend-python
```

## Prediction & Simulation Engines

- **Prediction Worker (`workers/prediction_worker.py`)**: Runs as a daemon thread and queries InfluxDB for the last 60 s of sensor data. Fits a damped linear regression and writes 5-minute and 10-minute projections back to InfluxDB.
- **Simulation Writer (`workers/sim_writer.py`)**: Runs in the background and checks if real PLC telemetry has arrived. If offline, it automatically seeds InfluxDB with realistic, fluctuating values for all units, allowing the dashboard, analytics, and ghost-line predictions to function standalone.
