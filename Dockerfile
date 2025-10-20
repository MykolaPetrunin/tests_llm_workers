# Multi-stage build for production
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Prisma client will be provided by the main project

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Copy built application
COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=deps --chown=fastify:nodejs /app/node_modules ./node_modules
# No prisma directory needed
COPY --from=builder --chown=fastify:nodejs /app/package.json ./package.json

USER fastify

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
