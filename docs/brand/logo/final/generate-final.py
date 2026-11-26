from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FD = "node_modules/@fontsource/montserrat/files"
def load(w): return TTFont(f"{FD}/montserrat-latin-{w}-normal.woff")
BOLD, LIGHT = load(700), load(300)

INK, PAPER = "#10151c", "#f4f6f8"
TRACK = 5          # letter spacing (font units at 1000 cap scale)
JOIN = 1           # extra optical gap where Bold meets Light (n | F)

def glyphs(font, text, x, track, scale=1.0):
    gs = font.getGlyphSet(); cmap = font.getBestCmap()
    k = (1000.0 / font["head"].unitsPerEm) * scale
    out = []; ymin, ymax = 1e9, -1e9
    for i, ch in enumerate(text):
        g = gs[cmap[ord(ch)]]
        pen = SVGPathPen(gs)
        g.draw(TransformPen(pen, (k, 0, 0, -k, x, 0)))
        d = pen.getCommands()
        if d: out.append(d)
        bp = BoundsPen(gs); g.draw(bp)
        if bp.bounds:
            ymin = min(ymin, -bp.bounds[3] * k); ymax = max(ymax, -bp.bounds[1] * k)
        x += g.width * k + (track if i < len(text) - 1 else 0)
    return out, x, ymin, ymax

def wordmark_path():
    a, x, y1, y2 = glyphs(BOLD, "Mubin", 0, TRACK)
    b, x2, y3, y4 = glyphs(LIGHT, "Flow", x + TRACK + JOIN, TRACK)
    return " ".join(a + b), x2, min(y1, y3), max(y2, y4)

def wm_svg(fg, bg=None, pad=0):
    d, w, ymin, ymax = wordmark_path()
    h = ymax - ymin; W, H = w + 2 * pad, h + 2 * pad
    rect = f'<rect width="{W:.1f}" height="{H:.1f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H:.1f}" '
            f'role="img" aria-label="MubinFlow">{rect}<g transform="translate({pad:.1f},'
            f'{pad - ymin:.1f})" fill="{fg}"><path d="{d}"/></g></svg>'), (W, H)

def monogram(tile, ink, size=512, radius=0.22, scale=0.50):
    gs = BOLD.getGlyphSet(); cmap = BOLD.getBestCmap(); g = gs[cmap[ord("M")]]
    bp = BoundsPen(gs); g.draw(bp); x0, y0, x1, y1 = bp.bounds
    k = size * scale / (x1 - x0)
    tx = (size - (x1 - x0) * k) / 2 - x0 * k
    ty = (size + (y1 - y0) * k) / 2 + y0 * k   # flip y, centre vertically
    pen = SVGPathPen(gs); g.draw(TransformPen(pen, (k, 0, 0, -k, tx, ty)))
    r = size * radius
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
            f'role="img" aria-label="MubinFlow"><rect width="{size}" height="{size}" '
            f'rx="{r:.0f}" fill="{tile}"/><path d="{pen.getCommands()}" fill="{ink}"/></svg>')

files = {}
for name, fg in (("ink", INK), ("paper", PAPER), ("black", "#000000"), ("white", "#ffffff")):
    s, _ = wm_svg(fg); files[f"mubinflow-wordmark-{name}.svg"] = s
files["mubinflow-monogram-dark.svg"] = monogram(INK, PAPER)
files["mubinflow-monogram-light.svg"] = monogram(PAPER, INK)
files["favicon.svg"] = monogram(INK, PAPER, size=64, radius=0.22, scale=0.66)
for n, s in files.items(): open(f"final/{n}", "w").write(s)
print(list(files))
