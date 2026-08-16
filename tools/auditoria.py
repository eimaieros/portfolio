#!/usr/bin/env python3
"""
Auditoria estática do site: peso, recursos externos, acessibilidade e SEO.

Não substitui o Lighthouse — não mede tempo de execução nem layout shift. Serve
para apanhar, sem browser, a classe de problemas que se vê só a ler o ficheiro:
alt em falta, hierarquia de títulos partida, metadados de partilha ausentes,
scripts que bloqueiam o render, imagens acima do orçamento.

Correr: python3 tools/auditoria.py
"""
import gzip
import os
import re
import sys

PATH = sys.argv[1] if len(sys.argv) > 1 else 'site/index.html'
ASSETS = 'assets'
ORCAMENTO_IMG_KB = 400

src = open(PATH, encoding='utf-8').read()
head = src[:src.index('</head>')]
body = src[src.index('<body'):]
# comentários HTML e JS não contam como marcação
import re as _re
body_limpo = _re.sub(r'<!--.*?-->|/\*.*?\*/', ' ', body, flags=_re.S)

falhas = []


def linha(rotulo, valor, mau=False):
    marca = '  !!' if mau else '  ok'
    print(f'{marca}  {rotulo:34} {valor}')
    if mau:
        falhas.append(rotulo)


print('\n=== PESO ===')
raw = len(src.encode())
gz = len(gzip.compress(src.encode()))
print(f'      {"index.html":22} {raw/1024:8.1f} KB   gzip {gz/1024:6.1f} KB')
total = raw
if os.path.isdir(ASSETS):
    for f in sorted(os.listdir(ASSETS)):
        if f.endswith(('.webp', '.mp4', '.jpg', '.jpeg', '.png', '.avif')):
            n = os.path.getsize(os.path.join(ASSETS, f))
            total += n
            aviso = '  << acima do orçamento' if n / 1024 > ORCAMENTO_IMG_KB else ''
            print(f'      {f:22} {n/1024:8.1f} KB{aviso}')
            if n / 1024 > ORCAMENTO_IMG_KB:
                falhas.append(f'{f} acima de {ORCAMENTO_IMG_KB} KB')
print(f'      {"TOTAL":22} {total/1024:8.1f} KB   (sem fontes nem CDN)')

print('\n=== RECURSOS EXTERNOS ===')
head_sem_noscript = re.sub(r'<noscript>.*?</noscript>', ' ', head, flags=re.S)
for m in re.finditer(r'<(script|link)\b[^>]*?(?:src|href)="(https?://[^"]+)"[^>]*>', head_sem_noscript):
    tag = m.group(0)
    # media="print" + onload é a forma canónica de carregar CSS sem bloquear
    # `canonical`, `icon`, `manifest` e `alternate` têm href mas não são
    # recursos que o browser vá buscar antes de pintar — não bloqueiam nada.
    # Sem esta linha, pôr o canonical fazia a auditoria falhar, o que é
    # exactamente ao contrário do que se quer.
    seguro = any(k in tag for k in ('defer', 'async', 'preload', 'preconnect',
                                    'dns-prefetch', 'media="print"',
                                    'rel="canonical"', 'rel="icon"',
                                    'rel="manifest"', 'rel="alternate"'))
    linha(m.group(2)[:60], 'defer/async/preconnect' if seguro else 'BLOQUEIA O RENDER',
          mau=not seguro)

print('\n=== ACESSIBILIDADE ===')
niveis = [int(h) for h in re.findall(r'<h([1-6])[^>]*>', body_limpo)]
saltos = [f'h{a}->h{b}' for a, b in zip(niveis, niveis[1:]) if b > a + 1]
linha('hierarquia de títulos', ''.join(map(str, niveis)))
linha('saltos de nível', saltos or 'nenhum', mau=bool(saltos))

sem_alt = re.findall(r'<img(?![^>]*\balt=)[^>]*>', body_limpo)
linha('<img> sem alt', len(sem_alt), mau=bool(sem_alt))

canvas = re.findall(r'<canvas[^>]*>', body_limpo)
canvas_ok = [c for c in canvas if 'aria-hidden' in c]
linha('<canvas> escondido de leitores', f'{len(canvas_ok)}/{len(canvas)}',
      mau=len(canvas_ok) < len(canvas))

btn_vazio = re.findall(r'<button(?![^>]*aria-label)[^>]*>\s*</button>', body)
linha('<button> vazio sem aria-label', len(btn_vazio), mau=bool(btn_vazio))

linha('lang no <html>', 'sim' if re.search(r'<html[^>]*\blang=', src) else 'FALTA',
      mau=not re.search(r'<html[^>]*\blang=', src))
linha(':focus-visible definido', 'sim' if 'focus-visible' in src else 'FALTA',
      mau='focus-visible' not in src)
linha('prefers-reduced-motion', f'{src.count("prefers-reduced-motion")}x',
      mau=src.count('prefers-reduced-motion') == 0)
tem_skip = bool(re.search(r'skip-?link|skip to (main|content)', body[:5000], re.I))
linha('skip link', 'sim' if tem_skip else 'FALTA', mau=not tem_skip)

print('\n=== SEO E PARTILHA ===')
for rotulo, agulha in [
    ('<title>', '<title>'),
    ('meta description', 'name=' + '"description"'),
    ('og:title', 'og:title'),
    ('og:description', 'og:description'),
    ('og:image', 'og:image'),
    ('twitter:card', 'twitter:card'),
    ('favicon', 'rel=' + '"icon"'),
    ('JSON-LD (Person)', 'application/ld+json'),
]:
    presente = agulha in head
    linha(rotulo, 'sim' if presente else 'FALTA', mau=not presente)

# O canonical depende do domínio final. Um canonical errado é pior do que
# nenhum — aponta o Google para uma página que não existe. Fica como pendência
# de publicação, não como falha.
tem_canonical = ('rel=' + '"canonical"') in head
estado = 'sim' if tem_canonical else 'por pôr — depende do domínio (ver docs/deploy.md)'
print(f'  {"ok" if tem_canonical else ".."}  {"canonical":34} {estado}')

print()
if falhas:
    print(f'{len(falhas)} ponto(s) a corrigir:')
    for f in falhas:
        print(f'  · {f}')
    sys.exit(1)
print('sem problemas estáticos')
