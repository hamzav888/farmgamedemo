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

## 🔊 About the sound

There are no audio files — every sound is synthesised at runtime.

* **Animal calls** use *formant synthesis*: a buzzing "voice box" oscillator pushed
  through parallel band-pass filters that imitate an animal's throat and mouth. That is
  what makes the cow's "mmMOO-oo" and the cat's "me-ow" glide like real vowels instead of
  sounding like beeps. Every call is pitch-jittered slightly so it is never identical twice.
* **Loudness is measured, not guessed.** `Sfx._trim` holds a per-animal gain measured as
  max RMS over a 300 ms window, so a chicken and a cow feel equally loud. If you retune a
  call, re-measure it rather than eyeballing the `vol:` number.
* **Banjo** (daytime music) is a *Karplus–Strong* plucked string — a noise burst fed
  through a damped delay line — playing bluegrass forward rolls over G–C–D, with an
  upright bass, a brushed backbeat and a whistle melody.
* **Reverb** is a synthesised impulse response. Step inside the barn and the room gets
  boomier while the outside world goes muffled.

## 📁 Files

```
index.html               page + HUD
manifest.webmanifest     installable-app metadata
sw.js                    offline cache
css/style.css            kid-friendly UI styles
icons/                   app icons + favicons (generated — see tools/)
js/util.js               helpers + canvas drawing primitives
js/audio.js              Web Audio synth: formant animal calls, banjo + lullaby music, reverb, ambience
js/voice.js              narrator (Web Speech API, prefers a female English voice)
js/animals.js            animal definitions, procedural drawing, wandering AI, tricks
js/scenery.js            barn, trees, fences, pond, coop, tractor, windmill, sun/moon, barn interior
js/farm.js               outdoor scene (day/night, night creatures, particles, mini-games)
js/barn.js               barn interior scene (sleeping animals, counting, quiz, quiz camera)
js/main.js               game loop, input, day/night cycle, HUD, cards, narration
serve.py                 tiny local web server (python3 serve.py)
tools/make-icons.html    regenerates icons/ from the game's own art
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
