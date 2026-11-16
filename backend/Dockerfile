# ---- Build Stage ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source and build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ---- Production Stage ----
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Configure shared directory for Playwright browser binaries
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

# Install wget/ca-certificates for health checks and Playwright system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and runtime directories
RUN groupadd -g 1001 appuser && \
    useradd -u 1001 -g appuser -s /bin/bash -m appuser && \
    mkdir -p /app/data /app/backups /app/screenshots /app/exports /ms-playwright

# Copy package files and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Install Chromium and exact OS-level system dependencies via Playwright CLI
RUN npx playwright install --with-deps chromium

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Copy .env.example as reference (actual .env provided at runtime)
COPY .env.example .env.example

# Ensure appuser owns runtime directories, app files, and Playwright browsers
RUN chown -R appuser:appuser /app /ms-playwright && \
    chmod -R 755 /ms-playwright

# Switch to non-root user
USER appuser

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "dist/app.js"]
