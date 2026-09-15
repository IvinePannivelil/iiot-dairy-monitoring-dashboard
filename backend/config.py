"""
config.py — Centralised settings loaded from environment variables.
All modules import from here instead of reading os.environ directly.
Node-RED dependency fully removed.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    port: int = int(os.getenv("PORT", "5000"))

    # InfluxDB — all read from environment so iStore OS can override at runtime
    influx_url: str         = os.getenv("INFLUX_URL",         "http://localhost:8086")
    influx_token: str       = os.getenv("INFLUX_TOKEN",       "")
    influx_org: str         = os.getenv("INFLUX_ORG",         "PLANT_A")
    influx_bucket: str      = os.getenv("INFLUX_BUCKET",      "plc_tags")
    influx_measurement: str = os.getenv("INFLUX_MEASUREMENT", "machine_data")

    # Node-RED (kept for health check stub — no longer used for data)
    nodered_url: str            = os.getenv("NODERED_URL",           "http://localhost:1880")
    nodered_snapshot_path: str  = os.getenv("NODERED_SNAPSHOT_PATH", "/plc/snapshot")

    # Prediction worker
    prediction_interval_sec: int = int(os.getenv("PREDICTION_INTERVAL_SEC", "10"))
    prediction_lookback_sec: int = int(os.getenv("PREDICTION_LOOKBACK_SEC", "60"))



@lru_cache
def get_settings() -> Settings:
    return Settings()
