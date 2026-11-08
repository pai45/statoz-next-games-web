"""Deterministic Kenney Sports Pack subset, atlas and matching text-free covers.

Usage: python scripts/import-pitch-rush-art.py path/to/kenney_sports-pack.zip
Requires Pillow. Source assets retain their original bytes and CC0 notice.
"""
import hashlib
import json
from pathlib import Path
import sys
import zipfile
from io import BytesIO
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'vendor/kenney-sports-pack'
OUTPUT = ROOT / 'public/games/pitch-rush'
URL = 'https://kenney.nl/assets/sports-pack'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main(archive):
    pack = zipfile.ZipFile(archive)
    SOURCE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records, sprites = [], {}

    def load(name):
        data = pack.read(name)
        target = SOURCE / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        if not any(item['path'] == name for item in records):
            records.append({'path': name, 'sha256': digest(data)})
        return Image.open(BytesIO(data)).convert('RGBA')

    for team, colour in [('blue', 'Blue'), ('red', 'Red'), ('keeperYellow', 'White'), ('keeperDark', 'White')]:
        for tone in range(5):
            name = f'PNG/{colour}/character{colour} ({tone + 1}).png'
            image = load(name)
            recolour = None
            if team.startswith('keeper'):
                recolour = '#f4c94e' if team == 'keeperYellow' else '#3c4d52'
                pixels = image.load()
                for y in range(image.height):
                    for x in range(image.width):
                        r, g, b, a = pixels[x, y]
                        # The white shirt is cool/neutral, while hair and skin are warm.
                        if a and (max(r, g, b) - min(r, g, b) < 24 or b >= r):
                            base = (244, 201, 78) if team == 'keeperYellow' else (60, 77, 82)
                            light = max(.55, (r + g + b) / (3 * 245))
                            pixels[x, y] = (*[min(255, round(v * light)) for v in base], a)
            sprites[f'{team}{tone}'] = (image, name, recolour)
        for dark, index in [(False, 11), (True, 12)]:
            name = f'PNG/{colour}/character{colour} ({index}).png'
            image = load(name)
            # Sleeve and hand used for arms; feet use the dark cuff variant below.
            sprites[f'{team}Arm{int(dark)}'] = (image, name, None)
    for dark, index in [(False, 13), (True, 14)]:
        name = f'PNG/White/characterWhite ({index}).png'
        sprites[f'foot{int(dark)}'] = (load(name), name, None)
    name = 'PNG/Equipment/ball_soccer2.png'
    sprites['ball'] = (load(name), name, None)
    grass = load('Tilesheet/groundGrass_mown.png')
    sprites['grass'] = (grass.crop((0, 0, 64, 64)), 'Tilesheet/groundGrass_mown.png', None)
    # Goal corner, edge and net tiles; source tiles are individually named by Kenney.
    for index in [32, 33, 34, 41, 42, 43, 50, 51, 52]:
        name = f'PNG/Elements/element ({index}).png'
        sprites[f'goal{index}'] = (load(name), name, None)
    notice = pack.read('License.txt')
    records.append({'path': 'License.txt', 'sha256': digest(notice)})
    (SOURCE / 'License.txt').write_bytes(notice)
    (OUTPUT / 'KENNEY-LICENSE.txt').write_bytes(notice)
    atlas = Image.new('RGBA', (640, 480))
    regions = {}
    for index, (key, (image, name, recolour)) in enumerate(sprites.items()):
        x, y = index % 8 * 80 + 4, index // 8 * 80 + 4
        atlas.alpha_composite(image, (x, y))
        regions[key] = {'rect': [x, y, image.width, image.height], 'pivot': [.5, .5],
                        'source': name, 'recolour': recolour,
                        'alphaBounds': list(image.getbbox() or (0, 0, 0, 0))}
    atlas.save(OUTPUT / 'sports-atlas.png', optimize=True)
    manifest = {'version': 1, 'source': URL, 'license': 'CC0-1.0',
                'archiveSha256': digest(Path(archive).read_bytes()),
                'atlas': {'file': 'sports-atlas.png', 'size': [640, 480],
                          'sha256': digest((OUTPUT / 'sports-atlas.png').read_bytes())},
                'regions': regions,
                'frame': {'view': 'top-down', 'bodyWorldHeight': 22, 'filter': 'linear',
                          'collision': 'Existing simulation radii; art has no collision role',
                          'motion': 'Composed limbs; distance-driven gait, heading rotation, kick and slide poses'},
                'sources': records}
    (OUTPUT / 'sports-art.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
    (SOURCE / 'SOURCE.json').write_text(json.dumps({k: manifest[k] for k in ['source', 'license', 'archiveSha256', 'sources']}, indent=2) + '\n', encoding='utf8')

    # Same pack, same kits, no flattened functional text. Cover crop has a clear left focal area.
    scene = Image.new('RGBA', (1200, 1600), '#32b666')
    for y in range(0, 1600, 64):
        for x in range(0, 1200, 64):
            scene.alpha_composite(sprites['grass'][0], (x, y))
    draw = ImageDraw.Draw(scene)
    white = '#f9f5de'
    draw.rectangle((100, 100, 1100, 1500), outline=white, width=6)
    draw.line((100, 800, 1100, 800), fill=white, width=6)
    draw.ellipse((435, 635, 765, 965), outline=white, width=6)
    for top in [True, False]:
        y0, y1 = (100, 320) if top else (1280, 1500)
        draw.rectangle((330, y0, 870, y1), outline=white, width=6)
        draw.rectangle((465, 100 if top else 1420, 735, 180 if top else 1500), outline=white, width=6)
    players = [('blue', 0, 450, 1050, -25, 2.9), ('red', 2, 730, 860, 130, 2.5),
               ('blue', 3, 260, 560, 15, 2.3), ('red', 1, 850, 450, 150, 2.3),
               ('blue', 1, 850, 1200, -40, 2.5), ('red', 4, 330, 1350, 180, 2.4),
               ('keeperYellow', 2, 600, 210, 180, 2.2), ('keeperDark', 1, 610, 1400, 0, 2.2)]
    for team, tone, x, y, angle, scale in players:
        figure = Image.new('RGBA', (64, 64))
        figure.alpha_composite(sprites[f'{team}{tone}'][0], (22, 17))
        arm = sprites[f'{team}Arm{int(tone in [2, 3])}'][0].resize((11, 8), Image.Resampling.LANCZOS)
        figure.alpha_composite(arm, (13, 30))
        figure.alpha_composite(arm.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (41, 26))
        foot = sprites[f'foot{int(tone in [2, 3])}'][0].resize((11, 8))
        figure.alpha_composite(foot, (20, 46)); figure.alpha_composite(foot, (34, 43))
        figure = figure.resize((round(64 * scale), round(64 * scale)), Image.Resampling.LANCZOS).rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        draw.ellipse((x - 35, y - 16, x + 45, y + 26), fill=(14, 71, 44, 85))
        scene.alpha_composite(figure, (x - figure.width // 2, y - figure.height // 2))
    ball = sprites['ball'][0].resize((42, 42), Image.Resampling.LANCZOS)
    scene.alpha_composite(ball, (470, 985))
    scene = scene.rotate(20, resample=Image.Resampling.BICUBIC, expand=True)
    scene = scene.crop(((scene.width - 1600)//2, (scene.height - 1000)//2, (scene.width + 1600)//2, (scene.height + 1000)//2))
    background = Image.new('RGBA', scene.size, '#204d3d')
    background.alpha_composite(scene)
    scene = background.convert('RGB')
    scene.save(OUTPUT / 'cover.webp', quality=92)
    cover = ROOT / 'public/assets/games/covers/pitch-rush.webp'
    scene.resize((960, 600), Image.Resampling.LANCZOS).save(cover, quality=90)
    provenance = {'source': URL, 'license': 'CC0-1.0', 'method': 'Deterministic composition of selected Kenney Sports Pack sprites and grass tiles; no baked text.', 'script': 'scripts/import-pitch-rush-art.py', 'archiveSha256': manifest['archiveSha256']}
    (OUTPUT / 'cover-source.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf8')
    print(f'Imported {len(records)} source files, {len(regions)} atlas regions and two matching covers.')


if __name__ == '__main__':
    main(sys.argv[1])
