from pathlib import Path
from PIL import Image, ImageOps
root=Path(__file__).resolve().parent
for p in root.rglob("*.webp"):
    Image.open(p).save(p.with_suffix(".png"))
print("PNG copies created; WebP originals retained.")
