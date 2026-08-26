#!/usr/bin/env python3
"""
Gera assets/cadence.webp — a miniatura do caso de estudo do cadence.

PORQUÊ ISTO E NÃO UMA CAPTURA DE ECRÃ.
Uma captura do cadence a correr precisa de um PostgreSQL, do backend e do
frontend levantados ao mesmo tempo, e depois de alguém fazer uma entrevista
inteira até haver um scorecard para fotografar. Isso é um ritual que ninguém
repete quando é preciso regenerar a imagem, e uma imagem que não se consegue
regenerar torna-se falsa mal o produto mude.

O que está desenhado aqui não é uma aproximação. É o output verdadeiro:
`_SCRIPTED_SCORE` em backend/app/llm/client.py — o mesmo objecto que o
ScriptedProvider devolve quando a app corre sem chave de API — lido do
ficheiro, e as dimensões conferidas contra EXPECTED_DIMENSIONS em
app/llm/scoring.py. Se alguém mudar a rubrica no backend e não regenerar isto,
o script recusa-se a escrever a imagem em vez de mentir em silêncio.

A faixa de cima é o formato de fio real do SSE, com o detalhe que importa: os
eventos separam-se por uma linha em branco, e o que vem depois do último
separador é um evento parcial que tem de ficar no buffer.

Correr:  python3 tools/gerar-cadence-thumb.py
"""
import ast
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1600, 1000
BG = (7, 7, 9)
FG = (238, 238, 240)
ACCENT = (255, 61, 31)
LINE = (255, 255, 255)

RAIZ = Path(__file__).resolve().parent.parent
CADENCE = RAIZ.parent / "cadence" / "backend"


# --- ler o output verdadeiro do backend --------------------------------------

def ler_scorecard() -> dict:
    """Extrai _SCRIPTED_SCORE de app/llm/client.py sem importar o módulo.

    Importar puxaria settings, SQLAlchemy e um ficheiro .env. `ast` lê a
    atribuição literal e mais nada, o que também significa que isto continua a
    funcionar quando o backend ganhar dependências novas.
    """
    fonte = (CADENCE / "app" / "llm" / "client.py").read_text(encoding="utf-8")
    arvore = ast.parse(fonte)
    for no in arvore.body:
        if isinstance(no, ast.Assign) and any(
            isinstance(a, ast.Name) and a.id == "_SCRIPTED_SCORE" for a in no.targets
        ):
            return ast.literal_eval(no.value)
    raise SystemExit("_SCRIPTED_SCORE não encontrado em app/llm/client.py")


def ler_dimensoes_esperadas() -> set:
    fonte = (CADENCE / "app" / "llm" / "scoring.py").read_text(encoding="utf-8")
    bloco = re.search(r"EXPECTED_DIMENSIONS\s*=\s*\{(.*?)\}", fonte, re.S)
    if not bloco:
        raise SystemExit("EXPECTED_DIMENSIONS não encontrado em app/llm/scoring.py")
    return set(re.findall(r'"([^"]+)"', bloco.group(1)))


def font(caminhos, tamanho):
    for c in caminhos:
        p = Path(c)
        if p.exists():
            return ImageFont.truetype(str(p), tamanho)
    return ImageFont.load_default()


MONO = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf",
        "C:/Windows/Fonts/consola.ttf"]
MONO_B = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
          "/usr/share/fonts/truetype/liberation2/LiberationMono-Bold.ttf",
          "C:/Windows/Fonts/consolab.ttf"]
SANS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/segoeui.ttf"]
SANS_B = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
          "C:/Windows/Fonts/segoeuib.ttf"]


def rgba(cor, a):
    return (cor[0], cor[1], cor[2], int(255 * a))


def grain(a, amount=5, seed=11):
    rng = np.random.default_rng(seed)
    lum = a.mean(axis=2, keepdims=True) / 255.0
    n = rng.normal(0, amount, a.shape) * (1.25 - lum)
    return np.clip(a + n, 0, 255)


def vignette(a, strength=0.45):
    y, x = np.ogrid[:H, :W]
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    m = np.clip(1 - strength * np.clip(d - 0.35, 0, None) ** 1.6, 0, 1)[..., None]
    return a * m


def desenhar(score: dict) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img, "RGBA")

    f_lbl = font(MONO, 21)          # etiquetas, uppercase, tracking largo
    f_wire = font(MONO, 23)         # a faixa SSE
    f_dim = font(SANS, 30)
    f_note = font(SANS, 23)
    f_big = font(SANS_B, 132)       # o número
    f_num = font(MONO_B, 27)

    def etiqueta(x, y, texto, cor=LINE, alpha=0.42, fonte=None):
        """Uppercase com letter-spacing, que o PIL não faz por si."""
        fonte = fonte or f_lbl
        for ch in texto.upper():
            d.text((x, y), ch, font=fonte, fill=rgba(cor, alpha))
            x += d.textlength(ch, font=fonte) + 3.4
        return x

    M = 84                                    # margem
    d.line([(M, 92), (W - M, 92)], fill=rgba(LINE, 0.10), width=1)

    # ── faixa de cima: o formato de fio do SSE ───────────────────────────────
    etiqueta(M, 58, "text/event-stream")
    d.text((W - M - d.textlength("POST /sessions/:id/answer", font=f_lbl), 58),
           "POST /sessions/:id/answer", font=f_lbl, fill=rgba(LINE, 0.30))

    y = 132
    quadros = [
        ('event: token', 1.0), ('data: {"t":"Walk"}', 1.0), ('', 0),
        ('event: token', 1.0), ('data: {"t":" me"}', 1.0), ('', 0),
        ('event: token', 1.0), ('data: {"t":" thro', 0.42),
    ]
    x = M
    for texto, a in quadros:
        if not texto:                          # a linha em branco separa eventos
            d.line([(x + 8, y + 6), (x + 8, y + 26)], fill=rgba(ACCENT, 0.55), width=2)
            x += 34
            continue
        cor = FG if a >= 1.0 else FG
        d.text((x, y), texto, font=f_wire, fill=rgba(cor, 0.86 if a >= 1 else 0.34))
        x += d.textlength(texto, font=f_wire) + 26

    d.text((x + 2, y), "▌", font=f_wire, fill=rgba(ACCENT, 0.9))
    etiqueta(M, y + 44, "partial event — stays in the buffer", ACCENT, 0.75,
             fonte=font(MONO, 18))

    d.line([(M, y + 96), (W - M, y + 96)], fill=rgba(LINE, 0.08), width=1)

    # ── o scorecard verdadeiro ───────────────────────────────────────────────
    top = 300
    etiqueta(M, top, "scorecard")

    n = str(score["overall"])
    d.text((M - 8, top + 34), n, font=f_big, fill=FG)
    largura_n = d.textlength(n, font=f_big)
    d.text((M + largura_n + 4, top + 108), "/100", font=f_num, fill=rgba(LINE, 0.34))

    # O resumo, palavra por palavra como o backend o devolve. Ocupa a coluna
    # esquerda porque um número sozinho não diz nada — a diferença entre isto e
    # um dashboard é a frase que justifica o número.
    f_sum = font(SANS, 24)
    cx, cy, cw = M, top + 210, 330
    linha = ""
    for palavra in score["summary"].replace("--", "—").split():
        teste = (linha + " " + palavra).strip()
        if d.textlength(teste, font=f_sum) > cw and linha:
            d.text((cx, cy), linha, font=f_sum, fill=rgba(LINE, 0.46))
            cy += 34
            linha = palavra
        else:
            linha = teste
        if cy > H - 220:                       # nunca invade o rodapé
            linha = linha + " …"
            break
    if linha:
        d.text((cx, cy), linha, font=f_sum, fill=rgba(LINE, 0.46))

    # ── as cinco dimensões, com as barras ────────────────────────────────────
    col = M + 420
    larg = W - M - col - 30
    yy = top + 26
    for dim in score["dimensions"]:
        d.text((col, yy), dim["name"], font=f_dim, fill=rgba(FG, 0.92))

        # cinco caixas, preenchidas até à nota. Uma barra contínua dava a ideia
        # de uma percentagem; a escala é de 1 a 5 e discreta, e a imagem deve
        # dizer isso.
        bx = col + larg - 5 * 34
        for i in range(5):
            cheio = i < dim["score"]
            caixa = [bx + i * 34, yy + 6, bx + i * 34 + 24, yy + 30]
            if cheio:
                d.rectangle(caixa, fill=rgba(ACCENT, 0.88))
            else:
                d.rectangle(caixa, outline=rgba(LINE, 0.18), width=1)

        d.text((col, yy + 38), dim["note"], font=f_note, fill=rgba(LINE, 0.40))
        yy += 88

    # ── rodapé: a stack, à esquerda; o que a torna real, à direita ───────────
    base = H - 96
    d.line([(M, base - 34), (W - M, base - 34)], fill=rgba(LINE, 0.08), width=1)
    etiqueta(M, base, "fastapi · postgres 16 · next.js · sse")
    dir_txt = "44 tests · real postgres"
    xw = W - M - (d.textlength(dir_txt.upper(), font=f_lbl) + 3.4 * len(dir_txt))
    etiqueta(xw, base, dir_txt, ACCENT, 0.62)

    return img


if __name__ == "__main__":
    score = ler_scorecard()
    esperadas = ler_dimensoes_esperadas()
    presentes = {dim["name"] for dim in score["dimensions"]}

    # Uma miniatura desactualizada é pior do que nenhuma: continua a parecer o
    # produto muito depois de deixar de o ser. Se a rubrica mudou no backend,
    # isto pára aqui em vez de escrever uma imagem que já não é verdade.
    if presentes != esperadas:
        print("A rubrica do backend mudou. Diferença:", file=sys.stderr)
        print("  só no scorecard:", sorted(presentes - esperadas), file=sys.stderr)
        print("  só em EXPECTED_DIMENSIONS:", sorted(esperadas - presentes), file=sys.stderr)
        raise SystemExit(1)

    for dim in score["dimensions"]:
        if not 1 <= dim["score"] <= 5:
            raise SystemExit(f"nota fora da escala 1-5: {dim}")

    out = np.asarray(desenhar(score)).astype(np.float64)
    out = vignette(grain(out))
    destino = RAIZ / "assets" / "cadence.webp"
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(
        destino, "WEBP", quality=76, method=6
    )
    print(f"{destino} escrito — {destino.stat().st_size // 1024} KB")
