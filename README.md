# 🐄 Sunny Barn Farm 🐔

A colourful top-down farm game for young children — explore the farm, listen to the animals,
learn their names and sounds, and count the sleeping animals inside the big red barn at night.

Everything is drawn and synthesised in the browser: **no downloads, no internet needed**
(HTML5 Canvas graphics, Web Audio sound effects, Web Speech narrator).

**Made for phones and tablets first** — play it in landscape; buttons and text grow to
finger size on small screens, portrait mode shows a friendly "turn your phone" screen,
and every animal has an extra-large touch target. Works great on desktop too.

## ▶ Run it (localhost)

**Option 1 – double-click** `Start Farm Game.bat` (Windows). It starts a local server and opens the game.

**Option 2 – terminal**

```bash
python serve.py
```

then open <http://localhost:8080/> in your browser (it opens automatically).

**Option 3 – any static server**, e.g. `npx serve -l 8080` from this folder.

## ☁️ Host it on Vercel

The game is 100% static, so Vercel needs **no build step**:

1. Go to <https://vercel.com/new> and import the `farmgamedemo` GitHub repo.
2. Framework preset: **Other** — leave *Build Command* empty and *Output Directory* as the repo root.
3. Click **Deploy**. Done — every push to `main` redeploys automatically.

(`vercel.json` sets sensible cache headers; `.vercelignore` keeps the local-dev
files like `serve.py` out of the deployment. Or from a terminal: `npx vercel`.)

> Turn your sound on 🔊 and click **▶ Let's Play!** — browsers only allow audio after a tap.

## 🎮 How to play

| Action | What happens |
| --- | --- |
| **Tap an animal** | Speech bubble + real animal sound + narrator: *"Cow! This is a cow. The cow says Moo!"* and a big name card |
| **Tap it twice** | The animal does a trick (cow jumps & munches, horse rears & gallops, pig rolls in mud, sheep/goat boing, dog spins, cat pounces, chicken flaps & lays an egg, rooster crows, duck dives, frog jumps between lily pads, owl hoots) |
| **Tap the big red barn** | Go inside the barn |
| **🌞 / 🌙 button** | Switch day and night (it also cycles by itself: ~2 min day, ~1¼ min night) |
| **🔊 / 🎵 buttons** | Toggle sound effects + narrator / background music |
| **❓** | Show the help screen again |
| **Tap the tractor / scarecrow / windmill** | Honk! Caw! Whoosh! |
| **⭐ Stars** | Earn a star for every counting job and quiz answer (they're saved between visits); count *every* animal in the barn for a 3-star firework celebration |

### 🌞 Daytime
Cows, horses, pigs, sheep, a goat, chickens, a rooster, ducks, a dog and cats wander, graze, peck and swim.
You hear birds, a breeze, and animals calling now and then (watch who is talking!).
The barn is empty inside — just hay and sunbeams — but you can hear the animals outside (muffled).

### 🌙 Night-time
At dusk the animals all walk into the barn and the doors close. The farm goes dark:
fireflies come out, an **owl** hoots in the tree, **frogs** croak on the lily pads, crickets chirp, bats fly by.

Inside the barn all the animals are asleep, snoring with little "z"s.

* **Tap** an animal → the narrator counts with you: *"One… two… three! There are three pigs! Great counting!"*
  Each counted animal gets a number badge.
* **Tap twice** → the animal wakes for a moment and makes its sound.
* **🧮 Quiz Me!** → *"How many cats are sleeping?"* — tap the number.
  Right answer: confetti + celebration + counting together. Wrong answer: *"Let's count them together!"*, then it asks again.
* **🔄 Count Again** clears the badges.

## 📁 Files

```
index.html          page + HUD
css/style.css       kid-friendly UI styles
js/util.js          helpers + canvas drawing primitives
js/audio.js         Web Audio synth: animal calls, birds, crickets, frogs, owl, wind, snoring, UI sounds, music
js/voice.js         narrator (Web Speech API, prefers a female English voice)
js/animals.js       animal definitions, procedural drawing, wandering AI, tricks
js/scenery.js       barn, trees, fences, pond, coop, tractor, windmill, sun/moon, barn interior
js/farm.js          outdoor scene (day/night, night creatures, particles)
js/barn.js          barn interior scene (sleeping animals, counting, quiz)
js/main.js          game loop, input, day/night cycle, HUD, cards, narration
serve.py            tiny local web server (python serve.py)
```

Handy test flags: `?start` (skip splash), `?night`, `?barn`, `?quiz`, `?card`
— e.g. <http://localhost:8080/?start&night&barn>.

Works in Chrome / Edge / Safari / Firefox on desktop and tablets (touch supported).
The narrator voice depends on the voices installed in your browser/OS.
