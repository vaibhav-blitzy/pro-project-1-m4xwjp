# Stage 1: Build stage
FROM node:20-alpine AS builder
LABEL stage=builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY src/web/package*.json ./

# Install dependencies with exact versions and only production
RUN npm ci --only=production

# Copy application source and configuration
COPY src/web/ ./

# Build optimized production bundle
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=production
RUN npm run build

# Clean up build artifacts
RUN npm prune --production

# Stage 2: Production stage
FROM nginx:1.25-alpine
LABEL maintainer="Task Management System Team"

# Install required packages
RUN apk add --no-cache curl

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with security headers
RUN mkdir -p /etc/nginx/templates
COPY infrastructure/docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Set up non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Configure file permissions
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx && \
    chmod -R 755 /var/log/nginx && \
    chmod -R 755 /etc/nginx/conf.d

# Create required directories with correct permissions
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    mkdir -p /var/cache/nginx/fastcgi_temp && \
    mkdir -p /var/cache/nginx/uwsgi_temp && \
    mkdir -p /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx

# Security configurations
USER nginx
WORKDIR /usr/share/nginx/html

# Set security options
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
ENV NGINX_WORKER_PROCESSES=auto

# Expose port
EXPOSE 80

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:80/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Security labels
LABEL org.opencontainers.image.source="https://github.com/organization/task-management-system"
LABEL org.opencontainers.image.description="Task Management System Frontend"
LABEL org.opencontainers.image.licenses="MIT"
LABEL security.protocol="strict"
LABEL security.capabilities="none"
LABEL security.read-only="true"