# ---- Build stage --------------------------------------------------------
# Runs the same build scripts/build.js uses on Netlify, so the Docker image
# and the production deploy serve identical output — including the
# marketplace platform SPA at /app, which previously was never built or
# copied into this image (it only ran on Netlify's own build).
FROM node:22-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN node scripts/build.js

# ---- Serve stage ----------------------------------------------------------
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

COPY config/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist ./

# Expose port 80
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
