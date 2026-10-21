#!/bin/bash
# Traz a demo do cadence para dentro deste repositório.
#
# O QUE É A DEMO.
# O front end do cadence (../cadence/frontend) compilado com NEXT_PUBLIC_DEMO=1:
# uma exportação estática, servida em rodrigofigueiredo.dev/cadence/, em que a
# rede é trocada por uma cópia da API que corre no browser com o entrevistador
# scripted do backend (frontend/lib/demo/). As páginas, o parser de SSE e o
# refresh dos tokens são os mesmos da aplicação; só não há servidor.
#
# PORQUÊ UMA CÓPIA, como no framebudget e no glaze: o Cloudflare clona só este
# repositório. A diferença é que aqui a cópia é um build, não código-fonte, por
# isso a comparação não é ficheiro a ficheiro: o ORIGEM.txt guarda o commit do
# frontend de onde saiu, e `--verificar` recusa deixar passar se o frontend
# tiver avançado desde então.
#
#   ./tools/sincronizar-cadence.sh              compila e copia
#   ./tools/sincronizar-cadence.sh --verificar  só compara (usado pelo verificar.sh)
set -euo pipefail
cd "$(dirname "$0")/.."

DESTINO="cadence-demo"

ORIGEM=""
for tentativa in "../cadence" "../../cadence" "$HOME/cadence"; do
  if [ -d "$tentativa/frontend/lib/demo" ]; then ORIGEM="$tentativa"; break; fi
done

commit_do_frontend() {
  git -C "$ORIGEM" log -1 --format=%H -- frontend
}

if [ "${1:-}" = "--verificar" ]; then
  if [ -z "$ORIGEM" ]; then
    # Em CI o cadence é clonado de propósito (ver ci.yml), por isso a ausência
    # é o guarda a desligar-se e falha — a mesma regra do comparar_copia no
    # verificar.sh, pela mesma razão.
    if [ -n "${CI:-}" ]; then
      echo "  !!  cadence: devia estar clonado em CI e não está (ver o ci.yml)"
      exit 1
    fi
    echo "  !!  cadence: original não está em ../cadence — demo NÃO comparada."
    echo "      Isto passa, mas não verificou nada."
    exit 0
  fi
  if [ ! -f "$DESTINO/index.html" ] || [ ! -f "$DESTINO/ORIGEM.txt" ]; then
    echo "  !!  falta $DESTINO/ — corre ./tools/sincronizar-cadence.sh"
    exit 1
  fi
  esperado=$(commit_do_frontend)
  tem=$(head -1 "$DESTINO/ORIGEM.txt")
  if [ "$esperado" != "$tem" ]; then
    echo "  !!  $DESTINO saiu do commit ${tem:0:7} do frontend; o frontend já vai em ${esperado:0:7}"
    echo "      corre ./tools/sincronizar-cadence.sh"
    exit 1
  fi
  echo "  ok  cadence: a demo é o build do frontend em ${esperado:0:7}"
  exit 0
fi

if [ -z "$ORIGEM" ]; then
  echo "ERRO: não encontro ../cadence com frontend/lib/demo." >&2
  exit 1
fi

if [ -n "$(git -C "$ORIGEM" status --porcelain -- frontend)" ]; then
  echo "ERRO: o frontend do cadence tem alterações por commitar." >&2
  echo "      A demo tem de sair de um commit, senão o ORIGEM.txt mente." >&2
  exit 1
fi

(
  cd "$ORIGEM/frontend"
  [ -d node_modules ] || npm ci --no-audit --no-fund
  rm -rf out
  NEXT_PUBLIC_DEMO=1 NEXT_TELEMETRY_DISABLED=1 npx next build
)

test -f "$ORIGEM/frontend/out/index.html"
test -f "$ORIGEM/frontend/out/sessions/demo-1/index.html"

rm -rf "$DESTINO"
cp -r "$ORIGEM/frontend/out" "$DESTINO"
{
  commit_do_frontend
  echo "Build estático do front end do cadence (NEXT_PUBLIC_DEMO=1), gerado por tools/sincronizar-cadence.sh."
  echo "Não editar à mão: a linha de cima é o commit do frontend de onde saiu, e o verificar.sh compara-a."
} > "$DESTINO/ORIGEM.txt"

echo "ok: $DESTINO atualizado a partir de $ORIGEM/frontend ($(commit_do_frontend | cut -c1-7))"
