#!/usr/bin/env bash
# Zasoby binarne, których nie trzymamy w repo: czcionki (OFL, przez npm) i HDRI studia (Poly Haven, CC0).
#   bash fetch_assets.sh   -> ./fonts/*.ttf, ./studio.hdr
set -uo pipefail
cd "$(dirname "$0")"; mkdir -p fonts; T=$(mktemp -d)
need="Unbounded_800ExtraBold Unbounded_500Medium Sora_700Bold Sora_600SemiBold"
for pkg in unbounded sora; do
  (cd "$T" && npm pack -s "@expo-google-fonts/$pkg" >/dev/null && tar xzf expo-google-fonts-$pkg-*.tgz && rm -f *.tgz && mv package "$pkg")
done
for f in $need; do p=$(find "$T" -name "$f.ttf" | head -1); [ -n "$p" ] && cp "$p" fonts/ && echo "font: $f" || echo "BRAK $f"; done
rm -rf "$T"
if [ ! -s studio.hdr ]; then
  for name in studio_small_09 studio_small_08; do
    curl -sSfL -m 120 -o studio.hdr "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${name}_1k.hdr" && head -c 10 studio.hdr | grep -q RADIANCE && { echo "hdri: $name"; break; }
  done
fi
ls -la fonts studio.hdr
