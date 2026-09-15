#!/bin/bash
# InfluxDB Initialization Script
# Runs automatically on first startup when DOCKER_INFLUXDB_INIT_MODE=setup

echo "[InfluxDB Init] Creating telemetry measurement schema..."

# Create the primary telemetry tags measurement
influx write \
  --org "$DOCKER_INFLUXDB_INIT_ORG" \
  --bucket "$DOCKER_INFLUXDB_INIT_BUCKET" \
  --token "$DOCKER_INFLUXDB_INIT_ADMIN_TOKEN" \
  'scada_tags,tag_name=%DB1.DBD204,system=pasteurizer _value=0.0'

echo "[InfluxDB Init] Schema initialized successfully."
echo "[InfluxDB Init] Bucket: $DOCKER_INFLUXDB_INIT_BUCKET"
echo "[InfluxDB Init] Org: $DOCKER_INFLUXDB_INIT_ORG"
