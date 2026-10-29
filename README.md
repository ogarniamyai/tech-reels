# tech-reels

Daily Polish tech explainer reels in 3D, produced by a scheduled Claude task.

- `PIPELINE.md`: the playbook each daily run follows (research, duplicate check, script, voice, scene, render, delivery)
- `topics.json`: history of published topics, used to avoid repeating a concept
- `remotion/`: engine v2, Remotion + React Three Fiber. `src/engine/Stage.tsx` (studio light from an HDRI, reflective
  floor, shadows, ambient occlusion, depth of field, bloom, tone mapping), `Overlay.tsx` (headlines, karaoke subtitles,
  callouts, labels, CTA; no progress bar and no scene numbers by design), `kit.tsx` (materials and 3D building blocks),
  `core.ts` (beats, camera, scene contract)
- `tools/`: `render.js` (Remotion test frames and resumable chunked video render), `assets.sh` (downloads the CC0 HDRI),
  `tts.py` (ElevenLabs with timestamps, piper fallback), `music.py` (original procedural music + SFX),
  `assemble.sh` (ducked mix, loudness -14 LUFS), `topics.py` (dedupe), `fake_timeline.py` (test timings without TTS)
- `episodes/<date>-<slug>/`: `episode.json` (script in beats), `scene.tsx` (the 3D scene)
- `episodes/_example-nfc/`: reference scene for the engine (not a published episode)
- `engine/`: legacy v1 engine (plain Three.js), kept only for episodes made before 2026-10-30; not used by the pipeline

Audio, video and the HDRI are not committed; the finished MP4 is delivered to the owner, who publishes on Instagram by hand.
Remotion is free for individuals and companies of up to 3 people (see remotion.dev/license).
