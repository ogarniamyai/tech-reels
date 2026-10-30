#!/usr/bin/env bash
# Finał rolki: korekcja (punkt czerni, kontrast, winieta) + napisy + miks audio.
#   finish.sh <katalog_odcinka> <render.mp4> <wyjście.mp4>
# Wymaga w katalogu: captions.mov, voice.wav, music.wav
set -euo pipefail
EP="$1"; IN="$2"; OUT="$3"; HERE="$(cd "$(dirname "$0")" && pwd)"
GRADE="${GRADE:-curves=all='0/0 0.12/0 0.3/0.21 0.55/0.53 0.85/0.88 1/1',eq=saturation=1.12,vignette=angle=PI/5}"
ffmpeg -y -v error -i "$IN" -i "$EP/captions.mov" -filter_complex "[0:v]$GRADE[g];[g][1:v]overlay=0:0:format=auto[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p "$EP/graded.mp4"
A="$HERE/assemble.sh"; [ -f "$A" ] || A="$HERE/../tools/assemble.sh"
bash "$A" "$EP" "$EP/graded.mp4" "$OUT"
