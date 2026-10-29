#!/usr/bin/env bash
# Pobiera zasoby, których nie trzymamy w repo (pliki binarne):
#   remotion/public/hdri/studio.hdr  mapa HDRI studia z Poly Haven (licencja CC0)
# Bez HDRI silnik działa dalej (same lightformery), tylko odbicia są mniej naturalne.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p remotion/public/hdri
OUT=remotion/public/hdri/studio.hdr
if [ -s "$OUT" ]; then echo "hdri: already present"; exit 0; fi
for name in studio_small_09 studio_small_08 brown_photostudio_02; do
  if curl -sSfL -m 120 -o "$OUT.tmp" "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${name}_1k.hdr" \
     && head -c 10 "$OUT.tmp" | grep -q "#?RADIANCE"; then
    mv "$OUT.tmp" "$OUT"; echo "hdri: $name ($(du -h "$OUT" | cut -f1))"; exit 0
  fi
done
rm -f "$OUT.tmp"
echo "hdri: WARNING download failed, rendering without HDRI (lightformers only)"
exit 0
