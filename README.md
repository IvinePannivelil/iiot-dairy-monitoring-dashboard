# 🥛 IIoT Dairy Monitoring Dashboard

An enterprise-grade Industrial IoT (IIoT) monitoring and predictive analytics dashboard, built on-site for a live dairy processing plant. It bridges factory-floor PLC automation with a modern real-time web dashboard, giving plant operators live visibility, predictive alerts, and historical analytics across the core production lines.

Built collaboratively on-site — including direct requirement-gathering sessions with the plant owner — by [Ivine Pannivelil](https://github.com/IvinePannivelil) and Rasal.

---

## ✨ Highlights

- **Real-time telemetry** across three core production units — Milk Reception, Pasteurizer, and Cleaning-In-Place (CIP)
- **Predictive diagnostics ("Ghost Line")** — a lightweight regression engine that projects key sensor trends 5–10 minutes into the future, warning operators before process excursions occur
- **Industrial alarm management** — persistent alarm history, severity classification, and operator acknowledgment workflows
- **Three operational modes** — Live PLC mode, Offline mode, and a built-in Simulation Engine for demos, training, and development without live hardware
- **Edge-ready deployment** — containerized with Docker, tuned to run on low-power ARM64 edge gateways as well as standard x86-64 hosts
- **In-dashboard virtual assistant** — a plant-specific chat assistant for troubleshooting and SOP guidance

---

## 🏗️ Architecture

A 4-tier decoupled edge architecture, from the plant floor to the browser:

```
┌────────────────────────────────────────────────────────────┐
│                      Siemens S7 PLCs                       │
│             Reception • Pasteurizer • CIP Unit             │
└──────────────────────────┬─────────────────────────────────┘
                           │ ISO-on-TCP (RFC 1006) / Port 102
                           ▼
┌────────────────────────────────────────────────────────────┐
│             Node-RED (Industrial PLC Bridge)               │
│   • S7 driver (DB variable tables)                         │
│   • Tag normalisation & type formatting                    │
│   • Batch pipeline directly into InfluxDB                  │
└──────────────────────────┬─────────────────────────────────┘
                           │ Line Protocol / HTTP API
                           ▼
┌────────────────────────────────────────────────────────────┐
│            InfluxDB 2.7 (Time-Series Historian)            │
│   • Buckets: telemetry, alarm events                       │
│   • Flux Query Engine for high-speed windowing & lookbacks │
└──────────────────────────┬─────────────────────────────────┘
                           │ Flux queries / Python Influx Client
                           ▼
┌────────────────────────────────────────────────────────────┐
│            FastAPI (Python 3.11 Backend Gateway)           │
│   • REST API (tags, alarms, predictions)                   │
│   • Background worker: windowed regression prediction engine │
│   • Pydantic v2 schemas & Swagger docs                     │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTP REST Polling
                           ▼
┌────────────────────────────────────────────────────────────┐
│             Frontend (React 19 + Vite + Nginx)             │
│   • Interactive SVG process schematics (P&ID-style mimics) │
│   • AI diagnostics & virtual operator assistant            │
│   • Multi-theme UI (Dark / Light / High-Contrast)          │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **PLC Communication** | Node-RED, node-red-contrib-s7 |
| **Historian & Database** | InfluxDB 2.7, Flux |
| **Backend API** | Python 3.11, FastAPI, Uvicorn, Pydantic v2, NumPy |
| **Prediction Engine** | Python worker, windowed regression / slope projection |
| **Frontend** | React 19, Vite, Nginx |
| **Data Visualization** | Chart.js 4, react-chartjs-2, Lucide Icons |
| **Virtual Assistant** | Custom in-app AI chat interface |
| **DevOps / Deployment** | Docker, Docker Compose, ARM64 edge gateway (Radxa E52C) |

---

## 📊 What It Monitors

- **Milk Reception** — tank levels, temperatures, agitator/pump status, flow meters
- **Pasteurizer** — critical thermal regulation, holding-tube temperatures, homogenizer interlocks, diversion valve state (auto-diverts on under-temperature)
- **CIP (Clean-In-Place)** — wash-line tracking across fresh water, caustic, acid, and hot water circuits, conductivity feedback, return pump matrix status

Includes shift/batch report generation (throughput, cycles completed, incident summaries) and full historical analytics with date-range filtering.

---

## 👥 Contributions

| Area | Built by |
|---|---|
| Dashboard Home (tank widgets, sparkline trends) | Ivine |
| Process mimic screens (Reception / Pasteurizer / CIP) | Ivine |
| Analytics & history charts | Ivine |
| Alarms UI | Ivine |
| Virtual assistant chat interface | Ivine |
| Interactive plant manual | Ivine |
| FastAPI backend (REST endpoints) | Ivine |
| Siemens S7 PLC tag mapping | Rasal |
| Node-RED S7 bridge setup | Rasal |
| InfluxDB schema design | Rasal |
| Docker Compose orchestration | Both |
| Edge deployment (ARM64 gateway) | Both |
| Simulation engine | Both |
| Reports / analytics backend | Both |
| Alarm management system | Both |
| Prediction worker ("Ghost Line" engine) | Both |

Both engineers worked on-site at the plant, running daily requirement-gathering sessions directly with the plant owner to shape the dashboard around real operational needs.

---

## 🚀 Running It

This repo ships with a full Simulation Mode — a built-in data generator that mimics authentic plant cycles, temperature ramps, and fluctuations, so you can run and explore the entire dashboard without any live PLC hardware.

```bash
docker-compose up
```

| Service | Port | Purpose |
|---|---|---|
| **Frontend Dashboard** | `3001` | Operator web interface |
| **Backend API** | `5000` | FastAPI REST + Swagger docs (`/docs`) |
| **Node-RED** | `1880` | Flow editor / PLC gateway |
| **InfluxDB** | `8086` | Time-series database + admin UI |

---

## 📌 Notes

This project was built for a real production dairy facility. Identifying details (client name, network configuration, tag addresses, and process thresholds) have been generalized in this public version. The architecture, prediction engine, and simulation mode faithfully represent the real system.
