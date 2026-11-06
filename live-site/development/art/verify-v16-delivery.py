"""Recheck source and delivery hashes, dimensions, and every decoded RGBA byte."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
receipt = json.loads((ROOT / 'development/art/delivery-v16-lossless-5.21.json').read_text())
for entry in receipt['authored_art']:
    source, delivery = ROOT / entry['source'], ROOT / entry['delivery']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['source_sha256']
    assert hashlib.sha256(delivery.read_bytes()).hexdigest() == entry['delivery_sha256']
    original, packed = Image.open(source).convert('RGBA'), Image.open(delivery).convert('RGBA')
    assert original.size == packed.size == (entry['width'], entry['height'])
    assert original.tobytes() == packed.tobytes()
    assert original.getchannel('A').tobytes() == packed.getchannel('A').tobytes()
    assert hashlib.sha256(original.tobytes()).hexdigest() == entry['decoded_rgba_sha256']
print(json.dumps({'verified_lossless_art_sheets': len(receipt['authored_art']), 'all_rgba_pixels_equal': True}))
