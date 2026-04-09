from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)

    # Deep blue vertical gradient background.
    top = (30, 64, 175, 255)
    bottom = (12, 25, 55, 255)
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Soft highlight to get a "premium" glassy feel on iOS.
    glow = int(size * 0.42)
    draw.ellipse(
        [int(size * 0.1), int(size * -0.1), int(size * 0.1) + glow, int(size * -0.1) + glow],
        fill=(120, 180, 255, 60),
    )

    margin = int(size * 0.11)
    card = [margin, margin, size - margin, size - margin]
    radius = int(size * 0.2)
    draw.rounded_rectangle(card, radius=radius, fill=(248, 251, 255, 255))

    # Calendar top bar.
    top_h = int(size * 0.23)
    draw.rounded_rectangle(
        [card[0], card[1], card[2], card[1] + top_h],
        radius=radius,
        fill=(58, 108, 255, 255),
    )
    draw.rectangle(
        [card[0], card[1] + top_h - int(size * 0.08), card[2], card[1] + top_h],
        fill=(58, 108, 255, 255),
    )

    # Calendar rings.
    ring_w = int(size * 0.028)
    ring_h = int(size * 0.065)
    ring_y = int(card[1] + top_h - ring_h // 2)
    ring_color = (228, 236, 255, 255)
    for x in (int(size * 0.34), int(size * 0.5), int(size * 0.66)):
        draw.rounded_rectangle(
            [x - ring_w // 2, ring_y, x + ring_w // 2, ring_y + ring_h],
            radius=int(size * 0.012),
            fill=ring_color,
        )

    # Minimal day dots to keep icon readable on small sizes.
    dot_r = int(size * 0.014)
    start_x = int(card[0] + size * 0.21)
    start_y = int(card[1] + top_h + size * 0.13)
    step_x = int(size * 0.16)
    step_y = int(size * 0.13)
    dot_color = (95, 112, 150, 255)
    for row in range(3):
        for col in range(3):
            x = start_x + col * step_x
            y = start_y + row * step_y
            draw.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=dot_color)

    try:
        font = ImageFont.truetype("arial.ttf", int(size * 0.19))
    except Exception:
        font = ImageFont.load_default()

    # "DF" accent in the lower-right corner.
    label = "DF"
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = size - tw - int(size * 0.14)
    ty = size - th - int(size * 0.14)
    draw.text((tx + int(size * 0.004), ty + int(size * 0.004)), label, font=font, fill=(170, 195, 255, 200))
    draw.text((tx, ty), label, font=font, fill=(58, 108, 255, 255))
    return img


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    assets = root / "assets"
    assets.mkdir(exist_ok=True)

    make_icon(1024).save(assets / "icon.png")
    make_icon(1024).save(assets / "adaptive-icon.png")
    make_icon(1024).save(assets / "splash-icon.png")
    make_icon(256).save(assets / "favicon.png")
    print("Icons generated.")


if __name__ == "__main__":
    main()
