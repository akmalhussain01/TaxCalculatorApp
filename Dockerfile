# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package*.json ./

# Install all dependencies (including devDeps for Vite build)
RUN npm ci

# Copy source code
COPY . .

# Build the production bundle
RUN npm run build

# ─── Stage 2: Production Server ───────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets to nginx public directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
