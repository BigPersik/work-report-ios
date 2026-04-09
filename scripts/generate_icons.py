from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (14, 36, 94, 255))
    draw = ImageDraw.Draw(img)

    for i in range(size):
        c = int(40 + (130 * i / max(1, size - 1)))
        draw.line([(0, i), (size, i)], fill=(25, 80, c, 255))

    margin = int(size * 0.12)
    card = [margin, margin, size - margin, size - margin]
    draw.rounded_rectangle(card, radius=int(size * 0.14), fill=(238, 245, 255, 255))

    top_h = int(size * 0.22)
    draw.rounded_rectangle(
        [card[0], card[1], card[2], card[1] + top_h],
        radius=int(size * 0.14),
        fill=(58, 108, 255, 255),
    )
    draw.rectangle([card[0], card[1] + top_h - int(size * 0.06), card[2], card[1] + top_h], fill=(58, 108, 255, 255))

    dot_r = int(size * 0.015)
    for row in range(3):
        for col in range(3):
            x = int(card[0] + size * 0.18 + col * size * 0.18)
            y = int(card[1] + top_h + size * 0.12 + row * size * 0.14)
            draw.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=(85, 100, 130, 255))

    try:
        font = ImageFont.truetype("arial.ttf", int(size * 0.22))
    except Exception:
        font = ImageFont.load_default()

    label = "DF"
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((size - tw - int(size * 0.15), size - th - int(size * 0.14)), label, font=font, fill=(58, 108, 255, 255))
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
