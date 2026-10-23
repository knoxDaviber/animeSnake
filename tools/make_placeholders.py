"""Draws placeholder sprite sheets for the heads, the followers and the mine. Run from the repo root: python tools/make_placeholders.py
Never overwrites a file that already exists, so real art is safe (character1.png is the Swordsman's real art, so it is not drawn here).
Needs Pillow (pip install pillow)."""
import os
from PIL import Image, ImageDraw

OUT = 'assets/images'
FOLLOWERS = {'miner': (255, 179, 107), 'raiden': (107, 197, 255), 'keysman': (255, 211, 107),
             'magneto': (199, 139, 255), 'gorgon': (141, 255, 107),
             # fusions (colours match followers.js)
             'bomber': (255, 138, 60), 'kingsman': (255, 227, 107), 'mrx': (154, 75, 214),
             'shogun': (58, 141, 255), 'medusa': (47, 191, 113)}
LABELS = {'mrx': 'X'}   # the letter drawn on the sheet; defaults to the first letter of the name
HEADS = {'magician': (120, 110, 255), 'gunman': (255, 120, 120)}   # the Swordsman is character1.png (real art)

def follower_sheet(name, rgb):
    img = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    dark = tuple(int(c * 0.55) for c in rgb)
    for row in range(3):                                   # 0 down, 1 right, 2 up (row 3 is reserved)
        for f in range(4):
            ox, oy = f * 32, row * 32
            bob = 1 if f % 2 else 0
            d.rounded_rectangle((ox + 3, oy + 4 - bob, ox + 28, oy + 29 - bob), 6, fill=rgb + (255,), outline=dark + (255,), width=2)
            if row == 0:                                   # facing down: two eyes
                for ex in (11, 19): d.rectangle((ox + ex, oy + 17 - bob, ox + ex + 2, oy + 21 - bob), fill=(20, 16, 31, 255))
            elif row == 1:                                 # facing right: one eye on the right
                d.rectangle((ox + 20, oy + 14 - bob, ox + 22, oy + 18 - bob), fill=(20, 16, 31, 255))
            d.text((ox + 13, oy + 5 - bob), LABELS.get(name, name[0].upper()), fill=dark + (255,))
    return img

def head_sheet(name, rgb):
    img = follower_sheet(name, rgb)                        # same body and 4x4 layout as a follower
    d = ImageDraw.Draw(img)
    dark = tuple(int(c * 0.55) for c in rgb)
    for row in range(3):
        for f in range(4):
            ox, oy = f * 32, row * 32
            bob = 1 if f % 2 else 0
            if name == 'magician':                         # pointed hat
                d.polygon([(ox + 8, oy + 7 - bob), (ox + 24, oy + 7 - bob), (ox + 16, oy + 1 - bob)], fill=dark + (255,), outline=(20, 16, 31, 255))
            elif name == 'gunman':                         # a gun sticking out to the side
                if row == 1: d.rectangle((ox + 22, oy + 19 - bob, ox + 31, oy + 22 - bob), fill=(58, 58, 74, 255), outline=(20, 16, 31, 255))
                else:        d.rectangle((ox + 24, oy + 21 - bob, ox + 29, oy + 24 - bob), fill=(58, 58, 74, 255), outline=(20, 16, 31, 255))
    return img

def mine_sheet():
    img = Image.new('RGBA', (128, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for f in range(4):
        ox = f * 32
        d.ellipse((ox + 6, 6, ox + 25, 25), fill=(58, 58, 74, 255), outline=(30, 30, 40, 255), width=2)
        for sx, sy in ((15, 2), (15, 27), (2, 15), (27, 15)): d.rectangle((ox + sx, sy, ox + sx + 2, sy + 2), fill=(30, 30, 40, 255))
        lit = f % 2 == 0
        d.rectangle((ox + 13, 13, ox + 18, 18), fill=(255, 77, 77, 255) if lit else (122, 31, 31, 255))
    return img

def save(img, path):
    if os.path.exists(path): print('skip (exists):', path); return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path); print('wrote', path)

for name, rgb in HEADS.items(): save(head_sheet(name, rgb), f'{OUT}/characters/{name}.png')
for name, rgb in FOLLOWERS.items(): save(follower_sheet(name, rgb), f'{OUT}/followers/{name}.png')
save(mine_sheet(), f'{OUT}/mine.png')
