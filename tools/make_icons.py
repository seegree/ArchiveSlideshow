#!/usr/bin/env python3
"""Renders the panel's icon tiles as PNGs and emits them as ExtendScript
binary-string assignments, spliced into ArchiveSlideshow.jsx between the
ICON_DATA markers. Geometry mirrors the approved HTML mock's SVG tiles.

Usage: python3 tools/make_icons.py [--splice path/to/ArchiveSlideshow.jsx]
Without --splice it writes icon-data.jsxinc next to this script.
"""

import math
import struct
import sys
import zlib

SS = 4          # supersample factor
TILE_W, TILE_H = 40, 30
GX, GY = 7.0, 5.0   # glyph box (26x20) offset inside the tile

OUTER = (0x1D, 0x1D, 0x1D)
SEAM = (0xE8, 0xE4, 0xD8)

PALETTES = {
    "off": {
        "bg": (0x2A, 0x2A, 0x2A), "border": (0x4A, 0x4A, 0x4A),
        "st": (0xB9, 0xB9, 0xB9), "fl": (0x9A, 0x9A, 0x9A),
        "fd": (0x5F, 0x5F, 0x5F),
    },
    "on": {
        "bg": (0x3C, 0x37, 0x66), "border": (0x7A, 0x6F, 0xE2),
        "st": (0xDC, 0xD8, 0xFF), "fl": (0xCD, 0xC8, 0xF5),
        "fd": (0x7D, 0x76, 0xB8),
    },
}


class Canvas:
    def __init__(self):
        self.w, self.h = TILE_W * SS, TILE_H * SS
        self.px = [[0.0, 0.0, 0.0] for _ in range(self.w * self.h)]

    def base_tile(self, bg, border):
        """Rounded-rect tile via signed distance: outer, 1px border, fill."""
        r = 4.0
        half_w, half_h = TILE_W / 2.0, TILE_H / 2.0
        inset = 0.5  # border centerline sits half a pixel in
        for y in range(self.h):
            for x in range(self.w):
                px = (x + 0.5) / SS
                py = (y + 0.5) / SS
                qx = abs(px - half_w) - (half_w - inset - r)
                qy = abs(py - half_h) - (half_h - inset - r)
                ox = max(qx, 0.0)
                oy = max(qy, 0.0)
                d = math.hypot(ox, oy) + min(max(qx, qy), 0.0) - r
                if d > 0.5:
                    c = OUTER
                elif d > -0.5:
                    c = border
                else:
                    c = bg
                self.px[y * self.w + x] = [float(c[0]), float(c[1]), float(c[2])]

    def poly(self, pts, color, alpha=1.0):
        """Fill polygon; pts in glyph coordinates (26x20 box)."""
        p = [((GX + x) * SS, (GY + y) * SS) for x, y in pts]
        ys = [q[1] for q in p]
        y0 = max(0, int(min(ys)))
        y1 = min(self.h - 1, int(max(ys)) + 1)
        n = len(p)
        for y in range(y0, y1 + 1):
            yc = y + 0.5
            xs = []
            for i in range(n):
                x1, ya = p[i]
                x2, yb = p[(i + 1) % n]
                if (ya <= yc < yb) or (yb <= yc < ya):
                    t = (yc - ya) / (yb - ya)
                    xs.append(x1 + t * (x2 - x1))
            xs.sort()
            for j in range(0, len(xs) - 1, 2):
                xa = max(0, int(math.ceil(xs[j] - 0.5)))
                xb = min(self.w - 1, int(math.floor(xs[j + 1] - 0.5)))
                for x in range(xa, xb + 1):
                    cell = self.px[y * self.w + x]
                    for k in range(3):
                        cell[k] = cell[k] * (1 - alpha) + color[k] * alpha

    def rect(self, x, y, w, h, color, alpha=1.0):
        self.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], color, alpha)

    def line(self, x1, y1, x2, y2, t, color):
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        if length == 0:
            return
        nx, ny = -dy / length * t / 2, dx / length * t / 2
        self.poly(
            [(x1 + nx, y1 + ny), (x2 + nx, y2 + ny),
             (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)],
            color,
        )

    def stroke_rect(self, x, y, w, h, t, color):
        self.rect(x - t / 2, y - t / 2, w + t, t, color)
        self.rect(x - t / 2, y + h - t / 2, w + t, t, color)
        self.rect(x - t / 2, y + t / 2, t, h - t, color)
        self.rect(x + w - t / 2, y + t / 2, t, h - t, color)

    def dashed_rect(self, x, y, w, h, t, color, dash=2.0, gap=2.0):
        edges = [
            ((x, y), (x + w, y)), ((x + w, y), (x + w, y + h)),
            ((x + w, y + h), (x, y + h)), ((x, y + h), (x, y)),
        ]
        for (ax, ay), (bx, by) in edges:
            length = math.hypot(bx - ax, by - ay)
            ux, uy = (bx - ax) / length, (by - ay) / length
            s = 0.0
            while s < length:
                seg = min(dash, length - s)
                self.line(ax + ux * s, ay + uy * s,
                          ax + ux * (s + seg), ay + uy * (s + seg), t, color)
                s += dash + gap

    def rot_rect(self, x, y, w, h, angle_deg, cx, cy):
        a = math.radians(angle_deg)
        cos_a, sin_a = math.cos(a), math.sin(a)

        def rot(px, py):
            dx, dy = px - cx, py - cy
            return (cx + dx * cos_a - dy * sin_a, cy + dx * sin_a + dy * cos_a)

        return [rot(x, y), rot(x + w, y), rot(x + w, y + h), rot(x, y + h)]

    def stroke_poly(self, pts, t, color):
        n = len(pts)
        for i in range(n):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % n]
            self.line(x1, y1, x2, y2, t, color)

    def to_png(self):
        rows = bytearray()
        for y in range(TILE_H):
            rows.append(0)
            for x in range(TILE_W):
                acc = [0.0, 0.0, 0.0]
                for sy in range(SS):
                    for sx in range(SS):
                        cell = self.px[(y * SS + sy) * self.w + (x * SS + sx)]
                        for k in range(3):
                            acc[k] += cell[k]
                for k in range(3):
                    rows.append(max(0, min(255, int(round(acc[k] / (SS * SS))))))

        def chunk(tag, data):
            return (struct.pack(">I", len(data)) + tag + data +
                    struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

        return (b"\x89PNG\r\n\x1a\n" +
                chunk(b"IHDR", struct.pack(">IIBBBBB", TILE_W, TILE_H, 8, 2, 0, 0, 0)) +
                chunk(b"IDAT", zlib.compress(bytes(rows), 9)) +
                chunk(b"IEND", b""))


def arrow_head(cv, tip_x, tip_y, from_x, from_y, size, t, color):
    """Two barbs at the tip of a line arriving from (from_x, from_y)."""
    dx, dy = tip_x - from_x, tip_y - from_y
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    for side in (1, -1):
        bx = tip_x - ux * size - uy * side * size * 0.7
        by = tip_y - uy * size + ux * side * size * 0.7
        cv.line(tip_x, tip_y, bx, by, t, color)


# ---- Glyphs (coordinates match the approved mock's 26x20 SVGs) ----

def g_full_bleed(cv, p):
    cv.rect(1, 1, 24, 18, p["fl"])

def g_near_full(cv, p):
    cv.dashed_rect(1, 1, 24, 18, 1.4, p["st"])
    cv.rect(4, 4, 18, 12, p["fl"])

def g_soft_background(cv, p):
    cv.rect(1, 1, 24, 18, p["fd"])
    cv.rect(8, 3, 10, 14, p["fl"])

def g_window_frame(cv, p):
    cv.stroke_rect(3, 2, 20, 16, 2.6, p["st"])
    cv.rect(7, 6, 12, 8, p["fl"])

def g_print(cv, p):
    outer = cv.rot_rect(5, 3, 16, 14, -7, 13, 10)
    inner = cv.rot_rect(7.5, 5.5, 11, 9, -7, 13, 10)
    cv.stroke_poly(outer, 1.4, p["st"])
    cv.poly(inner, p["fl"])

def g_contained(cv, p):
    cv.dashed_rect(1, 1, 24, 18, 1.4, p["st"])
    cv.rect(8, 6, 10, 8, p["fl"])

def g_gentle_push(cv, p):
    cv.stroke_rect(6, 5, 14, 10, 1.4, p["st"])
    cv.line(3, 3, 6, 6, 1.4, p["st"])
    cv.line(3, 3, 6, 3, 1.4, p["st"])
    cv.line(3, 3, 3, 6, 1.4, p["st"])
    cv.line(23, 17, 20, 14, 1.4, p["st"])
    cv.line(23, 17, 20, 17, 1.4, p["st"])
    cv.line(23, 17, 23, 14, 1.4, p["st"])

def g_gentle_drift(cv, p):
    cv.stroke_rect(4, 5, 14, 10, 1.4, p["st"])
    cv.line(15, 10, 23, 10, 1.4, p["st"])
    arrow_head(cv, 23, 10, 15, 10, 3.2, 1.4, p["st"])

def g_push_drift(cv, p):
    cv.stroke_rect(4, 6, 13, 9, 1.4, p["st"])
    cv.line(14, 8, 22, 3, 1.4, p["st"])
    arrow_head(cv, 22, 3, 14, 8, 3.0, 1.4, p["st"])
    cv.line(15, 11, 23, 11, 1.4, p["st"])
    arrow_head(cv, 23, 11, 15, 11, 3.0, 1.4, p["st"])

def g_cut(cv, p):
    cv.rect(1, 3, 10.5, 14, p["fl"])
    cv.rect(14.5, 3, 10.5, 14, p["fd"])

def g_dissolve(cv, p):
    cv.rect(1, 3, 14, 14, p["fl"])
    cv.rect(11, 3, 14, 14, p["fd"], alpha=0.62)

def g_push_transition(cv, p):
    cv.rect(1, 3, 9, 14, p["fd"])
    cv.rect(10, 3, 15, 14, p["fl"])
    cv.line(13, 10, 21, 10, 1.2, p["st"])
    arrow_head(cv, 21, 10, 13, 10, 3.0, 1.2, p["st"])

def color_bands(a, b, c):
    def draw(cv, p):
        cv.rect(1, 3, 8, 14, a)
        cv.rect(9, 3, 8, 14, b)
        cv.rect(17, 3, 8, 14, c)
    return draw

def g_hero_support(cv, p):
    cv.rect(1, 2, 15, 16, p["fl"])
    cv.rect(18, 7, 7, 8, p["fd"])

def g_offset_pair(cv, p):
    cv.rect(2, 2, 12, 9, p["fd"])
    cv.rect(12, 9, 12, 9, p["fl"])

def g_window_pair(cv, p):
    cv.stroke_rect(2, 4, 10, 12, 2.0, p["st"])
    cv.stroke_rect(14, 4, 10, 12, 2.0, p["st"])

def g_prints(cv, p):
    left = cv.rot_rect(2, 4, 11, 11, -8, 8, 10)
    cv.stroke_poly(left, 1.4, p["st"])
    right = cv.rot_rect(14, 5, 10, 10, 6, 19, 10)
    cv.poly(right, p["fl"])

def g_clean_pair(cv, p):
    cv.rect(3, 5, 9, 10, p["fl"])
    cv.rect(14, 5, 9, 10, p["fl"])

def g_edge_to_edge(cv, p):
    cv.rect(1, 1, 11.4, 18, p["fl"])
    cv.rect(13.6, 1, 11.4, 18, p["fd"])
    cv.rect(12.6, 1, 1, 18, SEAM)


ICONS = [
    ("fullBleed", g_full_bleed),
    ("nearFull", g_near_full),
    ("softBackground", g_soft_background),
    ("windowFrame", g_window_frame),
    ("print", g_print),
    ("contained", g_contained),
    ("gentlePush", g_gentle_push),
    ("gentleDrift", g_gentle_drift),
    ("pushDrift", g_push_drift),
    ("cut", g_cut),
    ("dissolve", g_dissolve),
    ("pushTransition", g_push_transition),
    ("colorOriginal", color_bands((0xB0, 0x8A, 0x5E), (0x7D, 0x9B, 0x6E), (0x68, 0x80, 0x9F))),
    ("colorMono", color_bands((0xE8, 0xE8, 0xE8), (0x8C, 0x8C, 0x8C), (0x2E, 0x2E, 0x2E))),
    ("colorFaded", color_bands((0xC9, 0xB8, 0xA6), (0xB3, 0xBC, 0xAB), (0xA8, 0xB1, 0xBD))),
    ("heroSupport", g_hero_support),
    ("offsetPair", g_offset_pair),
    ("windowPair", g_window_pair),
    ("prints", g_prints),
    ("cleanPair", g_clean_pair),
    ("edgeToEdge", g_edge_to_edge),
]


def escape_es3(data):
    out = []
    for b in data:
        if b == 0x5C:
            out.append("\\\\")
        elif b == 0x22:
            out.append('\\"')
        elif 32 <= b <= 126:
            out.append(chr(b))
        else:
            out.append("\\x%02X" % b)
    return "".join(out)


def render(name, glyph, state):
    cv = Canvas()
    palette = PALETTES[state]
    cv.base_tile(palette["bg"], palette["border"])
    glyph(cv, palette)
    return cv.to_png()


def main():
    lines = []
    for name, glyph in ICONS:
        off = escape_es3(render(name, glyph, "off"))
        on = escape_es3(render(name, glyph, "on"))
        lines.append('    ICON_PNG.%s = ["%s", "%s"];' % (name, off, on))
    body = "\n".join(lines)

    if len(sys.argv) >= 3 and sys.argv[1] == "--splice":
        path = sys.argv[2]
        with open(path, "r", encoding="utf-8") as handle:
            text = handle.read()
        begin = "/*__ICON_DATA_BEGIN__*/"
        end = "/*__ICON_DATA_END__*/"
        i = text.index(begin) + len(begin)
        j = text.index(end)
        text = text[:i] + "\n" + body + "\n    " + text[j:]
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(text)
        print("spliced %d icons into %s" % (len(ICONS), path))
    else:
        out = __file__.replace("make_icons.py", "icon-data.jsxinc")
        with open(out, "w", encoding="utf-8") as handle:
            handle.write(body + "\n")
        print("wrote %s" % out)


if __name__ == "__main__":
    main()
