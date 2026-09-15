# ════════════════════════════════════════════════════════════════════════════
# Dairy Monitoring — Python Backend Dockerfile
# Target platform: linux/arm64 (Radxa E52C)
# Also builds correctly on linux/amd64 for local dev / CI
# ════════════════════════════════════════════════════════════════════════════
#
# MULTI-STAGE BUILD OVERVIEW
# ──────────────────────────
# Stage 1 (builder): Install all Python dependencies into a virtual environment.
#   Using a separate builder stage means the final image does NOT include pip,
#   build tools (gcc, make), or wheel caches — cutting image size by ~40%.
#
# Stage 2 (runtime): Copy only the compiled .venv and app source.
#   The resulting image is lean and has a minimal attack surface.
#
# WHY python:3.11-slim?
#   - slim = Debian base without docs / extra locale files (~50 MB saved vs full)
#   - 3.11 is the latest stable version supported by all dependencies
#   - ARM64 images are available natively on Docker Hub for this tag
#
# BUILD COMMAND (local):
#   docker build --platform linux/arm64 -t dairy-backend-python .
#
# RUN COMMAND (local):
#   docker run -p 5000:5000 --env-file .env dairy-backend-python
# ════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build dependencies ───────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Set working directory inside the build container
WORKDIR /build

# Copy requirements first — Docker layer caching means pip install only
# re-runs when requirements.txt changes, not on every code change.
COPY requirements.txt .

# Create a virtual environment in /build/.venv
# Using a venv inside Docker is best practice: keeps system Python clean
# and makes it trivial to copy the entire env into the runtime stage.
RUN python -m venv .venv \
    && .venv/bin/pip install --upgrade pip --no-cache-dir \
    && .venv/bin/pip install -r requirements.txt --no-cache-dir


# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# ── Security: run as non-root user ───────────────────────────────────────────
# Running as root inside a container is a security anti-pattern.
# We create a dedicated `appuser` with no login shell or home directory.
RUN useradd --no-create-home --shell /bin/false appuser

WORKDIR /app

# Copy the pre-built virtual environment from the builder stage
COPY --from=builder /build/.venv /app/.venv

# Copy all application source files
COPY . .

# Make sure the appuser owns the working directory
RUN chown -R appuser:appuser /app

# Switch to non-root user for the runtime
USER appuser

# ── Environment: ensure the venv Python is used ──────────────────────────────
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
#   PYTHONDONTWRITEBYTECODE=1 → don't create .pyc files (saves disk I/O)
#   PYTHONUNBUFFERED=1        → ensures print() and log output reaches Docker logs immediately

# Expose the API port (must match PORT in .env and the React frontend config)
EXPOSE 5000

# ── Healthcheck ───────────────────────────────────────────────────────────────
# Docker will restart the container if this check fails 3 times in a row.
# Interval 30s → checks every 30s; timeout 5s → kills if API hangs.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" \
    || exit 1

# ── Startup command ───────────────────────────────────────────────────────────
# We use uvicorn directly (not the `python main.py` shortcut) because:
#   - uvicorn's signal handling is better in containers (handles SIGTERM cleanly)
#   - --workers 1 is correct for the Radxa E52C (single-core edge gateway monitoring use case)
#   - do NOT use --reload in production — it adds file-watch overhead
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "1"]

