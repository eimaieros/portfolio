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
# SEM COMENTÁRIOS
#
# A app é privada e os comentários do código dela são notas internas do
# projecto. A cópia pública leva só o código: `tools/sem-comentarios.mjs`
# tira-os depois de copiar, e o `--verificar` passa o original pelo mesmo
# filtro antes de comparar.
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
# `${USER:-}` e nao `$USER`: este script corre com `set -u`, e o Git Bash do
# Windows nao define USER. A primeira versao rebentou com "USER: unbound
# variable" na unica maquina onde isto tem de correr.
for tentativa in \
  "../../../NHCS/App" \
  "../../NHCS/App" \
  "../NHCS/App" \
  "${HOME:-}/Documents/NHCS/App" \
  "/c/Users/${USERNAME:-${USER:-}}/Documents/NHCS/App"
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

  # 2. A cópia daqui está a par da pasta demo/ da app, sem os comentários?
  if [ ! -d "$DESTINO" ]; then
    echo "  !!  falta $DESTINO/ — corre ./tools/sincronizar-nhcs.sh"
    exit 1
  fi
  COPIA="$(mktemp -d)"
  cp -r "$ORIGEM/demo/." "$COPIA/"
  node tools/sem-comentarios.mjs "$COPIA" || falhou=1
  if diff -r -q "$COPIA" "$DESTINO" > /tmp/nhcs-diff 2>&1; then
    echo "  ok  nhcs-demo/ igual a $ORIGEM/demo, sem comentários"
  else
    echo "  !!  nhcs-demo/ divergiu da app:"
    sed 's|^|      |' /tmp/nhcs-diff
    echo "      Corre ./tools/sincronizar-nhcs.sh"
    falhou=1
  fi
  rm -rf "$COPIA"

  exit "$falhou"
fi

( cd "$ORIGEM" && node tools/gerar-demo.mjs )

rm -rf "$DESTINO"
mkdir -p "$DESTINO"
cp -r "$ORIGEM/demo/." "$DESTINO/"
node tools/sem-comentarios.mjs "$DESTINO"

echo "nhcs-demo/ sincronizado — $(find "$DESTINO" -type f | wc -l) ficheiros"
