# net4.xyz Frontend Dockerfile
# Multi-stage build for development and production

# ===================
# Base Stage
# ===================
FROM node:18-alpine AS base

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# ===================
# Development Stage
# ===================
FROM base AS development

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["pnpm", "run", "dev"]

# ===================
# Build Stage
# ===================
FROM base AS builder

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_IPFS_GATEWAY=http://localhost:8080/ipfs/
ENV NEXT_PUBLIC_HARDHAT_RPC_URL=http://localhost:8545

# Build the application
RUN pnpm run build

# ===================
# Production Stage
# ===================
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/next-env.d.ts ./

# Copy required static files
COPY --from=builder /app/.next/static ./.next/static

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["pnpm", "run", "start"]