# ============================================
# MULTI-STAGE DOCKERFILE FOR ALL ENVIRONMENTS
# ============================================
# Targets: development, staging, production
# Usage:
#   Development: docker-compose -f docker-compose.dev.yml up
#   Staging:     docker-compose -f docker-compose.staging.yml up
#   Production:  docker-compose -f docker-compose.prod.yml up

# ============================================
# STAGE 1: Base - Common dependencies
# ============================================
FROM node:18-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml ./

# ============================================
# STAGE 2: Dependencies - Install all deps
# ============================================
FROM base AS dependencies

# Install ALL dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# ============================================
# STAGE 3: Development - Hot reload enabled
# ============================================
FROM dependencies AS development

ENV NODE_ENV=development

# Copy source code (volume mount overrides in docker-compose.dev.yml)
COPY . .

EXPOSE 3000

# Use tsx watch for hot reload
CMD ["pnpm", "run", "dev"]

# ============================================
# STAGE 4: Builder - Build TypeScript
# ============================================
FROM dependencies AS builder

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN pnpm build

# Verify build output
RUN ls -la dist/

# ============================================
# STAGE 5: Production Dependencies
# ============================================
FROM base AS production-deps

# Install ONLY production dependencies
RUN pnpm install --prod --frozen-lockfile

# ============================================
# STAGE 6: Staging - Production-like build
# ============================================
FROM node:18-alpine AS staging

RUN npm install -g pnpm

WORKDIR /app

ENV NODE_ENV=staging

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy production dependencies
COPY --from=production-deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Build metadata
ARG BUILD_DATE
ARG VERSION
ARG GIT_COMMIT

# OCI image labels
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.title="AI Assistant API - Staging"
LABEL environment="staging"

ENV BUILD_DATE=${BUILD_DATE}
ENV VERSION=${VERSION}
ENV GIT_COMMIT=${GIT_COMMIT}

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]

# ============================================
# STAGE 7: Production - Minimal & Secure
# ============================================
FROM node:18-alpine AS production

# Security: Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN npm install -g pnpm

WORKDIR /app

ENV NODE_ENV=production

# Copy with proper ownership
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml ./
COPY --chown=nodejs:nodejs --from=production-deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist

# Build metadata
ARG BUILD_DATE
ARG VERSION
ARG GIT_COMMIT

# OCI image labels
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.title="AI Assistant API - Production"
LABEL environment="production"

ENV BUILD_DATE=${BUILD_DATE}
ENV VERSION=${VERSION}
ENV GIT_COMMIT=${GIT_COMMIT}

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
