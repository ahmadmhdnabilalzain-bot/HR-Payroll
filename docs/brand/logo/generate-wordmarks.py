from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import os, json

FD = "node_modules/@fontsource"
def fpath(fam, w): return f"{FD}/{fam}/files/{fam}-latin-{w}-normal.woff"

_cache = {}
def font(fam, w):
    k = (fam, w)
    if k not in _cache:
        _cache[k] = TTFont(fpath(fam, w))
    return _cache[k]

def layout(segments, track):
    """segments: [(text, fam, weight, size_em_scale)] -> list of path strings
    placed on a common baseline; returns (path_d, width, ascent_top, descent)."""
    x = 0.0
    ds = []
    ymin, ymax = 1e9, -1e9
    CAP = 1000.0
    for text, fam, w, sc in segments:
        f = font(fam, w)
        gs = f.getGlyphSet()
        cmap = f.getBestCmap()
        upm = f["head"].unitsPerEm
        k = (CAP / upm) * sc
        for ch in text:
            gn = cmap[ord(ch)]
            g = gs[gn]
            pen = SVGPathPen(gs)
            tp = TransformPen(pen, (k, 0, 0, -k, x, 0))
            g.draw(tp)
            d = pen.getCommands()
            if d:
                ds.append(d)
                bp = BoundsPen(gs); g.draw(bp)
                if bp.bounds:
                    ymin = min(ymin, -bp.bounds[3] * k)
                    ymax = max(ymax, -bp.bounds[1] * k)
            x += g.width * k + track
    x -= track
    return " ".join(ds), x, ymin, ymax

def svg(name, segments, track, fg, bg=None, pad=60):
    d, w, ymin, ymax = layout(segments, track)
    h = ymax - ymin
    W, H = w + 2 * pad, h + 2 * pad
    rect = f'<rect width="{W:.1f}" height="{H:.1f}" fill="{bg}"/>' if bg else ""
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H:.1f}" '
         f'role="img" aria-label="MubinFlow">{rect}'
         f'<g transform="translate({pad:.1f},{pad - ymin:.1f})" fill="{fg}">'
         f'<path d="{d}"/></g></svg>')
    return s, (W, H)

V = [
 ("01-montserrat-bold", "Montserrat Bold, tight",
  [("MubinFlow","montserrat",700,1.0)], 4),
 ("02-montserrat-two-weight", "Montserrat Bold + Light",
  [("Mubin","montserrat",700,1.0),("Flow","montserrat",300,1.0)], 6),
 ("03-outfit-semibold", "Outfit SemiBold, open",
  [("MubinFlow","outfit",600,1.0)], 14),
 ("04-urbanist-bold", "Urbanist Bold",
  [("MubinFlow","urbanist",700,1.0)], 8),
 ("05-sora-semibold", "Sora SemiBold, technical",
  [("MubinFlow","sora",600,1.0)], 10),
 ("06-redhat-extrabold", "Red Hat Display ExtraBold",
  [("MubinFlow","red-hat-display",800,1.0)], 6),
 ("07-jost-wide", "Jost Medium, wide (Futura feel)",
  [("MubinFlow","jost",500,1.0)], 34),
 ("08-cinzel-luxe", "Cinzel SemiBold (M and F as capitals, rest small caps)",
  [("MubinFlow","cinzel",600,1.0)], 22),
 ("09-syncopate-caps", "Syncopate Bold, all caps (reference)",
  [("MUBINFLOW","syncopate",700,0.92)], 18),
]
meta = []
for key, label, segs, track in V:
    for mode, fg, bg in (("light", "#10151c", None), ("dark", "#f4f6f8", None)):
        s, (W, H) = svg(key, segs, track, fg, bg)
        open(f"out/{key}.{mode}.svg", "w").write(s)
    meta.append({"key": key, "label": label})
json.dump(meta, open("out/meta.json", "w"))
print("ok", len(V))
