# ════════════════════════════════════════════════════════════════════════════
# IIoT Dairy Monitoring — Node-RED PLC Bridge Dockerfile
# Target platform: linux/arm64 (Radxa E52C) + linux/amd64
# ════════════════════════════════════════════════════════════════════════════
#
# This extends the official Node-RED image to pre-install the Siemens S7
# community node so the PLC bridge works immediately on first boot.
#
# WHY a custom image?
#   The official nodered/node-red image does not include node-red-contrib-s7.
#   Mounting ./nodered as /data and relying on a manual install is fragile
#   and breaks on every fresh container start. Building it into the image
#   means the node is always available, even if /data is a fresh volume.
# ════════════════════════════════════════════════════════════════════════════

FROM nodered/node-red:latest

# Install the Siemens S7 PLC communication node
# node-red-contrib-s7: ISO-on-TCP (port 102) driver for Siemens S7-300/400/1200/1500
RUN npm install --unsafe-perm --no-update-notifier \
    node-red-contrib-s7@3.0.0 \
    node-red-contrib-influxdb@0.7.0

# Copy our pre-configured flows and settings
# These are bind-mounted at runtime via docker-compose volumes,
# but we include them in the image as a safe fallback default.
COPY flows.json      /data/flows.json
COPY settings.js     /data/settings.js
COPY package.json    /data/package.json

# Node-RED listens on 1880
EXPOSE 1880

# Healthcheck: verify Node-RED admin UI is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:1880/ || exit 1
