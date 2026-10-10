#!/usr/bin/env bash
# Render a SkyView promo spot end to end in Docker.
#
#   promo/build.sh site-14s                     # frames → audio → mp4, poster, web cut
#   promo/build.sh site-14s --stills 1.5,5,9    # a few frames + a contact sheet, for review
#   promo/build.sh site-14s --audio             # re-synth audio + remux
#   promo/build.sh site-14s --publish           # also copy the web cut + poster to showcase/media/
#
# Each spot is promo/<spot>/{spot.json, share-copy.txt}. hero-30s also holds the
# one compose.html and synth.py; the other spots set "base": "hero-30s" and list
# their own scenes. Output goes to promo/out/<spot>/ (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd -W 2>/dev/null || pwd)"   # Windows path under Git Bash

SPOT=""; MODE="full"; TIMES=""; PUBLISH=0
while [ $# -gt 0 ]; do
  case "$1" in
    --stills) [ $# -ge 2 ] || { echo "--stills needs a time list, e.g. 1.5,5"; exit 1; }
      MODE="stills"; TIMES="$2"; shift 2 ;;
    --audio) MODE="audio"; shift ;;
    --publish) PUBLISH=1; shift ;;
    -*) echo "unknown option $1"; exit 1 ;;
    *) SPOT="$1"; shift ;;
  esac
done
[[ "$SPOT" =~ ^[a-z0-9][a-z0-9-]*$ ]] && [ -f "promo/$SPOT/spot.json" ] || { echo "usage: promo/build.sh <spot> [--stills t,t|--audio] [--publish]"; exit 1; }

docker info >/dev/null 2>&1 || { echo "Docker Desktop isn't running."; exit 1; }
docker build -q -f promo/Dockerfile -t skyview-promo promo >/dev/null
mkdir -p "promo/out/$SPOT"
run() { MSYS_NO_PATHCONV=1 docker run --rm -v "$REPO:/repo:ro" -v "$REPO/promo/out:/out" skyview-promo "$@"; }

W="/out/$SPOT"
if [ "$MODE" = stills ]; then
  run node /repo/promo/render.cjs "$SPOT" "$TIMES"
  run sh /repo/promo/pipeline.sh sheet "$SPOT"
  echo "stills → promo/out/$SPOT/stills/, sheet → promo/out/$SPOT/sheet.jpg"; exit 0
fi
[ "$MODE" = full ] && run node /repo/promo/render.cjs "$SPOT"
run sh /repo/promo/pipeline.sh encode "$SPOT"
echo "done → promo/out/$SPOT/$SPOT.mp4"

if [ "$PUBLISH" = 1 ]; then
  cp "promo/out/$SPOT/$SPOT-web.mp4" "showcase/media/$SPOT.mp4"
  cp "promo/out/$SPOT/$SPOT.jpg" "showcase/media/$SPOT.jpg"
  echo "published → showcase/media/$SPOT.mp4, $SPOT.jpg"
fi
