#!/usr/bin/env bash
# Mix voice + ducked music under the rendered video.
#   tools/assemble.sh episodes/<dir> out/video.mp4 out/final.mp4
set -euo pipefail
EP="$1"; VIDEO="$2"; OUT="$3"
mkdir -p "$(dirname "$OUT")"
ffmpeg -y -v error -i "$VIDEO" -i "$EP/voice.wav" -i "$EP/music.wav" -filter_complex "\
[1:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[vo][sc];\
[2:a]volume=0.62[mu];\
[mu][sc]sidechaincompress=threshold=0.025:ratio=7:attack=15:release=380:makeup=1[duck];\
[vo][duck]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v libx264 -preset medium -crf 21 -maxrate 14M -bufsize 28M -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration,size -of compact "$OUT"
