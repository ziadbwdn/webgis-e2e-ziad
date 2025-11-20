# Server Dockerfile for Railway Deployment
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files from server directory
COPY server/package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy server source code
COPY server/ .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled code from build stage
COPY --from=build /app/dist ./dist

# Expose port (Railway will provide PORT via env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
