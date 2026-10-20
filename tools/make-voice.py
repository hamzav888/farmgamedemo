#!/usr/bin/env python3
"""Render every line the narrator can say into voice/ and write voice/manifest.json.

    python3 tools/make-voice.py                 # the Mac's own voice (Samantha) — same quality the browser has
    OPENAI_API_KEY=sk-... python3 tools/make-voice.py --engine openai --voice nova
    ELEVENLABS_API_KEY=... python3 tools/make-voice.py --engine elevenlabs --voice <voice_id>

The game plays these clips through its own audio graph (ducked under the
narration, a touch of presence, no robotic edges) and falls back to speech
synthesis for any line that has no clip. Lines are rendered only if missing,
so re-running after a text change is quick. The line list below mirrors every
narrate() template in the game; add here whenever you add a line there.
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'voice')

# ----- vocab, mirroring js/animals.js and the games -----
ANIMALS = {  # name: says
    'Cow': 'Moo!', 'Horse': 'Neigh!', 'Pig': 'Oink!', 'Sheep': 'Baa!', 'Goat': 'Meh-eh-eh!', 'Dog': 'Woof woof!',
    'Cat': 'Meow!', 'Kitten': 'Mew!', 'Chicken': 'Bok bok!', 'Rooster': 'Cock-a-doodle-doo!', 'Duck': 'Quack!',
    'Owl': 'Hoo hoo!', 'Frog': 'Ribbit!'}
BARN_GROUPS = {  # group: (plural, singular, how many sleep in the barn)
    'horse': ('horses', 'horse', 2), 'cow': ('cows', 'cow', 3), 'chicken': ('chickens', 'chicken', 5), 'rooster': ('roosters', 'rooster', 1),
    'duck': ('ducks', 'duck', 3), 'pig': ('pigs', 'pig', 3), 'sheep': ('sheep', 'sheep', 4), 'goat': ('goats', 'goat', 1),
    'dog': ('dogs', 'dog', 1), 'cat': ('cats', 'cat', 3)}
NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
VEG = {'Carrot': 'orange', 'Tomato': 'red', 'Corn': 'yellow', 'Eggplant': 'purple', 'Pumpkin': 'orange', 'Peas': 'green', 'Cabbage': 'green', 'Radish': 'pink'}
HIDERS = ['cow', 'pig', 'sheep', 'chicken', 'duck', 'horse', 'cat', 'dog', 'goat']
SPOTS = ['behind the tree', 'in the hay', 'in the pond', 'in the bush', 'behind the tractor', 'behind the barn']
STAR_ANIMALS = ['pig', 'chicken', 'duck', 'sheep', 'cat', 'dog', 'cow', 'horse', 'goat']

def cap(w): return w[0].upper() + w[1:]
def art(name): return 'an' if name[0].lower() in 'aeiou' else 'a'

def all_lines():
    L = set()
    add = L.add
    # ---- farm (js/main.js, js/farm.js) ----
    add('Welcome to Sunny Barn Farm! Tap the animals to say hello!')
    add('It is getting dark! Time for the animals to go to bed. Tap the barn to see them sleep!')
    add('It is night time now. Shhh, everyone is sleeping.')
    add('Good morning! The sun is up and the animals are coming outside!')
    add('The sun is setting. Time for bed, animals!')
    add('Good morning! Cock-a-doodle-doo!')
    add('Shhh... all the animals are sleeping in the barn. Tap them to count them!')
    add('The barn is empty right now — everyone is playing outside! Tap the moon button to make it night time.')
    add('Okay! Tap the animals to count them again.')
    add('Welcome back to the farm!')
    add('Listen! Who says this?')
    add('Egg hunt! Can you find five eggs hiding on the farm? Tap them!')
    add('Five! You found all five eggs! What a good egg hunter!')
    add("Okay! Tap the animals to count them again.")
    for name, says in ANIMALS.items():
        low, say = name.lower(), says.replace('!', '')
        add(f'{name}! This is {art(name)} {low}. The {low} says {say}!')
        add(f'Yes! The {low} says {say}! Well done!')
        add(f'That is the {low}. Listen again!')
        add(f'That is the {low}. Here it is again. Listen!')
        add(f'Shhh! The {low} says {says.replace("!", "", 1)}... and goes back to sleep.')
    for n in range(1, 13):
        add(f'{cap(NUM[n])}!'); add(f'{cap(NUM[n])}...')
    # ---- barn counting + quiz (js/barn.js) ----
    add('Hooray! You counted EVERY animal in the barn! Three gold stars for you!')
    for g, (plural, single, total) in BARN_GROUPS.items():
        if total == 1: add(f'One {single}! There is only one {single}. Great counting!')
        else: add(f'{cap(NUM[total])}! There are {NUM[total]} {plural}! Great counting!')
        add(f'How many {plural} can you see? Count them, then tap the number!')
        add(f"Yes! There are {NUM[total]} {plural}! Well done! Let's count them together.")
        add(f'So, how many {plural}? Tap the number!')
        for n in range(1, 9): add(f"Hmm, not {NUM[n]}. Let's count the {plural} together!")
    # ---- mini-games ----
    add('Welcome to the veggie patch! Drag each vegetable into the hole that matches its shape.')
    add('Great matching!'); add('Hmm, that is not the right shape. Try another hole!'); add('Not that one! Look at the shape.')
    add('The garden is full! Hooray! What great matching!'); add('Careful! Two of these are orange. Look at the shape!'); add('Here come some more vegetables!')
    for name, color in VEG.items():
        add(f'{name}!'); add(f"{name}! That's the right shape!"); add(f'Yes! The {color} {name.lower()} fits!')
    add('Tap anywhere to drive the tractor! Pick up all the hay bales, then bring them to the barn.')
    add('Drive to the barn!'); add('Tap near a hay bale to drive there!'); add('One bale!')
    for n in range(5, 9):
        add(f'{cap(NUM[n])}! The trailer is full! Drive to the barn!')
        add(f'{cap(NUM[n])} bales in the barn! What a great driver!')
        add(f'More hay to collect! {cap(NUM[n])} bales this time.')
    add('Oh no! The piglets have escaped! Tap a piglet to catch it. If they are too quick, tap the dog!')
    add('Tap a piglet to catch it!'); add('Tap the dog to make them stop!'); add('Woof! Stay still, piglets!')
    add('Uh oh — the gate is open again! Here they come!')
    for n in range(1, 7):
        add(f'{cap(NUM[n])}! One more to go!')
        add(f'{cap(NUM[n])}! You caught all the piglets! Back in the sty, you lot!')
    for h in HIDERS:
        add(f"Let's play hide and seek! Where is the {h}? Can you find the {h}?")
        add(f'Now, where is the {h}?')
        for o in HIDERS:
            if o != h: add(f"That's the {o}! We are looking for the {h}.")
        for sp in SPOTS: add(f'You found the {h} {sp}! {ANIMALS[cap(h)]}')
    add('You found everyone! You are brilliant at hide and seek!')
    add('Look at the stars! Tap star number one, then two, then three, and see who appears!')
    add('Hello, moon!'); add('Here is another one. Start at number one!')
    for n in range(1, 8):
        add(f'Tap star number {NUM[n]}!')
        for k in range(1, 8):
            if k != n: add(f"That's number {NUM[n]}. Find number {NUM[k]}!")
    for a in STAR_ANIMALS: add(f"It's a {a}! {ANIMALS[cap(a)]} The stars made a {a}!")
    add('Welcome to the farm band! Tap the animals to make music. Tap the rooster when you want to copy his tune!')
    add('Lovely music! Tap the rooster when you want to copy his tune.'); add('You did it! Now listen to a longer tune.')
    add("Perfect! Let's try a longer one."); add('Oops! Listen to the rooster again.'); add("Listen to the rooster's tune!"); add('Your turn!')
    add('You played the whole tune! Now everybody together!'); add('What a concert! You are a farm band star! Tap the rooster for a brand new tune.')
    add('Oh no! This pig is covered in mud! Rub the sponge on him to wash it off.'); add('All clean! What a shiny, sparkly pig!')
    add('Uh oh! He rolled in the mud again!'); add('Scrub scrub scrub!')
    return sorted(L)

# ----- renderers -----
def render_say(text, path, voice, rate):
    with tempfile.NamedTemporaryFile(suffix='.aiff', delete=False) as tmp: aiff = tmp.name
    try:
        subprocess.run(['say', '-v', voice, '-r', str(rate), '-o', aiff, text], check=True)
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '40000', aiff, path], check=True, capture_output=True)
    finally:
        if os.path.exists(aiff): os.remove(aiff)

def render_openai(text, path, voice):
    key = os.environ.get('OPENAI_API_KEY')
    if not key: sys.exit('OPENAI_API_KEY is not set')
    body = json.dumps({'model': 'gpt-4o-mini-tts', 'voice': voice, 'input': text, 'response_format': 'mp3',
                       'instructions': 'A warm, gentle, cheerful narrator reading to a two-year-old. Unhurried, clear, smiling.'}).encode()
    req = urllib.request.Request('https://api.openai.com/v1/audio/speech', data=body,
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as f: f.write(r.read())

def render_elevenlabs(text, path, voice):
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key: sys.exit('ELEVENLABS_API_KEY is not set')
    body = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2',
                       'voice_settings': {'stability': 0.55, 'similarity_boost': 0.75, 'style': 0.35}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_64', data=body,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as f: f.write(r.read())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--engine', choices=['say', 'openai', 'elevenlabs'], default='say')
    ap.add_argument('--voice', default=None)
    ap.add_argument('--rate', type=int, default=168, help='words per minute (say engine)')
    ap.add_argument('--dry-run', action='store_true', help='list the lines and stop')
    a = ap.parse_args()
    voice = a.voice or {'say': 'Samantha', 'openai': 'nova', 'elevenlabs': ''}[a.engine]
    ext = 'm4a' if a.engine == 'say' else 'mp3'
    lines = all_lines()
    print(f'{len(lines)} lines')
    if a.dry_run:
        for t in lines: print('  ', t)
        return
    os.makedirs(OUT, exist_ok=True)
    manifest = {'engine': a.engine, 'voice': voice, 'quality': 'standard' if a.engine == 'say' else 'neural', 'lines': {}}
    done = 0
    for text in lines:
        name = hashlib.sha1(text.encode('utf-8')).hexdigest()[:12] + '.' + ext
        path = os.path.join(OUT, name)
        if not os.path.exists(path):
            if a.engine == 'say': render_say(text, path, voice, a.rate)
            elif a.engine == 'openai': render_openai(text, path, voice)
            else: render_elevenlabs(text, path, voice)
            done += 1
            if done % 25 == 0: print(f'  rendered {done}...', flush=True)
        manifest['lines'][text] = name
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f: json.dump(manifest, f, ensure_ascii=False, indent=0)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'rendered {done} new, {len(lines)} total, {total / 1e6:.1f} MB in voice/ ({a.engine} / {voice})')

if __name__ == '__main__': main()
