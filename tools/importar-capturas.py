#!/usr/bin/env python3
"""
Importa capturas reais dos sites para os slots de `assets/`.

Porquê: as imagens geradas por código serviram para o site não ter buracos, mas
uma captura do site verdadeiro vale infinitamente mais num portefólio — é a
diferença entre "ele diz que construiu" e "aqui está".

Fonte das do Rock in Rio: a pasta RIR-report-mockups, preparada pelo próprio
Rodrigo para um relatório interno. São capturas do site que ele desenvolveu,
com o URL na barra. Mostrar o site que se construiu é prática normal de
portefólio — é documentação do trabalho, não republicação de conteúdo alheio.

As imagens geradas continuam disponíveis em tools/gerar-visuais.py, caso se
queira voltar atrás.
"""
import os
import shutil
import sys

from PIL import Image, ImageEnhance

ORIGEM_RIR = '/sessions/gracious-happy-rubin/mnt/RIR-report-mockups'
DESTINO = 'assets'
LARGURA = 1600
QUALIDADE = 80


def enquadrar(im, alvo_racio, fundo=(10, 10, 15)):
    """
    Acrescenta margem para a imagem ficar no rácio do slot.

    O painel de preview é 680x500 (1.36:1) e as capturas são 1.92:1. Sem isto o
    `drawCover` do site corta 14% de cada lado — e o que se corta é justamente a
    moldura da janela do browser, que é o que faz a imagem ler-se como "um site
    a sério". Com a margem, vê-se a captura inteira.
    """
    racio = im.width / im.height
    if abs(racio - alvo_racio) < 0.02:
        return im
    if racio > alvo_racio:                      # larga de mais: cresce em altura
        nova_h = round(im.width / alvo_racio)
        tela = Image.new('RGB', (im.width, nova_h), fundo)
        tela.paste(im, (0, (nova_h - im.height) // 2))
    else:                                       # alta de mais: cresce em largura
        nova_w = round(im.height * alvo_racio)
        tela = Image.new('RGB', (nova_w, im.height), fundo)
        tela.paste(im, ((nova_w - im.width) // 2, 0))
    return tela


def preparar(caminho, destino, largura=LARGURA, escurecer=0.92, contraste=1.06,
             racio=None):
    """
    Redimensiona e assenta a captura na paleta do site.

    O site é quase preto; uma captura de ecrã crua entra a gritar. Um toque de
    escurecimento e de contraste faz com que a imagem pertença à página sem
    deixar de ser legível como "isto é um site a sério".
    """
    im = Image.open(caminho).convert('RGB')
    if racio:
        im = enquadrar(im, racio)
    if im.width > largura:
        h = round(im.height * largura / im.width)
        im = im.resize((largura, h), Image.LANCZOS)
    im = ImageEnhance.Brightness(im).enhance(escurecer)
    im = ImageEnhance.Contrast(im).enhance(contraste)
    im.save(destino, 'WEBP', quality=QUALIDADE, method=6)
    return im.size, os.path.getsize(destino) / 1024


if __name__ == '__main__':
    os.makedirs(DESTINO, exist_ok=True)
    if not os.path.isdir(ORIGEM_RIR):
        sys.exit(f'não encontrei {ORIGEM_RIR}')

    # guardar as geradas, para se poder comparar ou voltar atrás
    bak = os.path.join(DESTINO, 'geradas')
    os.makedirs(bak, exist_ok=True)
    for f in ('rir-hero.webp',):
        p = os.path.join(DESTINO, f)
        if os.path.exists(p) and not os.path.exists(os.path.join(bak, f)):
            shutil.copy2(p, os.path.join(bak, f))

    trabalhos = [
        # (ficheiro de origem, slot em assets/)
        # 1.36 é o rácio do painel de preview (680x500)
        ('mk-menu-header.jpg', 'rir-hero.webp', 680 / 500),
    ]
    for origem, slot, racio in trabalhos:
        src = os.path.join(ORIGEM_RIR, origem)
        if not os.path.exists(src):
            print(f'  ! {origem} não existe, salto')
            continue
        tam, kb = preparar(src, os.path.join(DESTINO, slot), racio=racio)
        print(f'  {slot:18} {tam[0]}x{tam[1]}  {kb:6.1f} KB   ← {origem}')
