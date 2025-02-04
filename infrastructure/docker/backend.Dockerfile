# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build essentials
RUN apk add --no-cache python3 make g++ curl

# Set working directory
WORKDIR /app

# Copy package files for layer caching
COPY src/backend/package*.json ./
COPY src/backend/tsconfig.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY src/backend/src ./src

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 nodeapp && \
    adduser -u 1001 -G nodeapp -s /bin/sh -D nodeapp

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set correct ownership and permissions
RUN chown -R nodeapp:nodeapp /app && \
    chmod -R 550 /app/dist && \
    chmod -R 550 /app/node_modules

# Configure environment
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=4096"

# Set resource limits
ENV MEMORY_LIMIT="8G" \
    CPU_LIMIT="4"

# Expose service port
EXPOSE 3000

# Switch to non-root user
USER nodeapp

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Add metadata labels
LABEL maintainer="Task Management System Team" \
      description="Backend microservices for Task Management System" \
      version="1.0.0" \
      build-date=${BUILD_DATE} \
      vcs-ref=${VCS_REF} \
      vendor="Task Management System"

# Set security options
SECURITY_OPT="no-new-privileges:true"

# Set read-only filesystem
VOLUME ["/app/node_modules", "/app/dist"]

# Configure ulimits
ULIMIT nofile=1000
ULIMIT nproc=50

# Start application
CMD ["node", "dist/server.js"]