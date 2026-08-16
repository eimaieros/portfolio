#!/usr/bin/env python3
"""
Gera as imagens do portefólio.

Porquê: o site tem buracos onde deviam estar capturas reais dos projetos e
fotografias do Rock in Rio. Enquanto o João não manda as dele, buracos cinzentos
fariam o site parecer inacabado — que é o oposto do que um portefólio precisa.

Estas imagens são ORIGINAIS, geradas por código. Não são fotografias, não são de
ninguém, não há licença a respeitar. São composições abstratas construídas com os
mesmos ingredientes do site (paleta, grão, curvas de nível), portanto pertencem ali.

Todas se substituem trocando o ficheiro em assets/ pelo mesmo nome.
"""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

BG   = (7, 7, 9)
ACC  = (255, 61, 31)
AMBR = (255, 155, 52)
GRN  = (74, 208, 138)
BLU  = (122, 134, 240)


def grain(img, amount=7, seed=0):
    """Grão de película: mais pesado nas sombras, como num sensor real."""
    rng = np.random.default_rng(seed)
    a = np.asarray(img).astype(np.int16)
    lum = a.mean(axis=2, keepdims=True) / 255.0
    n = rng.normal(0, amount, a.shape[:2])[:, :, None]
    a = a + n * (1.25 - lum)          # sombras recebem mais ruído
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def vignette(img, strength=0.55):
    w, h = img.size
    y, x = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    r = np.sqrt(((x - cx) / cx) ** 2 + ((y - cy) / cy) ** 2)
    m = np.clip(1 - (r ** 2.1) * strength, 0, 1)[:, :, None]
    a = np.asarray(img).astype(np.float32) * m
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def blend(base, layer, mode="screen"):
    a = np.asarray(base).astype(np.float32) / 255
    b = np.asarray(layer).astype(np.float32) / 255
    if mode == "screen":
        c = 1 - (1 - a) * (1 - b)
    else:
        c = a + b
    return Image.fromarray(np.clip(c * 255, 0, 255).astype(np.uint8))


def lerp_col(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


# ─────────────────────────────────────────────────────────────────────────────
def crowd(w=2400, h=1350, seed=7):
    """
    Multidão vista de cima do palco. Não é uma fotografia — é o que a plateia
    parece nos dados: milhares de pontos de luz, densidade a cair com a distância,
    feixes a varrer, névoa a apanhar a luz.
    """
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)

    # céu: gradiente frio em cima, quente na linha do palco
    for y in range(h):
        t = y / h
        if t < 0.42:
            c = lerp_col((10, 10, 16), (18, 14, 22), t / 0.42)
        else:
            c = lerp_col((18, 14, 22), (26, 12, 10), (t - 0.42) / 0.58)
        d.line([(0, y), (w, y)], fill=c)

    # ── feixes de luz a partir do topo ──────────────────────────────────────
    beams = Image.new("RGB", (w, h), (0, 0, 0))
    bd = ImageDraw.Draw(beams)
    origins = [(w * 0.18, -40), (w * 0.38, -40), (w * 0.62, -40), (w * 0.82, -40)]
    for i, (ox, oy) in enumerate(origins):
        ang = math.radians(-72 + i * 12 + rng.uniform(-7, 7))
        length = h * 1.35
        spread = w * 0.055
        tipx = ox + math.cos(ang) * length * 0.6
        tipy = oy - math.sin(ang) * length
        col = [ACC, AMBR, ACC, BLU][i % 4]
        for k in range(26):                        # camadas para dar volume
            f = k / 25
            s = spread * (0.18 + f)
            a = int(95 * (1 - f) ** 1.5)
            bd.polygon([(ox - s * .12, oy), (ox + s * .12, oy),
                        (tipx + s, tipy), (tipx - s, tipy)],
                       fill=(col[0] * a // 255, col[1] * a // 255, col[2] * a // 255))
    beams = beams.filter(ImageFilter.GaussianBlur(30))
    img = blend(img, beams)
    d = ImageDraw.Draw(img)

    # ── névoa em bandas ─────────────────────────────────────────────────────
    haze = Image.new("RGB", (w, h), (0, 0, 0))
    hd = ImageDraw.Draw(haze)
    for i in range(11):
        yy = h * (0.30 + i * 0.06) + rng.uniform(-24, 24)
        hh = rng.uniform(16, 62)
        a = rng.randint(5, 16)
        hd.ellipse([-w * .2, yy, w * 1.2, yy + hh], fill=(a, int(a * .5), int(a * .42)))
    haze = haze.filter(ImageFilter.GaussianBlur(48))
    img = blend(img, haze)

    # ── pontos de luz: telemóveis e pulseiras na plateia ────────────────────
    pts = Image.new("RGB", (w, h), (0, 0, 0))
    pd = ImageDraw.Draw(pts)
    horizon = h * 0.24
    for _ in range(21000):
        # densidade cresce para baixo (perto) e cai para o horizonte (longe)
        u = rng.random() ** 0.55
        y = horizon + u * (h - horizon)
        x = rng.uniform(-40, w + 40)
        depth = (y - horizon) / (h - horizon)          # 0 longe, 1 perto
        r = 0.55 + depth * 3.4 * (0.5 + rng.random())
        br = rng.random()
        if br > 0.982:                                  # poucos flashes fortes
            col, a = (255, 250, 235), 255
            r *= 1.9
        elif br > 0.86:
            col, a = AMBR, int(120 + 110 * rng.random())
        elif br > 0.55:
            col, a = lerp_col(ACC, AMBR, rng.random()), int(60 + 90 * rng.random())
        else:
            col, a = lerp_col((90, 96, 150), BLU, rng.random()), int(28 + 60 * rng.random())
        c = (col[0] * a // 255, col[1] * a // 255, col[2] * a // 255)
        pd.ellipse([x - r, y - r, x + r, y + r], fill=c)
    # bokeh: uma cópia desfocada por baixo dá o halo dos pontos
    img = blend(img, pts.filter(ImageFilter.GaussianBlur(9)))
    img = blend(img, pts.filter(ImageFilter.GaussianBlur(2)))
    img = blend(img, pts)

    # ── clarão do palco: a fonte de toda aquela luz tem de estar algures ────
    glow = Image.new("RGB", (w, h), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w*.12, horizon - h*.16, w*.88, horizon + h*.10], fill=(96, 34, 16))
    gd.ellipse([w*.30, horizon - h*.09, w*.70, horizon + h*.05], fill=(150, 62, 30))
    img = blend(img, glow.filter(ImageFilter.GaussianBlur(120)))

    # ── silhuetas em primeiro plano: cabeças e braços ───────────────────────
    d = ImageDraw.Draw(img)
    base_y = h * 1.02
    x = -60
    while x < w + 60:
        hr = rng.uniform(16, 34)
        hy = base_y - rng.uniform(0, 58)
        d.ellipse([x - hr, hy - hr * 2.5, x + hr, hy + hr], fill=(4, 4, 6))
        d.ellipse([x - hr * 2.5, hy - hr * .3, x + hr * 2.5, hy + hr * 4], fill=(4, 4, 6))
        if rng.random() < 0.22:                          # braço no ar
            ax = x + rng.uniform(-14, 14)
            ay = hy - hr * 2.5 - rng.uniform(50, 150)
            d.line([(x, hy - hr), (ax, ay)], fill=(4, 4, 6), width=int(hr * .5))
            d.ellipse([ax - hr * .32, ay - hr * .32, ax + hr * .32, ay + hr * .32], fill=(4, 4, 6))
        x += rng.uniform(28, 62)

    img = vignette(img, 0.62)
    return grain(img, 6.5, seed)


# ─────────────────────────────────────────────────────────────────────────────
def stage(w=1600, h=1000, seed=3):
    """Frente de palco: estrutura em treliça, ecrã, feixes. Vista do público."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h), (9, 9, 12))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=lerp_col((11, 11, 17), (22, 11, 10), t ** 1.4))

    beams = Image.new("RGB", (w, h), (0, 0, 0))
    bd = ImageDraw.Draw(beams)
    for i in range(7):
        ox = w * (0.12 + i * 0.13)
        ang = math.radians(-95 + (i - 3) * 15)
        tipx, tipy = ox + math.cos(ang) * h * 1.4, h * 1.3
        col = [ACC, AMBR, GRN, BLU, ACC, AMBR, ACC][i]
        for k in range(20):
            f = k / 19
            s = w * 0.035 * (0.2 + f)
            a = int(88 * (1 - f) ** 1.4)
            bd.polygon([(ox - 3, h * .16), (ox + 3, h * .16), (tipx + s, tipy), (tipx - s, tipy)],
                       fill=(col[0] * a // 255, col[1] * a // 255, col[2] * a // 255))
    img = blend(img, beams.filter(ImageFilter.GaussianBlur(22)))
    d = ImageDraw.Draw(img)

    # treliça: dois pilares e uma travessa
    def truss(x0, y0, x1, y1, seg=16):
        d.line([(x0, y0), (x1, y1)], fill=(96, 96, 108), width=6)
        dx, dy = (x1 - x0) / seg, (y1 - y0) / seg
        nx, ny = -dy * .34, dx * .34
        for i in range(seg):
            ax, ay = x0 + dx * i, y0 + dy * i
            d.line([(ax + nx, ay + ny), (ax + dx - nx, ay + dy - ny)], fill=(72, 72, 84), width=3)
        d.line([(x0 + nx * 2, y0 + ny * 2), (x1 + nx * 2, y1 + ny * 2)], fill=(96, 96, 108), width=6)

    truss(w * .10, h * .12, w * .10, h * .92)
    truss(w * .90, h * .12, w * .90, h * .92)
    truss(w * .10, h * .12, w * .90, h * .12)

    # ecrã com barras de dados
    sx0, sy0, sx1, sy1 = w * .22, h * .22, w * .78, h * .62
    d.rectangle([sx0, sy0, sx1, sy1], fill=(13, 13, 18), outline=(46, 46, 54))
    nb = 34
    bw = (sx1 - sx0 - 30) / nb
    for i in range(nb):
        v = (math.sin(i * .42) * .5 + .5) ** 1.6 * rng.uniform(.55, 1)
        bh = (sy1 - sy0 - 40) * v
        c = lerp_col(ACC, AMBR, i / nb)
        bx = sx0 + 15 + i * bw
        d.rectangle([bx, sy1 - 20 - bh, bx + bw * .62, sy1 - 20], fill=c)

    # projectores na travessa
    for i in range(12):
        px = w * (.14 + i * .066)
        d.rectangle([px - 9, h * .12 - 4, px + 9, h * .12 + 16], fill=(30, 30, 36))
        glow = Image.new("RGB", (w, h), (0, 0, 0))
        ImageDraw.Draw(glow).ellipse([px - 26, h * .12 - 12, px + 26, h * .12 + 40],
                                     fill=(90, 26, 12))
        img = blend(img, glow.filter(ImageFilter.GaussianBlur(16)))
        d = ImageDraw.Draw(img)

    d.rectangle([0, h * .90, w, h], fill=(5, 5, 7))
    hz = Image.new("RGB", (w, h), (0, 0, 0))
    hd = ImageDraw.Draw(hz)
    for i in range(9):
        yy = h * (0.34 + i * 0.07) + rng.uniform(-18, 18)
        a = rng.randint(9, 22)
        hd.ellipse([-w*.2, yy, w*1.2, yy + rng.uniform(20, 70)],
                   fill=(a, int(a*.45), int(a*.34)))
    img = blend(img, hz.filter(ImageFilter.GaussianBlur(52)))
    img = vignette(img, 0.42)
    return grain(img, 5.5, seed)


# ─────────────────────────────────────────────────────────────────────────────
def site_card(w, h, title, accent, kind, seed=1):
    """Pré-visualização abstrata de um site: não finge ser uma captura real."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h), (10, 10, 13))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=lerp_col((12, 12, 16), (7, 7, 10), y / h))

    if kind == "code":
        # janelas de código sobrepostas
        for wi, (ox, oy, ww, hh) in enumerate([(w*.06, h*.10, w*.52, h*.62),
                                               (w*.34, h*.30, w*.58, h*.58)]):
            d.rectangle([ox, oy, ox+ww, oy+hh], fill=(14, 14, 19), outline=(38, 38, 46))
            d.rectangle([ox, oy, ox+ww, oy+28], fill=(20, 20, 26))
            for j in range(3):
                d.ellipse([ox+14+j*16, oy+10, ox+22+j*16, oy+18],
                          fill=[accent, (90,90,98), (60,60,68)][j])
            y = oy + 48
            while y < oy + hh - 18:
                ind = rng.choice([0, 1, 1, 2, 2, 3]) * 22
                lw = rng.uniform(.18, .78) * (ww - 40 - ind)
                c = accent if rng.random() < .18 else (
                    (150,150,160) if rng.random() < .3 else (58, 58, 68))
                d.rectangle([ox+20+ind, y, ox+20+ind+lw, y+7], fill=c)
                y += 19
    elif kind == "grid":
        # grelha editorial
        cols, rows = 4, 3
        pad = w * .06
        cw = (w - pad*2 - (cols-1)*14) / cols
        ch = (h - pad*2 - (rows-1)*14) / rows
        for r in range(rows):
            for c in range(cols):
                x0 = pad + c*(cw+14); y0 = pad + r*(ch+14)
                big = (r == 0 and c < 2)
                fill = (18, 18, 23) if not big else (24, 16, 16)
                d.rectangle([x0, y0, x0+cw, y0+ch], fill=fill, outline=(34, 34, 42))
                if rng.random() < .34:
                    d.rectangle([x0+12, y0+ch-26, x0+12+cw*.45, y0+ch-18], fill=accent)
                else:
                    d.rectangle([x0+12, y0+ch-26, x0+12+cw*.62, y0+ch-18], fill=(52, 52, 62))
    else:  # "hero"
        d.rectangle([0, 0, w, h*.58], fill=(15, 12, 14))
        for i in range(90):
            x = rng.uniform(0, w); y = rng.uniform(0, h*.58)
            r = rng.uniform(1, 3.4)
            a = rng.randint(20, 130)
            d.ellipse([x-r, y-r, x+r, y+r],
                      fill=(accent[0]*a//255, accent[1]*a//255, accent[2]*a//255))
        d.rectangle([w*.08, h*.30, w*.62, h*.30+18], fill=(220, 220, 226))
        d.rectangle([w*.08, h*.38, w*.44, h*.38+18], fill=(140, 140, 150))
        d.rectangle([w*.08, h*.50, w*.24, h*.50+34], fill=accent)
        for i in range(3):
            x0 = w*.08 + i*(w*.28)
            d.rectangle([x0, h*.66, x0+w*.26, h*.90], fill=(17, 17, 22), outline=(34, 34, 42))

    # etiqueta
    d.rectangle([0, h-46, w, h], fill=(0, 0, 0))
    d.rectangle([w*.03, h-30, w*.03+10, h-20], fill=accent)
    img = vignette(img, 0.38)
    return grain(img, 4.5, seed)


if __name__ == "__main__":
    import os, sys
    out = sys.argv[1] if len(sys.argv) > 1 else "assets"
    os.makedirs(out, exist_ok=True)

    jobs = [
        ("rir-crowd.webp", crowd(2000, 1125, 7), 62),
        ("rir-hero.webp",  stage(1600, 1000, 3), 82),
        ("portfolio.webp", site_card(1600, 1000, "portfolio", ACC,  "code", 11), 82),
        ("nh.webp",        site_card(1600, 1000, "nh",        AMBR, "hero", 21), 82),
        ("fl.webp",        site_card(1600, 1000, "fl",        GRN,  "grid", 31), 82),
        ("daylight.webp",  site_card(1600, 1000, "daylight",  BLU,  "hero", 41), 82),
    ]
    for name, im, q in jobs:
        p = os.path.join(out, name)
        im.save(p, "WEBP", quality=q, method=6)
        print(f"{name:18} {im.size[0]}x{im.size[1]}  {os.path.getsize(p)/1024:7.1f} KB")
