# 🐄 Sunny Barn Farm 🐔

**A gentle first farm game for ages 1–5.**

Explore the farm, listen to the animals, learn their names and sounds, and count
the sleeping animals inside the big red barn at night.

Everything is drawn and synthesised in the browser: **no downloads, no internet needed**
(HTML5 Canvas graphics, Web Audio sound and music, Web Speech narrator). It installs
to a home screen and plays fully offline.

**Made for phones and tablets first** — play it in landscape; buttons and text grow to
finger size on small screens, portrait mode shows a friendly "turn your phone" screen,
and every animal has an extra-large touch target. Works great on desktop too.

---

## 🏷️ Store listing copy

**Name:** Sunny Barn Farm
**Age rating:** 1–5 years
**Short description:** Learn animal names and sounds, and count the animals in the barn.

**What your child learns**

1. **Learn different animal names and sounds** — tap any animal to hear its name
   spoken and its real call: *"Cow! This is a cow. The cow says Moo!"*
2. **Counting animals** — count the sleeping animals in the barn out loud with the
   narrator, then answer a "how many?" quiz.

**Also in the box:** a listening game, an egg hunt, a day/night farm that changes
while you play, and no ads, no in-app purchases, and nothing to read.

---

## ▶ Run it (localhost)

**Option 1 – double-click** `Start Farm Game.bat` (Windows). It starts a local server and opens the game.

**Option 2 – terminal**

```bash
python3 serve.py
```

then open <http://localhost:8080/> in your browser (it opens automatically).

**Option 3 – any static server**, e.g. `npx serve -l 8080` from this folder.

> On Windows the command is `python serve.py`; on macOS/Linux it is usually `python3`.

## ☁️ Host it on Vercel

The game is 100% static, so Vercel needs **no build step**:

1. Go to <https://vercel.com/new> and import the `farmgamedemo` GitHub repo.
2. Framework preset: **Other** — leave *Build Command* empty and *Output Directory* as the repo root.
3. Click **Deploy**. Done — every push to `main` redeploys automatically.

(`vercel.json` sets cache headers; `.vercelignore` keeps local-dev files out of the
deployment. Or from a terminal: `npx vercel`.)

## 📱 Install it as an app

`manifest.webmanifest` + `sw.js` make the game installable and fully offline.

* **iPad / iPhone** — open the site in Safari → Share → *Add to Home Screen*.
* **Android** — Chrome offers *Install app* automatically.
* **Desktop (Windows / macOS / Linux)** — Chrome or Edge show an install icon in the
  address bar; it then runs in its own window with no browser chrome.

This is the quickest route to a "desktop version" and an "iPad version" without a
native rewrite. For the app stores proper (Apple App Store, Google Play, Amazon
Appstore / Fire tablets & Kindle Fire) the same folder can be wrapped with Capacitor
or Google's Bubblewrap — the game itself needs no changes.

> Turn your sound on 🔊 and tap **▶ Let's Play!** — browsers only allow audio after a tap.

## 🎮 How to play

| Action | What happens |
| --- | --- |
| **Tap an animal** | Speech bubble + real animal sound + narrator: *"Cow! This is a cow. The cow says Moo!"* and a big name card |
| **Tap it twice** | The animal does a trick (cow jumps & munches, horse rears & gallops, pig rolls in mud, sheep/goat boing, dog spins, cat pounces, chicken flaps & lays an egg, rooster crows, duck dives, frog jumps between lily pads, owl hoots) |
| **Tap the big red barn** | Go inside the barn |
| **🎧 Listen!** | Mini-game: a sound plays, three animals light up — tap the one that made it |
| **🥚 Egg Hunt!** | Mini-game: five eggs are hiding around the farm; find and count them |
| **🌞 / 🌙 button** | Switch day and night (it also cycles by itself: ~2 min day, ~1¼ min night) |
| **🔊 / 🎵 buttons** | Toggle sound effects + narrator / background music |
| **❓** | Show the help screen again |
| **Tap the tractor / scarecrow / windmill** | Honk! Caw! Whoosh! |
| **⭐ Stars** | Earn a star for every counting job, quiz answer and listening round (they're saved between visits); count *every* animal in the barn for a 3-star firework celebration |

### 🌞 Daytime
Cows, horses, pigs, sheep, a goat, chickens, a rooster, ducks, a dog and cats wander, graze, peck and swim.
A banjo tune plays, you hear birds and a breeze, and animals call out now and then (watch who is talking!).
The barn is empty inside — just hay and sunbeams — but you can hear the animals outside (muffled).

### 🌙 Night-time
At dusk the animals all walk into the barn and the doors close. The farm goes dark:
fireflies come out, an **owl** hoots in the tree, **frogs** croak on the lily pads, crickets chirp,
bats fly by, and you can hear the barn snoring. A music-box lullaby replaces the banjo.

Inside the barn all the animals are asleep, snoring with little "z"s.

* **Tap** an animal → the narrator counts with you: *"One… two… three! There are three pigs! Great counting!"*
  Each counted animal gets a number badge.
* **Tap twice** → the animal wakes for a moment and makes its sound.
* **🧮 Quiz Me!** → *"How many cats are sleeping?"* The camera **zooms in on just those
  animals** and fades the rest, so there is only one thing to count. Tap the number.
  Right answer: confetti + celebration + counting together. Wrong answer: *"Let's count them together!"*, then it asks again.
* **🔄 Count Again** clears the badges.

## 🎮 Mini-games

Seven little games, each teaching something different, each drawn with the farm's own
art and spoken by the farm's own narrator. Tap **🎮** on the farm to pick one, or open
`minigames/` (<https://farmgamedemo.vercel.app/minigames/>) for the standalone showcase.
Stars earned in a mini-game count on the farm and vice versa.

| | Game | How it plays | Teaches |
| --- | --- | --- | --- |
| 🥕 | **Veggie Patch** | Drag vegetables from the crate into the shaped holes in the scarecrow's garden. Round 3 puts carrot and pumpkin — both orange — together, so the *shape* has to do the work. | Shapes, colour words |
| 🚜 | **Tractor Ride** | Tap or hold anywhere and the tractor drives there, wheels turning, trailer bouncing behind. Scoop up the hay bales, splash through puddles, send the chickens flapping, honk at the dog, then deliver a full trailer to the barn. | Cause and effect, steering, counting the load |
| 🐷 | **Runaway Piglets** | The piglets have escaped and they zig-zag across the field. Tap to catch one; it squeals and floats back to the sty. They get faster each round. Tap the dog and his bark freezes them for a moment — the help a two-year-old needs. | Tracking a moving target, reflexes |
| 🔍 | **Hide & Seek** | "Where's the cow?" She's behind the tree, or in the hay with her ears showing, or in the pond with her eyes above the water. Tap the peeking bit and she pops out. Stuck? After a few seconds she *moos* — find her by listening. | Observation, listening, animal names |
| ⭐ | **Star Animals** | Night sky dot-to-dot. Join the stars 1 → 2 → 3… (the next one pulses) and the lines light up; finish and the real animal fades into the constellation and says hello. Five stars to start, seven later. | Number order 1–7, animal names |
| 🎵 | **Farm Band** | Five animals on coloured drums; every tap is a pentatonic banjo note, so anything bashed out sounds like a tune. Tap the rooster to copy his tune (2 → 5 notes); finish the whole thing for a concert. | Cause/effect, sequence memory |
| 🐷 | **Muddy Pig Bath** | Rub anywhere and the sponge wipes mud off a huge pig, with bubbles and giggles. Clean → a shine, a jump for joy, then he rolls in the mud again. | Motor control, clean/dirty |

Design rules shared by all seven, because they are for 1–5s: tap or a simple drag only;
nothing to read (the narrator runs everything); no fail states — a wrong answer is a gentle
redirect; nine idle seconds brings up a hint ring; one star per round.

### How they're built

```
minigames/mg-art.js    new art in the farm's style: 8 vegetables, 11 foods, tub, sponge, drums...
minigames/mg-core.js   MiniFX (tweens, timers, effects, tap+drag routing) + the standalone host
minigames/mg-hub.js    the picker; each card's preview is rendered by the game's own render()
minigames/games/*.js   one class per game: enter / update / render / onDown / onMove / onUp / onTap
js/mini.js             MiniScene — hosts the very same classes inside the main game as a third scene
```

Nothing is duplicated between the farm and the mini-games: they share `drawSpecies`, `Animal`,
`S.*`, `Sfx`, `Voice` and the HUD. A game played on the farm and on the hub page is the same code.
Test flags: `?start&mini=veggie` on the farm; `?game=veggie` on the hub (ids: `veggie tractor piglets hide stars band bath`).

## 🔊 About the sound

Every sound effect is synthesised at runtime — there are no effect files. The two songs and the
narrator are recordings.

### Music

* **Day — "High Meadow Skip"** (120 BPM) · **Night — "Crickets in the Tall Grass"** (76 BPM),
  in `music/` as 192 kbps AAC (~2.8 MB each). They're preloaded with the page, cached for offline
  play, and named by content hash so the CDN can cache them forever without ever serving an old one.
* **Seamless looping.** Neither song is written to loop, so the loop points were found by beat
  analysis: the bar line just before each song's ending (58 bars of the day song, 33 of the night),
  nudged onto the actual beats. The next pass crossfades in on that bar with an equal-power curve,
  so the join is on the beat and doesn't dip — measured, the level through the day seam holds within
  1.3 dB. Day ↔ night crossfades from one song into the other over 3 s.
* **Mix.** Each song's gain is set from its measured loudness so the music sits under the animals
  and the narrator (-30 / -32 dBFS); it ducks under narration and dips to 25% in the Farm Band,
  where the child is making the music.
* **Fallback.** If a song can't load, the original synthesised arrangements play instead
  ("Sunny Barn Hoedown" and "Barn Lullaby", built from Karplus–Strong banjo, guitar, mandolin and
  bass, a whistle and fiddle, and synth drums — all in `js/audio.js`).

To swap a song: put the new file in `music/`, then update its entry in `Sfx.TRACKS` (file name, gain,
first-sound time, loop start/end, crossfade). Keep the content hash in the file name.

### Effects

* **Real recordings, chosen for quality.** Every sound effect is cut from a recording on
  [Freesound](https://freesound.org): the animals, their tricks (munching, boinging, flapping,
  galloping, purring, the mouse), the barn door, the tractor's bulb horn, splashes, bubbles, the
  rubber duck, fireworks, kids cheering, and the interface sounds (pops, bells, sparkles, the
  success jingle). `tools/freesound-scout.py` searches Freesound for CC0 / CC BY recordings in the
  right duration range, ranks them by community rating and downloads, and measures the best few
  (noise floor, clipping, bandwidth); the picks live in `tools/make-sfx.py`, which cuts, cleans,
  levels and encodes them into `sfx/`. Credits for every clip are in `CREDITS.md`.
* **Never the same twice.** Each sound has several takes, all levelled to one loudness; the
  game picks a different take each time and nudges pitch and level a little.
* **Ambience beds.** Spring birdsong by day and a cricket chorus by night, looped seamlessly,
  with far-off frogs and an owl after dark; the tractor runs on a real engine whose revs follow
  the throttle.
* **Synthesis as the safety net.** `js/audio.js` still carries a synthesised version of every
  sound, which plays until the recordings have arrived. `Sfx.play()` returns how long the
  recording lasts, so an animal's mouth flaps for exactly as long as it calls.
* **Stereo placement.** `Sfx.play(name, vol, x)` pans by where the animal stands.
* **Room.** A synthesised impulse response, used lightly (the recordings bring their own
  space); inside the barn the room gets boomier and the outside world muffles. A gentle limiter
  keeps a pile-up of sounds from ever hurting little ears.
* **Rebuilding.** Put a Freesound API key in `tools/sfx-src/freesound.key`, run
  `tools/tts/.venv/bin/python -I tools/freesound-scout.py` to fetch the previews, then
  `tools/tts/.venv/bin/python -I tools/make-sfx.py`. Clips are named by content hash and cached
  for a year; `sfx/manifest.json` is what the game reads.

### The narrator's voice

The narrator is the one place a game cannot synthesise its way to studio quality — it needs a
real recorded (or neural) voice. So the game supports **pre-recorded clips**: `voice/manifest.json`
maps every line the game can say (506 of them) to a file in `voice/`, and they play through the
game's own audio graph — ducked under the music, a touch of presence, no robotic edges. Any line
without a clip falls back to the browser's speech synthesis, whose voices are ranked by quality
markers (*Natural, Neural, Enhanced, Premium*).

The shipped clips are rendered with **Orpheus** ("tara"), a free, open-source 3B-parameter
neural voice (Apache 2.0) that runs offline on the Mac through Apple's MLX framework — real
phrasing, breaths and a few emotion tags placed by rule (a chuckle on the big wins, a gasp on
"Uh oh", a yawn at bedtime). No account, no key, no limit. Re-render the whole narrator, or
switch voice, with one command (≈1.5 hours for all 506 lines; resumable):

```bash
python3 tools/make-voice.py --engine orpheus --voice tara
```

Other Orpheus voices: `leah`, `jess`, `mia`, `zoe`. **Kokoro** (`--engine kokoro --voice af_heart`,
82M parameters, ≈15 minutes) remains as the quick alternative, and Apple's own *Premium* voices
work with `--engine say`. Setup for each is in `tools/tts/README.md`. Paid services
(`--engine openai` / `--engine elevenlabs`) are supported too but not needed.

Every clip is finished like studio dialogue: silence trimmed so the voice answers a tap within
~20 ms, each line levelled to the same loudness (±0.4 dB across all 506), peaks kept clear of
clipping. Words a model misreads are fixed at render time — spelling tweaks in
`tools/tts/finishing.py` for every engine, phonemes in `tools/tts/kokoro_batch.py` for Kokoro
(*"Shhh"*, *"Hmm"*, *"Hooray"*…). Subtitles keep the original text.

(`--dry-run` lists the lines. The line list in the tool mirrors every `narrate()` in the game;
when you add a line in the game, add it there too and re-run — only missing clips are rendered.)

## 📁 Files

```
index.html               page + HUD
manifest.webmanifest     installable-app metadata
sw.js                    offline cache
css/style.css            kid-friendly UI styles (+ the polish layer: glossy buttons, pop-ins, iris wipe)
fonts/                   Fredoka, the game's rounded display face (SIL OFL, self-hosted so it works offline)
icons/                   app icons + favicons (generated — see tools/)
js/util.js               helpers + canvas drawing primitives
js/audio.js              Web Audio: song player (beat-aligned loops), formant animal calls, synth fallback songs, stereo, reverb, ambience
music/                   the day and night songs (content-hashed AAC)
js/voice.js              narrator: recorded clips through Web Audio, speech synthesis as fallback
voice/                   narrator clips + manifest.json (generated — see tools/make-voice.py)
js/animals.js            animal definitions, procedural drawing, wandering AI, tricks
js/scenery.js            barn, trees, fences, pond, coop, tractor, windmill, sun/moon, barn interior
js/farm.js               outdoor scene (day/night, night creatures, particles, mini-games)
js/barn.js               barn interior scene (sleeping animals, counting, quiz, quiz camera)
js/main.js               game loop, input, day/night cycle, HUD, cards, narration
serve.py                 tiny local web server (python3 serve.py)
tools/make-icons.html    regenerates icons/ from the game's own art
tools/make-voice.py      renders every narrator line to voice/ (Kokoro free neural voice; or say / OpenAI / ElevenLabs)
tools/tts/               the free neural voice: Kokoro renderer + setup guide (venv and model are git-ignored)
```

### Regenerating the icons

The icons are drawn by the same `drawSpecies()` / `S.barn()` code that draws the game,
so they can never drift from the art in the app. After changing an animal's artwork:

1. `python3 serve.py`
2. open <http://localhost:8080/tools/make-icons.html>
3. run `Object.entries(window.ICONS)` through the page's save call (see the file) — it
   writes straight into `icons/`.

Handy test flags: `?start` (skip splash), `?night`, `?barn`, `?quiz`, `?card`
— e.g. <http://localhost:8080/?start&night&barn>.

Works in Chrome / Edge / Safari / Firefox on desktop and tablets (touch supported).
The narrator voice depends on the voices installed in your browser/OS.
