# tech-reels

Daily English tech explainer reels in 3D, produced by a scheduled Claude task.

- `PIPELINE.md`: the playbook each daily run follows (research, duplicate check, script, voice, scene, render, delivery)
- `topics.json`: history of published topics, used to avoid repeating a concept
- `engine/`: deterministic Three.js renderer (beat-driven timeline, subtitles, callouts, shared visual style)
- `tools/`: `render.js` (Chromium frames to MP4), `tts.py` (ElevenLabs with timestamps, piper fallback),
  `music.py` (original procedural music + SFX), `assemble.sh` (ducked mix, loudness -14 LUFS), `topics.py` (dedupe)
- `episodes/<date>-<slug>/`: `episode.json` (script in beats), `scene.js` (the 3D scene), `timeline.json` (voice timings)

Audio and video files are not committed; the finished MP4 is delivered to the owner, who publishes on Instagram by hand.
