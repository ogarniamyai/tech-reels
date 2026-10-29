# Daily reel playbook (engine v2: Remotion)

One run = one finished **Polish-language** reel (1080x1920, 30 fps, 35 to 48 s) that explains how an everyday technology works,
shown with an original 3D animation rendered by **Remotion + React Three Fiber**, a Polish voice-over, word-by-word
subtitles and a music bed. The finished MP4 plus the Polish Instagram caption are sent to the owner, who publishes by hand.

Everything the viewer sees or hears is in Polish: voice-over, headlines, tags, callouts, labels, CTA, caption.
Research can use English sources. Keep `title`, `concept` and `keywords` in
`episode.json` / `topics.json` in **English** so the duplicate checker keeps working across all episodes.

Follow the steps in order. Do not skip the duplicate check or the visual QA.

## Look and hard rules

- Dark premium studio look: near-black background, glossy and metallic objects, neon accents that glow (bloom),
  real reflections from an HDRI studio map, a reflective floor, soft shadows, ambient occlusion, depth of field,
  real refractive glass where it helps, subtle film grain and vignette. The engine (`remotion/src/engine`) does
  all of this automatically; the scene only builds objects and animation.
- **Never add a progress bar, step bar, timeline bar or any "x of y" indicator** anywhere on screen.
- **Never number the scenes**: no "01", "02", "1/6", "KROK 1", "#3" in tags, headlines, callouts or labels.
  Tags are 1 to 3 plain words.
- Original visuals only: no real logos, brand names, product replicas, mascots or characters.
- Keep 3D content between y ~600 and ~1380 on screen. Headlines own the top (from y 250), subtitles sit at
  y ~1395-1520, Instagram UI covers the bottom ~400 px and the top ~200 px.

## 0. Setup (fresh container every run)

```bash
# the repo files were fetched into ./tech-reels with the GitHub connector (see the scheduled task prompt)
cd tech-reels && mkdir -p out
npm install --silent                    # Remotion, three, R3F, drei, postprocessing, fonts (pinned)
bash tools/assets.sh                    # downloads the CC0 studio HDRI into remotion/public/hdri (not in git)
pip install --break-system-packages -q scipy piper-tts   # scipy for music, piper = fallback voice
```
Remotion downloads its own headless Chrome on first render (about 100 MB, once per container). `ffmpeg` is preinstalled.
If `tools/assets.sh` prints a WARNING the render still works (lightformers only); mention it in the final message.

## 1. Pick ONE everyday topic and research it

The channel explains **everyday technology people use without thinking about how it works**: things in the pocket,
at home, in the car, in the street. It is NOT a tech news channel: do not pick product launches, research
breakthroughs, company news or rumours. The question is always "how does X actually work?" for something the viewer
used today or this week, explained clearly with a 3D animation of the mechanism.

Idea pool (examples, not a fixed list; any everyday device or system with a visual mechanism is welcome):
- phone and gadgets: NFC payments, Bluetooth pairing, Wi-Fi, GPS, the touchscreen, Face ID style depth sensing,
  wireless charging, fast charging, the phone camera sensor, the vibration motor, noise-cancelling headphones
- car: adaptive matrix headlights that dim single segments, rain sensor wipers, parking sensors, ABS, airbags,
  keyless entry, tyre pressure sensors, cruise control radar, the catalytic converter
- home: microwave oven, induction hob, fridge and heat pump cycle, LED bulb, smoke detector, circuit breaker,
  QR codes, barcode scanner at the till, router and mesh Wi-Fi, smart meter, thermostat, dishwasher
- street and city: contactless public transport card, traffic lights with car detection, ATM, card terminal chip,
  automatic doors, escalator, speed cameras, LED street screens

Pick the candidate with the best score (1-5 each):
- **Visual**: can the mechanism be shown with 3D objects in motion (parts, fields, signals, flows)? This weighs double.
- **Everyday**: does almost every viewer use it regularly? Familiar things work best ("I use it every day and never knew").
- **Clarity**: can it be explained correctly in under 95 spoken Polish words?
- **Safety**: low risk of getting a fact wrong. Prefer well-documented basics over contested details.

Research the mechanism with WebSearch (mode "extended" if results look thin): engineering explainers, standards
bodies, manufacturer technical pages, university material, Wikipedia only as a starting point. One surprising but
true detail makes the hook (for example "your card has no battery; the terminal powers it through the air").

### Duplicate check (mandatory)
```bash
python3 tools/topics.py list
python3 tools/topics.py check "<working title>" --concept "<the underlying concept in 6-12 words>" --keywords "k1,k2,k3,k4"
```
- A topic is a duplicate when it explains the **same underlying concept** as an earlier episode, even with a
  different news hook (e.g. "how solid-state batteries fail" and "why ceramic electrolytes crack" are the same).
- Exit code 3 (score >= 0.6) means: pick the next candidate. "POSSIBLE OVERLAP" (0.4-0.6) means: compare the concepts yourself. Also read the full list yourself; the script is a
  safety net, your judgement decides.
- Vary categories (phone, car, home, street, ...): avoid the same category as either of the last 2 episodes when another good candidate exists.
- `episodes/_example-nfc` is the engine example, not an episode. It is not in topics.json; NFC is still a free topic.

### Fact check
Every claim that will be spoken or shown must be supported by at least 2 independent sources (one primary or
official when possible). Keep the numbers you are not sure about out of the script. Put the URLs in `sources`.

## 2. Write the episode

Create `episodes/<YYYY-MM-DD>-<slug>/episode.json` (copy the shape of `episodes/_example-nfc/episode.json`):

- Add `"language": "pl"`.
- `beats`: 5 to 7 beats. Each has `tag` (1-3 plain words, no numbers, shown in caps), `headline` (array of 2 short
  lines, max ~20 characters each; wrap one key word in `<i>` for the accent italic or `<i class="r">` for the warning colour),
  `vo` (spoken Polish text), `visual` (what the 3D scene does, may be English).
- Total spoken text **80 to 95 Polish words** (about 38 to 46 s). Polish words are longer than English ones.
- Beat 1 is the hook: a surprising claim or question in the first sentence, no greeting, no "Czy wiesz, że".
- Last beat ends with: "Obserwuj, codziennie nowa technologia w 3D." and `cta` = "Obserwuj: codziennie technologia w 3D".
- Natural spoken Polish, the way a person explains something to a friend: concrete images ("jak korzeń skałę"),
  no hype, no calques from English. For "solid-state battery" say "bateria ze stałym elektrolitem"
  (not "półprzewodnikowa", which is a wrong translation). Write numbers and years as digits; the voice reads them.
  Avoid AI-sounding phrases ("To nie X, to Y", "magia", "bez ściemy", "po ludzku"), do not start sentences
  with "Bo", avoid lists of exactly three items and very short choppy sentences.
- `caption` (Polish): 2-4 sentences that add one extra fact, then a question to drive comments.
  `hashtags`: 8-10, mostly Polish (#technologia #nauka #ciekawostki ...) plus 2-3 English ones for reach.
  No brand names in hashtags.

## 3. Voice-over and timings
```bash
python3 tools/tts.py episodes/<dir>              # ElevenLabs when ELEVENLABS_API_KEY is set, else piper
```
Needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in the environment (given in the task prompt). If ElevenLabs
fails (quota, network), rerun with `--engine piper` and say so in the final message.
Output: `voice.wav` and `timeline.json` (beat start/end times and per-word timings). Check the printed duration:
if it is over 49 s, shorten the script and rerun (each ElevenLabs call costs credits, so count words first).

## 4. Build the 3D scene
Write `episodes/<dir>/scene.tsx` (see "Scene contract" below). Start by reading `episodes/_example-nfc/scene.tsx`
completely: it is the reference for structure, materials, camera keys, callouts and timing helpers.
Design rules:
- One clear hero object per episode, built from primitives and the kit (`Gloss`, `Metal`, `Glass`, `Neon`,
  `Pedestal`, `Coil`, `Flow`, `Swarm`, `RingWaves`, `Shockwave`, `Screen`, `slabGeometry`, `puckGeometry`, `RoundedBox`).
- Show the mechanism, not decoration: things flow, grow, break, rotate, light up, in sync with the words.
  Neon is for what the viewer must follow (signals, current, data, heat). Bodies are glossy dark or metallic.
- Something must be moving and visible in the very first frame (hook).
- `Glass` (real refraction) is expensive: at most 2 objects with it.
- Callout cards: at most 2 on screen at once, placed at y 600-760 (`card: [60, 640]` left, `[600, 640]` right).
- Wide shots: camera ~9-12 units from a ~3-unit-wide object (portrait frame is narrow, fov 42). Close-ups 5-7 units.
- Set `focus` so depth of field keeps the hero sharp (default focus = camera target).

Test frames, then LOOK at them (Read the PNG):
```bash
node tools/render.js episodes/<dir> test            # 12 frames spread over the reel -> <dir>/check/sheet.png
node tools/render.js episodes/<dir> test 0.2,3,8.5  # specific times; Read single frames at full size too
```
Each test frame takes ~15 s. Fix and repeat until: nothing important is cut off at the frame edges, the hero object
is readable, text does not cover the key action, callout dots point at the right parts, the first frame is interesting,
glowing parts are not blown out to white, and there is no progress bar and no scene number anywhere. Usually 2-3 rounds.

## 5. Render, music, mix
```bash
node tools/render.js episodes/<dir> video out/video.mp4 > out/render.log 2>&1   # resumable, see below
python3 tools/music.py episodes/<dir>                          # original procedural bed + SFX (reads sfx.json)
bash tools/assemble.sh episodes/<dir> out/video.mp4 out/<YYYY-MM-DD>-<slug>.mp4
```
The full render takes about 3 to 4 hours for a 40 to 45 s reel (about 9 to 10 s per frame on 2 CPUs, full quality).
That is expected and fine: the task runs at night and quality comes first. Do not lower quality to save time.

How to run it safely:
- Start it with Bash `run_in_background: true` and `timeout: 7200000` (the 2 h maximum). You are notified when it ends.
- To wait, use: `until grep -qE "^done|ERROR" out/render.log || ! pgrep -f "[n]ode tools/render.js" >/dev/null; do sleep 20; done`
  (the `[n]` keeps pgrep from matching the wait command itself).
- The render is split into parts of 150 frames saved in `out/chunks/<slug>/`. A 2 h background slot finishes only part of
  the reel, so when the command stops before `out/render.log` shows a line starting with `done`, start the **same command
  again** (append to the log with `>>`): finished parts are skipped and it continues. Repeat until `done`.
  A full reel normally needs 2 slots.
- Never run two copies at the same time. If the log shows `ERROR`, read it, fix the cause, rerun.
- If you change scene.tsx after the video render started, delete `out/chunks/<slug>/` first, otherwise old parts are reused.
- Only if the render fails repeatedly for a reason you cannot fix, use lighter effects as a last resort:
  `FX_LEAN=1 node tools/render.js ...` (no MSAA, simpler floor, no contact shadows; about 20% faster) and say so in the final message.
Final check: extract 6 frames from the final MP4 with ffmpeg and look at them; confirm duration and that audio exists
(`ffprobe`).

## 6. Deliver
- Send the final MP4 with SendUserFile (status "proactive", display "attach").
- Send one SendUserMessage in **Polish** with: topic + one-sentence why it was picked, the ready-to-paste Polish
  caption with hashtags (in a code block), the source links, the voice engine used, and anything that went wrong.

## 7. Save history (only after delivery succeeded)
```bash
python3 tools/topics.py add "<title>" --date <YYYY-MM-DD> --slug <slug> --concept "<concept>" \
  --category <category> --keywords "k1,k2,k3" --sources "url1,url2"
```
Then push to GitHub (`mcp__Github__push_files`, owner `ogarniamyai`, repo `tech-reels`, branch `main`) in ONE commit:
`topics.json`, `episodes/<dir>/episode.json`, `episodes/<dir>/scene.tsx`.
Never commit audio, video, timeline.json, sfx.json, check/ frames, the HDRI, `remotion/src/current.ts` or node_modules.
If you improved an engine/tool file, include it in the same commit and mention it in the message.

---

## Scene contract

`tools/render.js` writes `remotion/src/current.ts` (points at the episode), bundles `remotion/src/index.ts` and renders the
composition `Reel`. Overlay (headlines, karaoke subtitles, callouts, labels, CTA) is drawn by the engine from
`episode.json` + `timeline.json` + the scene definition. The scene file:

```tsx
import React from 'react';
import {defineScene, Gloss, Neon, Flow, ease, seg, lerp, mixColor, Vec3} from '../../remotion/src/engine';

export default defineScene({
  theme: {accent: '#22d3ee', accent2: '#e879f9'},        // optional, also warn/bg/floor
  fov: 42,                                                // optional
  camera: [{beat: 0, at: 0, pos: [x, y, z], target: [x, y, z]}, ...],
  focus: (t, B) => [x, y, z],                             // optional depth-of-field focus point
  callouts: [{beat, at, end?, t: 'CAPS TITLE', s: 'short line', red?: true, card: [x, y], anchor: [x, y, z] | ((t, B) => [x, y, z])}],
  labels: [{beat, at, end?, text, anchor, dy?}],
  sfx: [{beat, at, type: 'blip' | 'pop' | 'click' | 'thud' | 'rise' | 'power'}],
  World: ({t, B}) => <>{/* R3F JSX: meshes, groups, kit components */}</>,
});
```
- `t` = seconds. `World` must be a **pure function of t** (no useFrame, no Math.random, no state): frames are rendered
  out of order and in separate browser tabs. Use `rand(i)` / `rng(seed)` for deterministic randomness.
- `B` beat helper: `B.n`, `B.s(i)` start, `B.e(i)` end, `B.d(i)` duration, `B.on(i)`, `B.cur`,
  `B.p(i, from=0, len=rest)` progress 0..1 inside beat i, `B.out(i, len)` progress over the last `len` s.
- Camera keys: `at` = seconds from the beat start, negative = from the beat end. Keys are eased in order; a subtle
  handheld drift is added automatically. Or provide `cameraAt(t, B) => {pos, target}`.
- Helpers: `ease.{io,out,in,back,bounce}`, `clamp, seg, lerp, lerp3, rand, rng, hdr, mixColor, useCanvasTexture(w, h, draw)`.
  Canvas textures can use the loaded fonts: "Space Grotesk", "JetBrains Mono", "Instrument Serif".
- Kit (`remotion/src/engine/kit.tsx`): materials `Gloss`, `Metal`, `Matte`, `Glass`, `Neon(color, k, opacity, additive)`;
  geometry `puckGeometry`, `slabGeometry`, `roundedRectGeometry`; objects `Pedestal`, `Coil`, `Screen`, `RingWaves`,
  `Flow` (pulses along a curve), `Swarm` (two-way particle stream), `Shockwave`, `RoundedBox`.
  Neon brightness `k` 2-7; above that it turns white. Keep `Glass` to 1-2 objects.
- World units: the floor is y = 0, a hero object is ~2-3 units wide.
- Callout and label texts are Polish, CAPS for the title line, short (max ~16 characters) so cards fit.
