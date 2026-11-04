#!/usr/bin/env python3
"""
clean-svg.py

Reads an Inkscape floor SVG and writes a cleaned copy where the "Classes"
layer (layer2) contains ONLY real rooms, sorted alphabetically by id, each
tagged with a data-type attribute derived from its fill color.

Original file is never modified.

Usage:
    python3 scripts/clean-svg.py
    python3 scripts/clean-svg.py --in map/Etage3-rooms.svg --out map/Etage3-rooms.clean.svg
"""

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SVG_NS = "http://www.w3.org/2000/svg"
INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"

# Register namespaces so output keeps the same prefixes as the input.
ET.register_namespace("", SVG_NS)
ET.register_namespace("inkscape", INKSCAPE_NS)
ET.register_namespace("sodipodi", "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd")

FILL_TO_TYPE = {
    "#00a41f": "classroom",
    "#a76e00": "stairs",
    "#6700a4": "wc-f",
    "#0200a4": "wc-m",
}

FILL_RE = re.compile(r"fill:\s*(#[0-9a-fA-F]{3,8})")
OPACITY_RE = re.compile(r"fill-opacity:\s*([0-9.]+)")


def qn(tag):
    return f"{{{SVG_NS}}}{tag}"


def get_fill(el):
    style = el.get("style", "")
    m = FILL_RE.search(style)
    return m.group(1).lower() if m else None


def get_fill_opacity(el):
    style = el.get("style", "")
    m = OPACITY_RE.search(style)
    return float(m.group(1)) if m else 1.0


def natural_key(s):
    """Sort 'B-3300' < 'B-3303' < 'B-3317' < 'B-3400' (numeric-aware)."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def find_layer(root, layer_id):
    for el in root.iter():
        if el.get("id") == layer_id:
            return el
    return None


def main():
    here = Path(__file__).resolve().parent
    default_in = here.parent / "map" / "Etage3-rooms.svg"
    default_out = here.parent / "map" / "Etage3-rooms.clean.svg"

    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default=str(default_in))
    ap.add_argument("--out", dest="out", default=str(default_out))
    args = ap.parse_args()

    src = Path(args.inp)
    dst = Path(args.out)
    if not src.exists():
        sys.exit(f"input not found: {src}")

    tree = ET.parse(src)
    root = tree.getroot()

    layer = find_layer(root, "layer2")
    if layer is None:
        sys.exit("layer2 (Classes) not found")

    kept = []
    dropped = {"no-id": 0, "no-fill": 0, "unknown-fill": 0, "transparent": 0}

    for child in list(layer):
        tag = child.tag.split("}")[-1]
        if tag not in ("rect", "path"):
            continue

        rid = child.get("id")
        if not rid:
            dropped["no-id"] += 1
            layer.remove(child)
            continue

        fill = get_fill(child)
        if fill is None:
            dropped["no-fill"] += 1
            layer.remove(child)
            continue

        if get_fill_opacity(child) == 0.0:
            dropped["transparent"] += 1
            layer.remove(child)
            continue

        rtype = FILL_TO_TYPE.get(fill)
        if rtype is None:
            dropped["unknown-fill"] += 1
            layer.remove(child)
            continue

        child.set("data-type", rtype)
        kept.append(child)

    # Detach and re-append in alphabetical order.
    for child in kept:
        layer.remove(child)
    kept.sort(key=lambda el: natural_key(el.get("id", "")))
    for child in kept:
        layer.append(child)

    tree.write(dst, encoding="UTF-8", xml_declaration=True)

    print(f"kept {len(kept)} rooms")
    for k, v in dropped.items():
        if v:
            print(f"  dropped {v} ({k})")
    print(f"wrote {dst}")


if __name__ == "__main__":
    main()
