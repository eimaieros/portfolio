#!/usr/bin/env python3
"""
Gera assets/glaze.webp — a miniatura do caso de estudo do glaze.

PORQUÊ ISTO E NÃO UMA CAPTURA DE ECRÃ.
Uma captura do glaze a correr precisa de uma máquina com WebGPU e de um
momento em que a página esteja a ser deslocada — o efeito depende da
velocidade do scroll, por isso numa página parada não há nada para fotografar.

Em vez de desenhar uma aproximação à mão, esta imagem corre o mesmo algoritmo
que o shader corre: o mesmo campo de curvas de nível que a demo gera em canvas,
deformado pelo mesmo fbm de 4 oitavas e pela mesma ponderação às bordas que
está em src/effects.js. O resultado é output verdadeiro do efeito, não uma
ilustração dele.

Correr:  python3 tools/gerar-glaze-thumb.py
"""
import math
import numpy as np
from PIL import Image

W, H = 1600, 1000
BG = (7, 7, 9)


# --- o mesmo ruído do prelúdio em src/stage.js -------------------------------

def hash21(x, y):
    """Réplica de hash21() em WGSL: fract(fract(p*k) + dot(...)) encadeado."""
    qx = np.modf(x * 123.34)[0]
    qy = np.modf(y * 456.21)[0]
    d = qx * qx + qy * qy + qx * 45.32 + qy * 45.32
    qx = qx + d
    qy = qy + d
    return np.modf(qx * qy)[0]


def noise(x, y):
    ix, iy = np.floor(x), np.floor(y)
    fx, fy = x - ix, y - iy
    ux = fx * fx * (3.0 - 2.0 * fx)
    uy = fy * fy * (3.0 - 2.0 * fy)
    a = hash21(ix, iy)
    b = hash21(ix + 1, iy)
    c = hash21(ix, iy + 1)
    d = hash21(ix + 1, iy + 1)
    return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy


def fbm(x, y):
    v = np.zeros_like(x)
    amp = 0.5
    qx, qy = x.copy(), y.copy()
    for _ in range(4):
        v += amp * noise(qx, qy)
        qx *= 2.0
        qy *= 2.0
        amp *= 0.5
    return v


# --- o mesmo campo que demo/index.html desenha em canvas ---------------------

def field(seed, hue_a, hue_b):
    """Gradiente diagonal + 42 curvas de nível, como field() na demo."""
    import colorsys
    img = np.zeros((H, W, 3), dtype=np.float64)

    gx = np.linspace(0, 1, W)[None, :]
    gy = np.linspace(0, 1, H)[:, None]
    t = np.clip((gx + gy) / 2.0, 0, 1)

    def hsl(h, s, l):
        r, g, b = colorsys.hls_to_rgb(h / 360.0, l, s)
        return np.array([r, g, b]) * 255.0

    c0 = hsl(hue_a, 0.62, 0.12)
    c1 = hsl((hue_a + hue_b) / 2, 0.54, 0.26)
    c2 = hsl(hue_b, 0.70, 0.09)
    lo = t < 0.5
    k = np.where(lo, t * 2, (t - 0.5) * 2)[..., None]
    img = np.where(lo[..., None], c0 + (c1 - c0) * k, c1 + (c2 - c1) * k)

    # curvas de nível, aditivas — é o que torna a deformação legível
    rng_state = [seed]

    def rnd():
        rng_state[0] = (rng_state[0] * 1103515245 + 12345) % 2147483648
        return rng_state[0] / 2147483648

    line = hsl(hue_b, 0.90, 0.62)
    xs = np.arange(W)
    for i in range(42):
        y0 = rnd() * H
        alpha = 0.03 + rnd() * 0.07
        width = 1 + rnd() * 2.5
        ys = y0 + np.sin(xs * 0.006 * (1600 / W) + i) * 60 + \
            np.sin(xs * 0.019 * (1600 / W) + i * 2) * 22
        for off in np.arange(-width, width + 0.5, 0.5):
            yy = np.clip((ys + off).astype(int), 0, H - 1)
            img[yy, xs] = np.minimum(img[yy, xs] + line * alpha * 0.5, 255)

    return img


# --- o efeito displace, tal como em src/effects.js ---------------------------

def displace(img, strength=1.0, vel=1.0, t=3.7, scale=7.0):
    """
    let p = vec2f(uv.x * aspect, uv.y) * scale
    let amount = s * 0.06 * clamp(abs(vel), 0, 1)
    let edge = smoothstep(0, 0.55, length(uv - 0.5))

    strength e vel no máximo, e `scale` acima do default de 3.0: é o efeito no
    limite do que a biblioteca faz. Numa miniatura de 640px, o default seria
    verdadeiro e ilegível — 20px de deslocação a baixa frequência lê-se como
    uma imagem tremida, não como um efeito. `scale` é um parâmetro real do
    efeito, não uma licença poética.
    """
    aspect = W / H
    uvx = (np.arange(W)[None, :] + 0.5) / W * np.ones((H, 1))
    uvy = (np.arange(H)[:, None] + 0.5) / H * np.ones((1, W))

    px, py = uvx * aspect * scale, uvy * scale
    nx = fbm(px + t * 0.10, py + t * 0.06)
    ny = fbm(px - t * 0.08 + 17.0, py + t * 0.11 + 17.0)

    amount = strength * 0.06 * min(abs(vel), 1.0)
    dirx = (nx - 0.5) * 2.0
    diry = (ny - 0.5) * 2.0

    d = np.sqrt((uvx - 0.5) ** 2 + (uvy - 0.5) ** 2)
    e = np.clip(d / 0.55, 0, 1)
    edge = e * e * (3 - 2 * e)

    # Rampa da esquerda para a direita: a mesma imagem, intacta de um lado e
    # deformada do outro. É a história da biblioteca numa só imagem — e a razão
    # de as curvas de nível estarem lá, porque numa fotografia esta diferença
    # não se via.
    ramp = np.clip((uvx - 0.30) / 0.45, 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)

    wx = np.clip(uvx + dirx * amount * edge * ramp, 0, 1)
    wy = np.clip(uvy + diry * amount * edge * ramp, 0, 1)

    sx = np.clip((wx * W).astype(int), 0, W - 1)
    sy = np.clip((wy * H).astype(int), 0, H - 1)
    return img[sy, sx]


def grain(a, amount=6, seed=5):
    rng = np.random.default_rng(seed)
    lum = a.mean(axis=2, keepdims=True) / 255.0
    n = rng.normal(0, amount, a.shape) * (1.25 - lum)
    return np.clip(a + n, 0, 255)


def vignette(a, strength=0.5):
    y, x = np.ogrid[:H, :W]
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    m = np.clip(1 - strength * np.clip(d - 0.35, 0, None) ** 1.6, 0, 1)[..., None]
    return a * m


if __name__ == '__main__':
    # Os tons da demo são livres; aqui usam-se os do site (#ff3d1f e vizinhos)
    # para a miniatura assentar na grelha ao lado das outras.
    base = field(91, 28, 8)
    out = displace(base)

    # No browser o clamp das coordenadas é invisível: o elemento tem píxeis
    # para lá da borda visível. Aqui não tem, e o clamp esborrata a primeira e
    # a última linha. Corta-se a margem em vez de fingir que não acontece.
    m = int(H * 0.06)
    out = out[m:H - m, m:W - m]
    out = np.asarray(
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
    ).astype(np.float64)

    out = vignette(grain(out))
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(
        # q70 e não 82: isto é um campo de gradientes suaves, onde o WebP se
        # porta muito melhor do que numa fotografia. A 82 ficava em 108 KB por
        # nada — três vezes o peso da miniatura do framebudget ao lado.
        'assets/glaze.webp', 'WEBP', quality=70, method=6
    )
    print('assets/glaze.webp escrito')
