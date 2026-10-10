#!/bin/sh
# Runs inside the promo image (see build.sh). /repo is the repo (read-only),
# /out is promo/out on the host.
#   pipeline.sh sheet <spot>    tile stills/*.png into sheet.jpg
#   pipeline.sh encode <spot>   audio → mp4, poster, web cut (frames must exist)
set -eu
MODE="$1"; SPOT="$2"; W="/out/$SPOT"

if [ "$MODE" = sheet ]; then
  cd "$W/stills"
  n=$(ls t*.png | wc -l); rows=$(( (n + 2) / 3 ))
  ffmpeg -hide_banner -loglevel error -y -pattern_type glob -i 't*.png' \
    -vf "scale=640:-1,tile=3x$rows:padding=6" -frames:v 1 -q:v 3 "$W/sheet.jpg"
  exit 0
fi

[ -d "$W/frames" ] || { echo "no frames yet; run without --audio first"; exit 1; }
M="$W/spot.merged.json"
node -e 'process.stdout.write(JSON.stringify(require("/repo/promo/spot-config.cjs")("/repo/promo", process.argv[1])))' "$SPOT" > "$M"
BASE=$(node -p 'require(process.argv[1]).base || process.argv[2]' "$M" "$SPOT")
FPS=$(node -p 'require(process.argv[1]).fps || 30' "$M")
N=$(node -p 'const s = require(process.argv[1]); Math.round(s.duration * (s.fps || 30))' "$M")
P=$(node -p 'const s = require(process.argv[1]); String(Math.round(s.poster * (s.fps || 30))).padStart(4, "0")' "$M")

python3 "/repo/promo/$BASE/synth.py" "$M" "$W/audio-raw.wav"
ffmpeg -hide_banner -loglevel error -y -i "$W/audio-raw.wav" \
  -af loudnorm=I=-14:TP=-1.5:LRA=11:linear=true -ar 44100 "$W/audio.wav"

# The poster frame doubles as frame 0 so every thumbnail shows it; replaced,
# not added, so duration and audio sync stay the same.
[ -f "$W/frames/f0000.orig.png" ] || cp "$W/frames/f0000.png" "$W/frames/f0000.orig.png"
cp "$W/frames/f$P.png" "$W/frames/f0000.png"
ffmpeg -hide_banner -loglevel error -y -framerate "$FPS" -i "$W/frames/f%04d.png" -i "$W/audio.wav" \
  -frames:v "$N" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest "$W/$SPOT.mp4"
ffmpeg -hide_banner -loglevel error -y -i "$W/frames/f$P.png" -q:v 2 "$W/$SPOT.jpg"
ffmpeg -hide_banner -loglevel error -y -i "$W/$SPOT.mp4" -c:v libx264 -preset slow -crf 27 \
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k "$W/$SPOT-web.mp4"
cp "/repo/promo/$SPOT/share-copy.txt" "$W/share-copy.txt"

# A truncated encode can still land within ±2 s of the target, so count frames.
GOT=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$W/$SPOT.mp4")
[ "$GOT" = "$N" ] || { echo "frame count $GOT, expected $N"; exit 1; }
echo "$SPOT: $GOT frames, web cut $(du -h "$W/$SPOT-web.mp4" | cut -f1)"
