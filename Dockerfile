# Use a lightweight Nginx image to serve the static site
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copy only the assets required to serve the site.
COPY index.html ./
COPY client-gallery.html ./
COPY client-portal.html ./
COPY privacy.html ./
COPY thank-you.html ./
COPY robots.txt ./
COPY sitemap.xml ./
COPY config.js ./
COPY admin ./admin
COPY assets ./assets
COPY scripts ./scripts
COPY styles ./styles

# Expose port 80
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]