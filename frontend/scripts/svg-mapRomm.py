#!/usr/bin/env python3
"""
svg-mapRomm.py

Generates an SVG map with room names placed at their exact coordinates (center).
Reads room geometry and identifiers from path.json and/or Etage3.svg.

Outputs:
    1. frontend/src/assets/map/room_labels.svg (Standalone clean map with labels)
    2. frontend/src/assets/map/Etage3-labeled.svg (Full Etage3 SVG with an overlay labels layer)

Usage:
    python frontend/scripts/svg-mapRomm.py
    python frontend/scripts/svg-mapRomm.py --output custom_map.svg
    python frontend/scripts/svg-mapRomm.py --include-generic
"""

import argparse
import json
import math
import re
import xml.etree.ElementTree as ET
from pathlib import Path


def is_generic_id(room_id: str) -> bool:
    """Returns True if the ID is an auto-generated Inkscape internal id (e.g. rect252, path5090)."""
    return bool(re.match(r"^(rect|path|g|polygon|circle)\d+$", room_id.strip(), re.IGNORECASE))


def get_display_label(room_id: str, room_type: str, include_generic: bool = False) -> str:
    """Returns a clean, human-readable label for a room."""
    if not is_generic_id(room_id):
        return room_id

    # If generic ID, provide meaningful category label or omit
    if room_type == "wc-f":
        return "WC ♀"
    elif room_type == "wc-m":
        return "WC ♂"
    elif room_type == "stairs":
        return "Escalier"
    elif include_generic:
        return room_id

    return ""


def resolve_paths():
    """Finds input and output paths relative to script or workspace."""
    script_dir = Path(__file__).resolve().parent
    candidates_json = [
        script_dir.parent / "src" / "assets" / "map" / "path.json",
        Path.cwd() / "frontend" / "src" / "assets" / "map" / "path.json",
        Path.cwd() / "src" / "assets" / "map" / "path.json",
        Path.cwd() / "path.json",
    ]
    path_json = next((c for c in candidates_json if c.exists()), candidates_json[0])

    candidates_svg = [
        script_dir.parent / "src" / "assets" / "map" / "Etage3.svg",
        Path.cwd() / "frontend" / "src" / "assets" / "map" / "Etage3.svg",
        Path.cwd() / "Etage3.svg",
    ]
    etage3_svg = next((c for c in candidates_svg if c.exists()), None)

    return path_json, etage3_svg


def compute_font_size(polygon, label_text):
    """Calculates a readable font size that fits nicely inside the room polygon."""
    if not polygon or not label_text:
        return 14

    xs = [pt[0] for pt in polygon]
    ys = [pt[1] for pt in polygon]
    width = max(xs) - min(xs)
    height = max(ys) - min(ys)

    # Estimate character width factor (~0.62 of font-size)
    char_count = max(1, len(label_text))
    max_font_by_width = (width * 0.85) / (char_count * 0.62)
    max_font_by_height = height * 0.45

    font_size = min(max_font_by_width, max_font_by_height)
    # Clamp between 11px and 22px for optimal map legibility
    return max(11.0, min(22.0, round(font_size, 1)))


def generate_standalone_svg(data, output_path, include_generic=False, include_paths=True):
    """Generates a complete standalone SVG map with room polygons, paths, and labels."""
    rooms = data.get("rooms", [])
    paths = data.get("paths", [])
    floor = data.get("floor", 3)

    # Calculate overall viewBox bounds
    xs = [pt[0] for r in rooms for pt in r.get("polygon", [])]
    ys = [pt[1] for r in rooms for pt in r.get("polygon", [])]
    min_x = max(0, math.floor(min(xs) - 20)) if xs else 0
    min_y = max(0, math.floor(min(ys) - 20)) if ys else 0
    max_x = math.ceil(max(xs) + 20) if xs else 2662
    max_y = math.ceil(max(ys) + 20) if ys else 2210
    view_width = max_x - min_x
    view_height = max_y - min_y

    svg = [
        f'<svg width="{view_width}" height="{view_height}" viewBox="{min_x} {min_y} {view_width} {view_height}" '
        'xmlns="http://www.w3.org/2000/svg">',
        "  <defs>",
        "    <style>",
        "      .bg { fill: #f8fafc; }",
        "      .corridor { fill: none; stroke: #94a3b8; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 6 6; }",
        "      .room { stroke-width: 1.5; stroke-linejoin: round; }",
        "      .room-classroom { fill: #e8f5ec; stroke: #1e6b37; }",
        "      .room-stairs { fill: #fff7ed; stroke: #c2410c; }",
        "      .room-wc-f { fill: #faf5ff; stroke: #7e22ce; }",
        "      .room-wc-m { fill: #eff6ff; stroke: #1d4ed8; }",
        "      .room-unknown { fill: #f1f5f9; stroke: #64748b; }",
        "      .room-label {",
        "        font-family: 'Uncut Sans', Arial, Helvetica, sans-serif;",
        "        font-weight: 700;",
        "        text-anchor: middle;",
        "        dominant-baseline: central;",
        "        fill: #0f172a;",
        "        stroke: #ffffff;",
        "        stroke-width: 3.5px;",
        "        paint-order: stroke fill;",
        "        stroke-linejoin: round;",
        "        pointer-events: none;",
        "        user-select: none;",
        "      }",
        "      .room-label-wc { fill: #581c87; }",
        "      .room-label-stairs { fill: #7c2d12; }",
        "    </style>",
        "  </defs>",
        "",
        f'  <!-- Canvas Background Floor {floor} -->',
        f'  <rect x="{min_x}" y="{min_y}" width="{view_width}" height="{view_height}" class="bg"/>',
        "",
    ]

    # 1. Walkable Corridors
    if include_paths and paths:
        svg.append('  <!-- Corridor Paths -->')
        svg.append('  <g id="paths" class="paths-layer">')
        for item in paths:
            pts = item.get("points", [])
            if len(pts) >= 2:
                points_str = " ".join(f"{p[0]:.2f},{p[1]:.2f}" for p in pts)
                svg.append(f'    <polyline id="{item.get("id", "")}" points="{points_str}" class="corridor"/>')
        svg.append('  </g>')
        svg.append("")

    # 2. Room Polygons
    svg.append('  <!-- Room Polygons -->')
    svg.append('  <g id="rooms" class="rooms-layer">')
    for room in rooms:
        rid = room.get("id", "")
        rtype = room.get("type", "unknown")
        poly = room.get("polygon", [])
        if poly:
            pts_str = " ".join(f"{pt[0]:.2f},{pt[1]:.2f}" for pt in poly)
            svg.append(f'    <polygon id="{rid}" class="room room-{rtype}" data-type="{rtype}" points="{pts_str}"/>')
    svg.append('  </g>')
    svg.append("")

    # 3. Room Name Labels at their spots
    svg.append('  <!-- Room Names Placed at Their Spots (Center) -->')
    svg.append('  <g id="room-labels" class="labels-layer">')
    label_count = 0
    for room in rooms:
        rid = room.get("id", "")
        rtype = room.get("type", "unknown")
        center = room.get("center")
        label = get_display_label(rid, rtype, include_generic)
        if label and center and len(center) == 2:
            cx, cy = center[0], center[1]
            fsize = compute_font_size(room.get("polygon", []), label)
            extra_class = " room-label-wc" if "wc" in rtype else (" room-label-stairs" if rtype == "stairs" else "")
            svg.append(
                f'    <text x="{cx:.2f}" y="{cy:.2f}" font-size="{fsize}px" class="room-label{extra_class}">{label}</text>'
            )
            label_count += 1
    svg.append('  </g>')
    svg.append("</svg>")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg) + "\n")

    print(f"Generated standalone SVG with {label_count} room labels at their spot:")
    print(f" -> {output_path.resolve()}")
    return label_count


def inject_labels_into_etage3(etage3_path, data, output_path, include_generic=False):
    """Injects a clean room-labels layer directly into the original Etage3.svg."""
    if not etage3_path or not etage3_path.exists():
        return 0

    SVG_NS = "http://www.w3.org/2000/svg"
    INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"

    ET.register_namespace("", SVG_NS)
    ET.register_namespace("inkscape", INKSCAPE_NS)

    tree = ET.parse(etage3_path)
    root = tree.getroot()

    # Remove existing room-labels layer if present
    for child in list(root):
        if child.get("id") == "layer-room-labels":
            root.remove(child)

    # Create new Labels layer at document root (using global world coordinates)
    labels_layer = ET.Element(f"{{{SVG_NS}}}g", {
        "id": "layer-room-labels",
        f"{{{INKSCAPE_NS}}}label": "Noms des Locaux",
        f"{{{INKSCAPE_NS}}}groupmode": "layer",
        "style": "display:inline",
    })

    # Add style def
    style_el = ET.Element(f"{{{SVG_NS}}}style")
    style_el.text = (
        ".map-room-label {"
        "  font-family: 'Uncut Sans', Arial, Helvetica, sans-serif;"
        "  font-weight: 700;"
        "  text-anchor: middle;"
        "  dominant-baseline: central;"
        "  fill: #0f172a;"
        "  stroke: #ffffff;"
        "  stroke-width: 3.5px;"
        "  paint-order: stroke fill;"
        "  stroke-linejoin: round;"
        "  pointer-events: none;"
        "  user-select: none;"
        "}"
    )
    labels_layer.append(style_el)

    label_count = 0
    for room in data.get("rooms", []):
        rid = room.get("id", "")
        rtype = room.get("type", "unknown")
        center = room.get("center")
        label = get_display_label(rid, rtype, include_generic)
        if label and center and len(center) == 2:
            cx, cy = center[0], center[1]
            fsize = compute_font_size(room.get("polygon", []), label)
            text_el = ET.Element(f"{{{SVG_NS}}}text", {
                "x": f"{cx:.2f}",
                "y": f"{cy:.2f}",
                "class": "map-room-label",
                "font-size": f"{fsize}px",
            })
            text_el.text = label
            labels_layer.append(text_el)
            label_count += 1

    root.append(labels_layer)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)

    print(f"Generated labeled Etage3 map with {label_count} room labels:")
    print(f" -> {output_path.resolve()}")
    return label_count


def main():
    parser = argparse.ArgumentParser(description="Generate SVG with room names at their exact spots.")
    path_json, etage3_svg = resolve_paths()

    default_output = path_json.parent / "room_labels.svg" if path_json.exists() else Path("room_labels.svg")

    parser.add_argument(
        "--input",
        "-i",
        default=str(path_json),
        help=f"Path to input path.json (default: {path_json})",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=str(default_output),
        help=f"Path to output SVG (default: {default_output})",
    )
    parser.add_argument(
        "--include-generic",
        action="store_true",
        help="Include generic Inkscape rect/path IDs in labels",
    )
    parser.add_argument(
        "--no-paths",
        action="store_true",
        help="Exclude corridor paths",
    )

    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Generate standalone clean SVG map with room names
    generate_standalone_svg(
        data,
        Path(args.output),
        include_generic=args.include_generic,
        include_paths=not args.no_paths,
    )

    # 2. Also inject room names into Etage3.svg as Etage3-labeled.svg
    if etage3_svg and etage3_svg.exists():
        labeled_etage3_path = etage3_svg.parent / "Etage3-labeled.svg"
        inject_labels_into_etage3(
            etage3_svg,
            data,
            labeled_etage3_path,
            include_generic=args.include_generic,
        )


if __name__ == "__main__":
    main()
