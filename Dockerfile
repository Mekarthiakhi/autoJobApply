# ==============================================================
# AutoJobApply Unified Production Dockerfile (Railway & Cloud VPS)
# Builds both Frontend React SPA and Backend Express + Playwright
# ==============================================================

# ---- Stage 1: Build Frontend ----
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---- Stage 2: Build Backend ----
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npx tsc

# ---- Stage 3: Production Runtime ----
FROM node:20-bookworm-slim AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV DB_PATH=/app/data/jobs.db

# Install system dependencies for Playwright Chromium, wget, and certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root application user and required runtime folders
RUN groupadd -g 1001 appuser && \
    useradd -u 1001 -g appuser -s /bin/bash -m appuser && \
    mkdir -p /app/data /app/backups /app/screenshots /app/exports /app/public /ms-playwright

# Copy backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Install Playwright Chromium with exact OS libraries
RUN npx playwright install --with-deps chromium

# Copy compiled backend JavaScript
COPY --from=backend-builder /app/backend/dist ./dist

# Copy compiled frontend static assets for unified zero-CORS serving
COPY --from=frontend-builder /app/frontend/dist ./public

# Set non-root permissions
RUN chown -R appuser:appuser /app /ms-playwright && \
    chmod -R 755 /ms-playwright

USER appuser

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-5000}/health || exit 1

# Start unified server
CMD ["node", "dist/app.js"]
