# Bake every sprite the portrait pop-out lab uses into ../art.
# Usage: python3 bake.py            (all)
#        python3 bake.py gold tissue (just those groups)
import sys
import numpy as np
from kit import (canvas, shard, pennant, tri, quad, dot, strip, lily, petal, sheet, tail,
                 rosette, rosette_pleats, corner, heart, sparkle, big_tri, tissue_crumpled,
                 save_gold, save_tissue, save)
import kit

ONLY = set(sys.argv[1:])
want = lambda g: not ONLY or g in ONLY

def G(name, maskfn, wu, hu, seed, period=4.6, **kw):
    w, h = canvas(wu, hu)
    save_gold(name, maskfn(w, h), wu, hu, seed, period, **kw)

def T(name, maskfn, wu, hu, col, seed, **kw):
    w, h = canvas(wu, hu)
    save_tissue(name, maskfn(w, h), wu, hu, col, seed, **kw)

if want('gold'):
    for i, (wu, hu) in enumerate([(16, 12), (12, 15), (20, 13), (10, 9), (14, 11), (18, 16), (9, 12),
                                   (13, 10), (11, 14)], 1):
        G(f'g-shard-{i}', lambda w, h, s=i: shard(w, h, 40 + s), wu, hu, 40 + i)
    # the big torn leaf for the corner clusters
    for i, (wu, hu) in enumerate([(28, 22), (26, 20), (20, 15), (18, 14), (22, 26), (15, 12)], 1):
        G(f'g-leaf-{i}', lambda w, h, s=i: shard(w, h, 300 + s, n=11, ragged=2.2), wu, hu, 300 + i, 4.8)
    for i, (wu, hu) in enumerate([(4, 3.5), (3.5, 4.5), (5, 4), (3, 3)], 1):
        G(f'g-speck-{i}', lambda w, h, s=i: shard(w, h, 70 + s, n=6, ragged=1.0), wu, hu, 70 + i, 3.6)
    for i in (1, 2):
        G(f'g-pennant-{i}', lambda w, h, s=i: pennant(w, h, 90 + s), 10, 12, 90 + i)
    for i, (wu, hu) in enumerate([(7, 7), (6, 8), (8, 6), (6.5, 6.5)], 1):
        G(f'g-tri-{i}', lambda w, h, s=i: tri(w, h, 100 + s), wu, hu, 100 + i, 4.0)
    G('g-dot-1', lambda w, h: dot(w, h), 4.5, 4.5, 111, 3.8)
    G('g-dot-2', lambda w, h: dot(w, h), 3.5, 3.5, 112, 3.6)
    G('g-square-1', lambda w, h: quad(w, h, 113), 5, 5, 113, 3.8)
    for i, s in enumerate([19, 14, 11], 1):
        G(f'g-pad-{i}', lambda w, h, k=i: lily(w, h, 120 + k), s, s, 120 + i, 5.0)
    G('g-rosette', lambda w, h: rosette(w, h), 30, 30, 131, 4.2, shade_mul_fn=rosette_pleats)
    G('g-button', lambda w, h: dot(w, h), 12, 12, 132, 4.0)
    G('g-sheet', lambda w, h: sheet(w, h, 133), 80, 120, 133, 5.4)
    for i in range(1, 5):
        G(f'g-corner-{i}', lambda w, h, s=i: corner(w, h, 140 + s), 13, 13, 140 + i, 4.2)
    # a plain leaf tile, for the SVG streamers' pattern
    G('g-tile', lambda w, h: np.ones((h * kit.SS, w * kit.SS), bool), 40, 40, 150, 4.6)

if want('tissue'):
    for c in ('blush', 'lilac', 'sky', 'chart', 'peach'):
        T(f't-pennant-{c}', lambda w, h, s=len(c): pennant(w, h, 200 + s), 10, 12, c, 200 + len(c))
    for k, c in enumerate(('blush', 'lilac', 'sky', 'chart', 'peach', 'aqua')):
        T(f't-tri-{c}-1', lambda w, h, s=k: tri(w, h, 210 + s), 7, 7, c, 210 + k)
        T(f't-tri-{c}-2', lambda w, h, s=k: tri(w, h, 220 + s), 6, 8, c, 220 + k)
    for k, c in enumerate(('blush', 'lilac', 'sky', 'chart')):
        T(f't-square-{c}', lambda w, h, s=k: quad(w, h, 230 + s), 5.5, 5.5, c, 230 + k)
        T(f't-dot-{c}', lambda w, h: dot(w, h), 4.5, 4.5, c, 240 + k)
        T(f't-strip-{c}', lambda w, h, s=k: strip(w, h, 250 + s), 2.6, 11, c, 250 + k)
    for i in range(1, 6):
        T(f't-petal-{i}', lambda w, h, s=i: petal(w, h, 260 + s), 7, 15, 'blush' if i != 3 else 'peach', 260 + i)
    for i in range(1, 9):
        T(f't-lotus-{i}', lambda w, h, s=i: petal(w, h, 330 + s), 8, 17, 'peach' if i > 5 else 'blush', 330 + i)
    T('t-pad-aqua-1', lambda w, h: lily(w, h, 271), 17, 17, 'aqua', 271)
    T('t-pad-aqua-2', lambda w, h: lily(w, h, 272), 12, 12, 'aqua', 272)
    for k, c in enumerate(('lilac', 'sky', 'blush', 'chart')):
        T(f't-sheet-{c}', lambda w, h, s=k: sheet(w, h, 280 + s), 80, 120, c, 280 + k, torn_edge=True)
    T('t-tail-blush', lambda w, h: tail(w, h, 291), 7.5, 26, 'blush', 291)
    T('t-tail-lilac', lambda w, h: tail(w, h, 292), 7.5, 26, 'lilac', 292)
    # neutral tissue grain for the SVG tissue streamers (multiplied over their colour)
    w, h = canvas(40, 40)
    g = kit.tissue(np.ones((h * kit.SS, w * kit.SS), bool), w, h, '#ffffff', 299, alpha=1.0)
    save('t-grain', g)

if want('round2'):
    # round 2: the abundant bursts
    for i in range(1, 5):
        G(f'g-heart-{i}', lambda w, h, s=i: heart(w, h, 400 + s), 8, 7.4, 400 + i, 3.8)
    for k, c in enumerate(('blush', 'lilac', 'peach', 'chart', 'sky', 'aqua')):
        for i in (1, 2):
            T(f't-heart-{c}-{i}', lambda w, h, s=k * 10 + i: heart(w, h, 410 + s), 8, 7.4, c, 410 + k * 10 + i)
    for i, sz in enumerate((7, 5.5, 4), 1):
        G(f'g-sparkle-{i}', lambda w, h: sparkle(w, h), sz, sz, 480 + i, 3.4)
    for i in range(5, 11):
        G(f'g-tri-{i}', lambda w, h, s=i: tri(w, h, 100 + s), 7, 7, 100 + i, 4.0)
    for i in (1, 2, 3):
        G(f'g-strip-{i}', lambda w, h, s=i: strip(w, h, 490 + s), 2.6, 10, 490 + i, 3.6)
    G('g-square-2', lambda w, h: quad(w, h, 495), 5, 5, 495, 3.8)
    G('g-dot-3', lambda w, h: dot(w, h), 5.5, 5.5, 496, 3.8)
    for k, c in enumerate(('peach', 'aqua')):
        T(f't-square-{c}', lambda w, h, s=k: quad(w, h, 500 + s), 5.5, 5.5, c, 500 + k)
        T(f't-dot-{c}', lambda w, h: dot(w, h), 4.5, 4.5, c, 510 + k)
        T(f't-strip-{c}', lambda w, h, s=k: strip(w, h, 520 + s), 2.6, 11, c, 520 + k)
    for k, c in enumerate(('blush', 'lilac', 'sky', 'chart', 'peach', 'aqua')):
        T(f't-tri-{c}-3', lambda w, h, s=k: tri(w, h, 530 + s), 8, 8, c, 530 + k)

if want('round3'):
    # round 3: big tissue pennants for the bursting frame, baked finer (10 px/u)
    kit.PX = 10
    shapes = [(24, 30), (28, 26), (22, 32), (26, 28)]
    for k, c in enumerate(('blush', 'lilac', 'sky', 'chart', 'peach', 'aqua')):
        for i, (wu, hu) in enumerate(shapes, 1):
            w, h = canvas(wu, hu)
            sd = 600 + k * 10 + i
            save(f't-pen-{c}-{i}', tissue_crumpled(big_tri(w, h, sd), w, h, c, sd, S=20.0))
    for i, (wu, hu) in enumerate(shapes + [(25, 29)], 1):
        G(f'g-pen-{i}', lambda w, h, s=i: big_tri(w, h, 700 + s), wu, hu, 700 + i, 6.5)
    kit.PX = 6

if want('lily') or any(g in ONLY for g in ('vivid', 'spring')) or any(g.startswith('scheme:') for g in ONLY):
    # the party frame recoloured to the water-lily painting: the same masks
    # (and seeds) as round 4's first four colours, so every shape is unchanged
    kit.PX = 10
    def TC(name, maskfn, wu, hu, col, sd):
        w, h = canvas(wu, hu)
        save(name, tissue_crumpled(maskfn(w, h), w, h, col, sd, S=18.0, alpha=ALPHA, lift=LIFT))
    LIFT = next((float(g[5:]) for g in ONLY if g.startswith('lift:')), None)
    ALPHA = next((float(g[6:]) for g in ONLY if g.startswith('alpha:')), 0.6)
    LILY = ('lpink', 'lgreen', 'lblue', 'lviolet')
    VIVID = ('vblush', 'vlilac', 'vsky', 'vchart', 'vpeach', 'vaqua')
    SPRING = ('sblush', 'slilac', 'ssky', 'schart', 'speach', 'saqua')
    SCHEME = next((g[7:] for g in ONLY if g.startswith('scheme:')), None)
    PICK = (tuple(SCHEME + f for f in kit.FAMILIES) if SCHEME else
            SPRING if 'spring' in ONLY else VIVID if 'vivid' in ONLY else LILY)
    for k, c in enumerate(PICK):
        for i in (1, 2, 3):
            TC(f't-btri-{c}-{i}', lambda w, h, s=k * 10 + i: tri(w, h, 800 + s), 24, 24, c, 800 + k * 10 + i)
        for i in (1, 2):
            TC(f't-bheart-{c}-{i}', lambda w, h, s=k * 10 + i: heart(w, h, 870 + s), 26, 24, c, 870 + k * 10 + i)
            TC(f't-bsq-{c}-{i}', lambda w, h, s=k * 10 + i: quad(w, h, 940 + s), 20, 20, c, 940 + k * 10 + i)
        TC(f't-bdot-{c}', lambda w, h: dot(w, h), 18, 18, c, 1010 + k)
        TC(f't-bstrip-{c}', lambda w, h, s=k: strip(w, h, 1020 + s), 7, 30, c, 1020 + k)
    kit.PX = 6

if want('round4'):
    # round 4: big crumpled-tissue confetti for A (party burst) and E (streamer
    # party) at 2x/3x, baked at 10 px/u like the pennants
    kit.PX = 10
    COLS6 = ('blush', 'lilac', 'sky', 'chart', 'peach', 'aqua')
    def TC(name, maskfn, wu, hu, col, sd):
        w, h = canvas(wu, hu)
        save(name, tissue_crumpled(maskfn(w, h), w, h, col, sd, S=18.0))
    for k, c in enumerate(COLS6):
        for i in (1, 2, 3):
            TC(f't-btri-{c}-{i}', lambda w, h, s=k * 10 + i: tri(w, h, 800 + s), 24, 24, c, 800 + k * 10 + i)
        for i in (1, 2):
            TC(f't-bheart-{c}-{i}', lambda w, h, s=k * 10 + i: heart(w, h, 870 + s), 26, 24, c, 870 + k * 10 + i)
            TC(f't-bsq-{c}-{i}', lambda w, h, s=k * 10 + i: quad(w, h, 940 + s), 20, 20, c, 940 + k * 10 + i)
        TC(f't-bdot-{c}', lambda w, h: dot(w, h), 18, 18, c, 1010 + k)
        TC(f't-bstrip-{c}', lambda w, h, s=k: strip(w, h, 1020 + s), 7, 30, c, 1020 + k)
    for i in range(1, 5):
        G(f'g-btri-{i}', lambda w, h, s=i: tri(w, h, 1100 + s), 24, 24, 1100 + i, 6.0)
    for i in range(1, 4):
        G(f'g-bheart-{i}', lambda w, h, s=i: heart(w, h, 1110 + s), 26, 24, 1110 + i, 6.0)
    for i in (1, 2):
        G(f'g-bsparkle-{i}', lambda w, h: sparkle(w, h), 22, 22, 1120 + i, 5.0)
        G(f'g-bdot-{i}', lambda w, h: dot(w, h), 16, 16, 1125 + i, 5.5)
        G(f'g-bstrip-{i}', lambda w, h, s=i: strip(w, h, 1130 + s), 7, 28, 1130 + i, 5.5)
    # a neutral crumpled-tissue tile, multiplied over the big tissue curls
    w, h = canvas(30, 30)
    save('t-crumple-tile', tissue_crumpled(np.ones((h * kit.SS, w * kit.SS), bool), w, h, '#ffffff', 1199, S=18.0, alpha=1.0))
    kit.PX = 6

if want('round5'):
    # gold-leaf stars for the accents on top: the star card's own cut (gen_foil
    # star_mask, inner 0.48, tips just softened), baked big at 10 px/u
    kit.PX = 10
    from gen_foil import star_mask
    for i, (su, rot) in enumerate([(24, -0.31), (20, -0.18), (16, -0.42)], 1):
        def mk(w, h, rot=rot, i=i):
            m = star_mask(w * kit.SS, inner=0.48, round_=0.04, rot=rot, wobble=0.03, seed=1200 + i)
            return m > 0.5
        G(f'g-bstar-{i}', mk, su, su, 1200 + i, 5.5)
    kit.PX = 6

print('baked')
