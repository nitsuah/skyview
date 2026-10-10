# Music + SFX for every SkyView spot. 120 BPM, D minor (Dm9 - Bbmaj7 - Fadd9 - C).
# Usage: python3 synth.py <merged spot.json> <out.wav>
# The music runs on the spot's own clock. SFX come from the spot's scene list:
# a soft swell into each cut, a click or chime where the scene has one, and a
# low hit under the outro. Everything is tuned to the key and mixed under the pad.
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, lfilter

SPOT = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
SR = 44100
DUR = float(SPOT['duration'])
N = int(DUR * SR)
rng = np.random.default_rng(7)

# Where in a scene (0..1) its click or highlight lands; matches compose.html.
CLICK = {'book-post': 0.88, 'book-find': 0.84}
CHIME = {'site-services': 0.12, 'book-modal': 0.42, 'book-avail': 0.3, 'book-dash': 0.3,
         'portal-token': 0.57, 'portal-expiry': 0.3, 'portal-lock': 0.3}


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def db(x): return 10 ** (x / 20)


def lp(x, f):
    b, a = butter(2, f / (SR / 2))
    return lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], btype='band')
    return lfilter(b, a, x)


def env(n, a, r):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def tone(m, dur, detune=0.0):
    t = np.arange(int(dur * SR)) / SR
    f = hz(m) * (1 + detune)
    return np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)


def pluck(m, dur=0.5):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(4 * np.pi * hz(m) * t)) * np.exp(-t * 9)


def add(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0:
        return
    sig = sig[:N - i] * gain
    buf[i:i + len(sig), 0] += sig * (1 - max(0, pan))
    buf[i:i + len(sig), 1] += sig * (1 + min(0, pan))


music = np.zeros((N, 2))
sfx = np.zeros((N, 2))

# Pad: one chord per bar (2 s), slow attack, slightly detuned pair for width.
CHORDS = [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [41, 53, 57, 60, 67], [48, 55, 60, 64, 67]]
BAR = 2.0
for b in range(int(np.ceil(DUR / BAR))):
    for m in CHORDS[b % 4]:
        n = tone(m, BAR + 0.6)
        add(music, lp(n * env(len(n), 0.5, 0.9), 1800), b * BAR, db(-27), pan=-0.3)
        n = tone(m, BAR + 0.6, 0.004)
        add(music, lp(n * env(len(n), 0.5, 0.9), 1800), b * BAR, db(-27), pan=0.3)
    # sub pulse on the beat, arpeggio on the off-beats
    for q in range(4):
        t0 = b * BAR + q * 0.5
        s = tone(CHORDS[b % 4][0] - 12, 0.32)
        add(music, lp(s * env(len(s), 0.01, 0.2), 220), t0, db(-19))
        add(music, pluck(CHORDS[b % 4][1 + (q + b) % 4] + 12, 0.4), t0 + 0.25, db(-31), pan=0.4 if q % 2 else -0.4)

scenes = SPOT['scenes']
for i, (sid, a, b) in enumerate(scenes):
    d = b - a
    if i > 0:  # swell into the cut
        n = int(0.4 * SR)
        add(sfx, bp(rng.standard_normal(n), 500, 4000) * np.linspace(0, 1, n) ** 2, a - 0.38, db(-33))
        add(sfx, pluck(74 if sid != 'outro' else 62, 0.6), a + 0.02, db(-27))
    if sid in CLICK:
        at = a + CLICK[sid] * d
        n = int(0.03 * SR)
        add(sfx, bp(rng.standard_normal(n), 1500, 6000) * np.exp(-np.arange(n) / (0.006 * SR)), at, db(-22))
        add(sfx, pluck(81, 0.35), at + 0.05, db(-26))
    if sid in CHIME:
        at = a + CHIME[sid] * d
        add(sfx, pluck(74, 0.6), at, db(-25), pan=-0.2)
        add(sfx, pluck(81, 0.7), at + 0.08, db(-25), pan=0.2)
    if sid == 'hook':
        n = int(1.6 * SR)
        add(sfx, bp(rng.standard_normal(n), 300, 2500) * np.linspace(0, 1, n) ** 3, a + 0.2, db(-30))
    if sid == 'outro':
        t = np.arange(int(1.4 * SR)) / SR
        add(sfx, np.sin(2 * np.pi * hz(38) * t) * np.exp(-t * 3.5), a + 0.05, db(-15))
        for m in (62, 69, 74, 77):
            add(sfx, pluck(m, 1.6), a + 0.08, db(-23))

mix = music + sfx
fade = int(0.7 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
mix = np.tanh(mix * 1.6) / 1.6
mix /= max(1e-9, np.abs(mix).max()) / 0.8

with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print(f'audio {DUR:.1f}s -> {OUT}')
