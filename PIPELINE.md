# Daily reel playbook

One run = one finished **Polish-language** reel (1080x1920, 30 fps, 35 to 48 s) about a technical topic, explained
with an original 3D animation, a Polish voice-over, word-by-word subtitles and a music bed. The finished MP4 plus the
Polish Instagram caption are sent to the owner, who publishes by hand.

Everything the viewer sees or hears is in Polish: voice-over, headlines, tags, callouts, labels, CTA, caption.
Research can use English sources (most tech news is in English). Keep `title`, `concept` and `keywords` in
`episode.json` / `topics.json` in **English** so the duplicate checker keeps working across all episodes.

Follow the steps in order. Do not skip the duplicate check or the visual QA.

## 0. Setup (fresh container every run)

```bash
# the repo files were fetched into ./tech-reels with the GitHub connector (see the scheduled task prompt)
cd tech-reels && mkdir -p out
npm install --silent                         # three + fonts (pinned in package.json)
pip install --break-system-packages -q scipy piper-tts   # scipy for music, piper = fallback voice
```
Chromium + Playwright are preinstalled in the container (`require('playwright')` works; never run `playwright install`).
`ffmpeg` is preinstalled.

## 1. Research and pick ONE topic

Look for something from the last ~2 weeks in hardware, engineering, energy, chips, robotics, space tech,
materials, networking, consumer devices, or a classic "how does X actually work" question that the news makes
timely. Good sources: IEEE Spectrum, Hackaday, Ars Technica, The Verge, Tom's Hardware, Nature/Science news,
university press releases, company engineering blogs. Use WebSearch (mode "extended" if results look thin).

Collect 5 to 8 candidates, then score each 1-5 on:
- **Visual**: can it be shown with simple 3D objects in motion (layers, flows, parts, mechanisms)? This weighs double.
- **Curiosity**: would a non-engineer stop scrolling for it?
- **Clarity**: can it be explained correctly in under 95 spoken Polish words?
- **Safety**: low risk of getting a fact wrong. Avoid pure business news, rumours, politics, crypto prices.

### Duplicate check (mandatory)
```bash
python3 tools/topics.py list
python3 tools/topics.py check "<working title>" --concept "<the underlying concept in 6-12 words>" --keywords "k1,k2,k3,k4"
```
- A topic is a duplicate when it explains the **same underlying concept** as an earlier episode, even with a
  different news hook (e.g. "how solid-state batteries fail" and "why ceramic electrolytes crack" are the same).
- Exit code 3 (score >= 0.6) means: pick the next candidate. "POSSIBLE OVERLAP" (0.4-0.6) means: compare the concepts yourself. Also read the full list yourself; the script is a
  safety net, your judgement decides.
- Vary categories: avoid the same category as either of the last 2 episodes when another good candidate exists.

### Fact check
Every claim that will be spoken or shown must be supported by at least 2 independent sources (one primary or
official when possible). Keep the numbers you are not sure about out of the script. Put the URLs in `sources`.

## 2. Write the episode

Create `episodes/<YYYY-MM-DD>-<slug>/episode.json` (copy the shape of the most recent episode):

- Add `"language": "pl"`.
- `beats`: 5 to 7 beats. Each has `tag` (1-3 words, shown in caps), `headline` (array of 2 short lines, max ~20
  characters each; wrap one key word in `<i>` for the teal italic accent or `<i class="r">` for red),
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
Write `episodes/<dir>/scene.js` exporting `build(E)` (see "Scene contract" below). Design rules:
- One clear hero object per episode, built from simple primitives. Original designs only: no real logos, product
  replicas, mascots or brand names on objects.
- Show the mechanism, not decoration: things flow, grow, break, rotate, light up, in sync with the words.
- Something must be moving and visible in the very first frame (hook).
- Keep 3D content between y ~600 and ~1380 on screen. Headlines own the top, subtitles sit at y ~1395-1520.
- Callout cards: at most 2 on screen at once, placed at y 600-760 (`card: [40, 600]` left, `[600, 600]` right).
- Wide shots: camera ~13-15 units from a ~7-unit-wide object (portrait frame is narrow). Close-ups 6-8 units.

Test frames, then LOOK at them (Read the PNG):
```bash
node tools/render.js episodes/<dir> test            # 12 frames spread over the reel -> check/sheet.png
node tools/render.js episodes/<dir> test 0.2,3,8.5  # specific times
```
Fix and repeat until: nothing important is cut off at the frame edges, the hero object is readable, text does
not cover the key action, callout dots point at the right parts, the first frame is interesting. Usually 2-3 rounds.

## 5. Render, music, mix
```bash
node tools/render.js episodes/<dir> video out/video.mp4 30     # ~2 s per frame on 2 CPUs: 30-45 min for a 40 s reel
python3 tools/music.py episodes/<dir>                          # original procedural bed + SFX
bash tools/assemble.sh episodes/<dir> out/video.mp4 out/<YYYY-MM-DD>-<slug>.mp4
```
Run the render with `run_in_background` and wait on it; do not start a second copy.
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
`topics.json`, `episodes/<dir>/episode.json`, `episodes/<dir>/scene.js`.
Never commit audio, video or node_modules. If you improved an engine/tool file, include it in the same commit and
mention it in the message.

---

## Scene contract

`engine/engine.js` loads `episode.json`, `timeline.json`, then calls `build(E)` from the episode's `scene.js`.
`build` returns `{ update(t, B), camera: [...keys], viewOffsetY? , cameraAt?(t,B) }`.

`E` provides:
- `THREE`, `scene`, `camera`, `renderer`, `ground` (grid + shadow), `sun` (directional light)
- `PAL` colors: bg, paper, ink, teal, red, amber, blue, navy, cream, muted, green
- `M(color, roughness, metalness, extra)` material factory; `mat.{black, plastic, silver, steel, gold, copper, cream,
  paper, red, teal, blue, navy, ink, amber, white, dark, glass}`
- `add(parent, geometry, material, x, y, z, castShadow=true)`; geometry helpers `box, rbox, cyl, sphere`
- `canvasTex(w, h, draw)` for procedural textures; `rng(seed)` deterministic random (never use Math.random)
- `ease.{io,out,in,back,bounce}`, `clamp, seg, lerp`
- `B` beat helper: `B.n`, `B.s(i)` start, `B.e(i)` end, `B.d(i)` duration, `B.on(i)`,
  `B.p(i, from=0, len=rest)` progress 0..1 inside beat i, `B.out(i, len)` progress over the last `len` s
- `E.callout({t, s, red, anchor, card:[x,y], beat, at, end})` card + dashed leader line; anchor = Object3D,
  Vector3 or function returning a world Vector3 (adds a blip SFX automatically)
- `E.label({text, anchor, beat, at, end, dy})` small tag that follows a 3D point
- `E.sfx(time, type)` extra sound cue: `blip | pop | click | thud | rise | power` (whooshes on beat changes are automatic)
- `E.lib`: `glow(color,size,additive)`, `textPlane(text, opts)`, `panel(w,h,draw)`, `pcb(opts)`, `chip(opts)`,
  `led(color)` -> `{group, set(on)}`, `wire(points,color,radius)` -> `{mesh, curve, set(p)}`,
  `flow(curve, opts)` -> `{mesh, update(t, k)}`, `arrow(a,b,color)`, `pedestal(r)` -> `{group, holder}`,
  `gear(opts)`, `cell(opts)`, `packet(color)`, `device(opts)`

Camera keys: `{ beat, at, pos:[x,y,z], target:[x,y,z] }`; `at` = seconds from the beat start, negative = from the
beat end. Keys are eased in order; a subtle handheld drift is added automatically.

`update(t, B)` must be a pure function of `t` (frames are rendered out of order during tests).
Look at `episodes/2026-10-28-solid-state-dendrites/scene.js` as a complete reference (Polish callouts and labels).
Callout and label texts are Polish, in CAPS for the title line; keep them short (max ~16 characters) so cards fit.
