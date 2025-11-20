# Client Dockerfile for Local Development
# Note: Vercel does NOT use Docker - it has its own build system
# This Dockerfile is for local development and testing only

FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files from client directory
COPY client/package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy client source code
COPY client/ .

# Build Vite application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
