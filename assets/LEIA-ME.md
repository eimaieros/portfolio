# assets/

Põe os ficheiros aqui com estes nomes exactos e entram sozinhos no site.
Sem ficheiros, tudo continua a funcionar — o site usa os visuais desenhados.

| Ficheiro | Onde aparece | Formato |
|---|---|---|
| `rir-crowd.webp` | a imagem que se monta em 144 mosaicos | **2400×1350** (16:9), WebP qualidade 82 |
| `rir-hero.webp` | preview do Rock in Rio na lista de trabalhos | 1600×1000, WebP |
| `rir-hero.mp4` | *(opcional)* vídeo curto em vez da imagem | 1280×800, **sem som**, 6–10 s, loop, < 2 MB |
| `portfolio.webp` | preview do portefólio | 1600×1000 |
| `nh.webp` | preview NH Concierge | 1600×1000 |
| `fl.webp` | preview FL Performance | 1600×1000 |
| `daylight.webp` | preview Daylight LA | 1600×1000 |

## Como converter

```bash
# imagem → webp
ffmpeg -i original.jpg -vf "scale=2400:-2" -q:v 82 rir-crowd.webp

# vídeo → mp4 leve, sem áudio
ffmpeg -i original.mov -t 8 -vf "scale=1280:-2,fps=25" -an -crf 28 -movflags +faststart rir-hero.mp4
```

Se não tiveres ffmpeg: Squoosh (squoosh.app) faz WebP no browser, sem instalar nada.

## Regras

- **Nada acima de 400 KB por imagem.** O site tem de continuar rápido; é metade do argumento.
- Vídeo sempre **sem áudio** e com `faststart`, senão não arranca em telemóvel.
- Se uma imagem falhar a carregar, o site não parte — volta ao visual desenhado.

---

## Estado actual: imagens GERADAS, não fotografias

Os ficheiros que estão aqui agora foram **gerados por código** (`tools/gerar-visuais.py`),
não são fotografias de ninguém e não têm licença associada. Existem porque um portefólio
com buracos cinzentos parece inacabado, e isso custa mais do que um visual abstrato.

O que são:
- `rir-crowd.webp` — a plateia como aparece nos dados: campo de pontos de luz com
  densidade a cair para o horizonte, silhuetas em contraluz. Não finge ser uma foto.
- `rir-hero.webp` — frente de palco: treliça, ecrã com barras, feixes.
- `portfolio / nh / fl / daylight` — pré-visualizações abstratas, cada uma com uma
  estrutura diferente (janelas de código, grelha editorial, hero de landing page).

**Substituir por fotografias reais assim que o João mandar as do Rock in Rio.**
Basta trocar o ficheiro pelo mesmo nome. Para regenerar: `python3 tools/gerar-visuais.py assets`
