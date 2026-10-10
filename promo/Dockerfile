# Render image for SkyView promo spots: Chromium (Playwright) draws each frame of
# a spot's compose.html, numpy/scipy synthesize the music, ffmpeg encodes.
# No capture step: spots compose the CI screenshots in docs/screenshots and
# other real artifacts checked into the repo.
# Build from the repo root: docker build -f promo/Dockerfile -t skyview-promo promo
ARG PLAYWRIGHT_VERSION=1.63.0
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble
ARG PLAYWRIGHT_VERSION
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3-numpy python3-scipy fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /deps
RUN npm init -y >/dev/null \
 && npm install --no-save --ignore-scripts --no-audit --no-fund playwright@${PLAYWRIGHT_VERSION}
WORKDIR /repo
