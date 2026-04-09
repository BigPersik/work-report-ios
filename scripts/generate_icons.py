from PIL import Image, ImageEnhance, ImageFilter
from pathlib import Path


def make_icon(size: int) -> Image.Image:
    root = Path(__file__).resolve().parents[1]
    reference = root / "assets" / "icon-source-reference.png"
    source = Image.open(reference).convert("RGBA")

    # Crop tighter around the logo body so it fills the app icon better.
    crop = source.crop((165, 140, 865, 840))
    crop = ImageEnhance.Contrast(crop).enhance(1.06)
    crop = ImageEnhance.Color(crop).enhance(1.08)
    crop = crop.filter(ImageFilter.UnsharpMask(radius=1.8, percent=120, threshold=3))
    return crop.resize((size, size), Image.Resampling.LANCZOS)


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
