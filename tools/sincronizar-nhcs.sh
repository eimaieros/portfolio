#!/bin/bash
# Traz a demonstração da app NHCS para dentro deste repositório.
#
# Mesma razão do sincronizar-framebudget.sh e do sincronizar-glaze.sh: a app
# vive noutra pasta (Documents/NHCS/App) e o Cloudflare só clona ESTE
# repositório quando constrói o site. Sem uma cópia versionada aqui, /nhcs/
# dava 404 em produção.
#
# A duplicação é aceitável porque é verificada: `--verificar` compara as duas
# cópias e o verificar.sh corre-o antes de cada publicação.
#
# O QUE VAI DENTRO DA CÓPIA
#
# `demo/src/*.js` não é escrito à mão: é o TypeScript da app (mock, fases da
# viagem, regras do concierge) com os tipos retirados, gerado por
# `tools/gerar-demo.mjs` do lado da NHCS. Por isso este script corre o gerador
# primeiro — copiar sem gerar publicaria a versão anterior da lógica com a
# versão nova do desenho, que é pior do que qualquer uma das duas.
#
#   ./tools/sincronizar-nhcs.sh              copia
#   ./tools/sincronizar-nhcs.sh --verificar  falha se a cópia divergir
set -euo pipefail
cd "$(dirname "$0")/.."

DESTINO="nhcs-demo"
VERIFICAR=0
[ "${1:-}" = "--verificar" ] && VERIFICAR=1

ORIGEM=""
for tentativa in \
  "../../../NHCS/App" \
  "../../NHCS/App" \
  "../NHCS/App" \
  "$HOME/Documents/NHCS/App" \
  "/c/Users/$USER/Documents/NHCS/App"
do
  if [ -d "$tentativa/demo" ] && [ -f "$tentativa/tools/gerar-demo.mjs" ]; then ORIGEM="$tentativa"; break; fi
done

if [ -z "$ORIGEM" ]; then
  # A app NHCS é um projecto privado que não é clonado em CI, ao contrário do
  # framebudget e do glaze. A ausência aqui é normal no servidor e em CI; o que
  # não é normal é ela faltar na máquina onde se edita. Por isso: avisa alto,
  # mas não falha a build de quem não a tem.
  echo "  ..  NHCS: não encontrei a pasta da app (procurei ../../../NHCS/App)."
  echo "      A cópia em $DESTINO/ vai versionada e o site publica na mesma."
  echo "      Mas NADA foi comparado: corre isto na máquina onde a app está."
  exit 0
fi

if [ "$VERIFICAR" -eq 1 ]; then
  falhou=0

  # 1. A lógica gerada está a par do TypeScript da app?
  ( cd "$ORIGEM" && node tools/gerar-demo.mjs --verificar ) || falhou=1

  # 2. A cópia daqui está a par da pasta demo/ da app?
  if [ ! -d "$DESTINO" ]; then
    echo "  !!  falta $DESTINO/ — corre ./tools/sincronizar-nhcs.sh"
    exit 1
  fi
  if diff -r -q "$ORIGEM/demo" "$DESTINO" --exclude=LEIA-ME.md > /tmp/nhcs-diff 2>&1; then
    echo "  ok  nhcs-demo/ igual a $ORIGEM/demo"
  else
    echo "  !!  nhcs-demo/ divergiu da app:"
    sed 's|^|      |' /tmp/nhcs-diff
    echo "      Corre ./tools/sincronizar-nhcs.sh"
    falhou=1
  fi

  exit "$falhou"
fi

( cd "$ORIGEM" && node tools/gerar-demo.mjs )

rm -rf "$DESTINO"
mkdir -p "$DESTINO"
cp -r "$ORIGEM/demo/." "$DESTINO/"

cat > "$DESTINO/LEIA-ME.md" <<'EOF'
# Não editar esta pasta

É uma cópia gerada de `Documents/NHCS/App/demo`, feita por
`tools/sincronizar-nhcs.sh`. Existe porque o Cloudflare só clona este
repositório quando constrói o site.

Dentro dela, `src/*.js` é ainda mais gerado do que o resto: é o TypeScript da
app (`app/src/journey.ts`, `mock.ts`, `services/concierge-service.ts`) com os
tipos retirados, para o browser correr o mesmo código que o telemóvel corre.

Para mudar alguma coisa:

- comportamento, textos, datas → muda o TypeScript da app e corre
  `node tools/gerar-demo.mjs` lá;
- desenho da página → muda `demo/estilo.css` ou `demo/vista.js` lá;

e depois volta a correr `./tools/sincronizar-nhcs.sh` aqui.

O `verificar.sh` compara as duas cópias e recusa publicar se divergirem.
EOF

echo "nhcs-demo/ sincronizado — $(find "$DESTINO" -type f | wc -l) ficheiros"
