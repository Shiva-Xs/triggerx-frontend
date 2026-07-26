from PIL import Image, ImageDraw, ImageFilter
import math, os

PUBLIC = os.path.join(os.path.dirname(__file__), 'public')

BG        = (10, 10, 20, 255)
GLOW_COL  = (79, 91, 213)

GRAD_TOP    = (165, 243, 255)
GRAD_MID    = (79,  91,  213)
GRAD_BOT    = (123, 47,  255)


def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_color(t):
    if t < 0.45:
        return lerp_color(GRAD_TOP, GRAD_MID, t / 0.45)
    else:
        return lerp_color(GRAD_MID, GRAD_BOT, (t - 0.45) / 0.55)


def make_favicon(size: int) -> Image.Image:
    SS = 8
    s  = size * SS
    rx = int(s * 0.22)

    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s-1, s-1], radius=rx, fill=BG)

    cx, cy = s // 2, s // 2
    gl = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    gr = int(s * 0.30)
    ImageDraw.Draw(gl).ellipse([cx-gr, cy-gr, cx+gr, cy+gr], fill=(*GLOW_COL, 45))
    gl  = gl.filter(ImageFilter.GaussianBlur(s // 8))
    img = Image.alpha_composite(img, gl)

    scale = s / 32
    pts_svg = [(19,7), (11,17), (16,17), (13,25), (21,14), (16,14)]
    pts = [(x * scale, y * scale) for x, y in pts_svg]

    bolt_layer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    bolt_mask  = Image.new('L', (s, s), 0)
    ImageDraw.Draw(bolt_mask).polygon(pts, fill=255)

    ys = [p[1] for p in pts]
    y_min, y_max = min(ys), max(ys)

    for y in range(s):
        if y < y_min or y > y_max:
            continue
        t = (y - y_min) / (y_max - y_min) if y_max > y_min else 0
        col = gradient_color(t)
        for x in range(s):
            if bolt_mask.getpixel((x, y)):
                bolt_layer.putpixel((x, y), (*col, 255))

    img = Image.alpha_composite(img, bolt_layer)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    os.makedirs(PUBLIC, exist_ok=True)
    for size, name in [(32, 'favicon-32.png'), (512, 'favicon.png')]:
        icon = make_favicon(size)
        path = os.path.join(PUBLIC, name)
        icon.save(path)
        print(f'✓ {name}  ({size}×{size})')
    print('Done.')
