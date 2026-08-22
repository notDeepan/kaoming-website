"""Regenerates content/company/world-land.ts.

    curl -sL -o land-110m.json https://unpkg.com/world-atlas@2.0.2/land-110m.json
    python scripts/generate-world-land.py

Natural Earth 1:110m land (public domain, via the world-atlas TopoJSON build),
projected exactly the way lib/distributors.ts projects an agent's marker so the
coastline and the markers can never disagree. Run by hand when the frame in
lib/distributors.ts changes; there is no build-time dependency on it, and no
network call at build or at runtime.
"""

import json, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

topo = json.load(open("land-110m.json", encoding="utf-8"))
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]

WIDTH, HEIGHT = 1000.0, 460.0
NORTH, SOUTH = 72.0, -52.0


def arc(index):
    """Decode one delta-encoded arc into [lon, lat] pairs."""
    reverse = index < 0
    if reverse:
        index = ~index
    x = y = 0
    out = []
    for dx, dy in topo["arcs"][index]:
        x += dx
        y += dy
        out.append((x * sx + tx, y * sy + ty))
    return out[::-1] if reverse else out


def ring(arc_indices):
    points = []
    for i in arc_indices:
        piece = arc(i)
        points.extend(piece[1:] if points else piece)
    return points


def project(point):
    lon, lat = point
    return ((lon + 180.0) / 360.0 * WIDTH, (NORTH - lat) / (NORTH - SOUTH) * HEIGHT)


def clip(points, inside, intersect):
    """Sutherland-Hodgman against one edge of the frame."""
    if not points:
        return []
    out = []
    previous = points[-1]
    for current in points:
        if inside(current):
            if not inside(previous):
                out.append(intersect(previous, current))
            out.append(current)
        elif inside(previous):
            out.append(intersect(previous, current))
        previous = current
    return out


def cut_y(limit, keep_below):
    def inside(p):
        return p[1] <= limit if keep_below else p[1] >= limit

    def intersect(a, b):
        t = (limit - a[1]) / (b[1] - a[1])
        return (a[0] + (b[0] - a[0]) * t, limit)

    return inside, intersect


def area(points):
    total = 0.0
    for i in range(len(points)):
        x0, y0 = points[i]
        x1, y1 = points[(i + 1) % len(points)]
        total += x0 * y1 - x1 * y0
    return abs(total) / 2


# A polygon that straddles the antimeridian comes back with points at both x=0
# and x=1000 joined by a horizontal streak across the whole map. Natural Earth's
# 110m land is already cut at +/-180, so this only guards against float drift.
MIN_AREA = 0.6  # square units at 1000x460 - drops specks below ~0.8 px across

commands = []
kept = dropped = 0
geometries = topo["objects"]["land"]["geometries"]
for geometry in geometries:
  for polygon in geometry["arcs"]:
    for index, arc_indices in enumerate(polygon):
        points = [project(p) for p in ring(arc_indices)]
        inside, intersect = cut_y(HEIGHT, True)
        points = clip(points, inside, intersect)
        inside, intersect = cut_y(0.0, False)
        points = clip(points, inside, intersect)
        if len(points) < 3 or area(points) < MIN_AREA:
            dropped += 1
            continue
        kept += 1
        parts = []
        last = None
        for x, y in points:
            rx, ry = round(x, 1), round(y, 1)
            if (rx, ry) == last:
                continue
            last = (rx, ry)
            parts.append(f"{rx:g},{ry:g}")
        if len(parts) < 3:
            continue
        commands.append("M" + "L".join(parts) + "Z")

path = "".join(commands)
print("rings kept", kept, "dropped", dropped, "chars", len(path))

out = f'''/**
 * World land outline, as one SVG path in the network map's own frame.
 *
 * Source: Natural Earth 1:110m "land" (public domain), via the `world-atlas`
 * TopoJSON build. Decoded and projected once, at authoring time, into exactly
 * the projection `markersFor` in lib/distributors.ts uses for an agent marker:
 * equirectangular, x = (lon + 180) / 360, y = ({NORTH:g} - lat) / {NORTH - SOUTH:g},
 * scaled to a {WIDTH:g} x {HEIGHT:g} viewBox. Because the coastline and the markers come
 * out of the same two lines of arithmetic, a marker cannot drift off its country.
 *
 * Rings are clipped to the frame rather than clamped, so Greenland above {NORTH:g} N
 * and Antarctica below {abs(SOUTH):g} S are cut by the edge instead of being squashed
 * into a bar along it. Coordinates are rounded to 0.1 units (~0.04 deg), and
 * rings smaller than {MIN_AREA:g} square units are dropped: at this size they are
 * sub-pixel specks that only cost bytes.
 *
 * Regenerate rather than hand-edit. This file is generated, not authored.
 */
export const WORLD_LAND_PATH =
  '{path}';

export const WORLD_VIEWBOX = {{ width: {WIDTH:g}, height: {HEIGHT:g}, north: {NORTH:g}, south: {SOUTH:g} }} as const;
'''
target = "content/company/world-land.ts"
open(target, "w", encoding="utf-8").write(out)
print("wrote", target, len(out))
