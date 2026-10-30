# Blender EEVEE + RunPod: rolki 3D

Pipeline do rolek 1080x1920 renderowanych w Blenderze 5.x (EEVEE) na wynajętym GPU w RunPod (RTX 4090, ok. 1 s na klatkę, ok. 0,5 USD za 55 s rolki).

| Plik | Co robi |
|---|---|
| `reelkit.py` | biblioteka sceny: render (EEVEE/Cycles), HDRI, compositor (bloom, nasycenie), materiały, geometria, zapis animacji do klatek kluczowych (`Baker`), system ujęć kamery (`plan_shots`, max 3 s na ujęcie, twarde cięcia) |
| `rp.py` + `srv.py` | tworzenie poda RunPod, upload, uruchamianie zadań, pobieranie, usuwanie |
| `../tools/tts.py` | lektor ElevenLabs z czasami słów -> `voice.wav`, `timeline.json` |
| `captions.py` | warstwa napisów (nagłówki Unbounded, napisy Sora, CTA na końcu) -> `captions.mov` |
| `music.py` | podkład + SFX z `sfx.json` -> `music.wav` |
| `finish.sh` | korekcja (punkt czerni, kontrast, winieta) + napisy + miks (`../tools/assemble.sh`) |
| `fetch_assets.sh` | czcionki (OFL) i HDRI (CC0) |
| `examples/nfc-phone/` | kompletna scena referencyjna: płatność telefonem przez NFC |

Klucze API tylko w zmiennych środowiskowych (`RUNPOD_API_KEY`, `ELEVENLABS_API_KEY`), nigdy w repo.
