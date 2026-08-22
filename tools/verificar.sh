#!/bin/bash
# Corre tudo o que valida o site, de uma vez. Antes de publicar, corre isto.
#
# Existe porque as verificações estavam espalhadas por quatro comandos e era
# fácil esquecer uma — e foi assim que um bug de âmbito sobreviveu quinze versões.
set -u
cd "$(dirname "$0")/.."
export NODE_PATH=/tmp/node_modules
falhou=0

titulo(){ printf '\n\033[1m%s\033[0m\n' "$1"; }

titulo "1. Executa em jsdom, com e sem WebGL"
# `node ... | tail -1` devolve o código do TAIL, não do node — e o tail passa
# sempre. Este script chegou a escrever "Tudo passa" com o harness a rebentar
# por o jsdom não estar instalado: exactamente o tipo de silêncio que ele
# existe para não haver. PIPESTATUS lê o código do primeiro comando do pipe.
harness(){
  local saida
  saida=$(node tools-harness.js "$@" 2>&1); local cod=$?
  if [ "$cod" -ne 0 ]; then
    echo "  !! o harness rebentou (código $cod):"
    echo "$saida" | tail -6 | sed 's|^|     |'
    falhou=1
  else
    echo "$saida" | tail -1
  fi
}
harness site/index.html
harness site/index.html webgl

titulo "2. Os casos de estudo abrem e estão completos"
saida_casos=$(node tools/teste-casos.cjs 2>&1 | grep -vE "Could not parse CSS|Not implemented|^\s+at |jsdom/lib")
if [ $? -eq 0 ] && ! echo "$saida_casos" | grep -q '!!'; then
  echo "$saida_casos" | grep -E '^\s+ok' | sed 's|^|  |' | tail -8
else
  echo "$saida_casos" | sed 's|^|  |'
  falhou=1
fi

titulo "3. Variáveis usadas antes de declaradas"
python3 tools/check-tdz.py site/index.html || falhou=1

titulo "4. Peso, acessibilidade, SEO"
python3 tools/auditoria.py || falhou=1

titulo "5. Resíduos de QA no ficheiro publicado"
if grep -qE "LOREM QA|__massa|__dbg|document\.hidden\|\|1|closeGate, 120000" site/index.html; then
  echo "  !! encontrei código de teste no site/index.html"; falhou=1
else
  echo "  ok  limpo"
fi
if [ -e site/_qa.html ] || [ -e site/_responsive.html ]; then
  echo "  !! ficheiros de inspecção por apagar em site/"; falhou=1
else
  echo "  ok  sem ficheiros temporários"
fi

titulo "6. A cópia do framebudget está a par do original"
# framebudget-demo/ é uma cópia gerada de ../framebudget, versionada aqui porque
# o Cloudflare só clona este repositório. Uma cópia que ninguém compara é uma
# segunda versão à espera de divergir, por isso compara-se aqui — no único sítio
# onde as duas pastas existem ao mesmo tempo: a máquina do Rodrigo.
fb_origem=""
for t in "../framebudget" "../../framebudget"; do
  [ -d "$t/src" ] && { fb_origem="$t"; break; }
done
if [ -z "$fb_origem" ]; then
  echo "  --  original não está aqui; nada a comparar (normal no servidor)"
elif [ ! -d framebudget-demo ]; then
  echo "  !!  falta framebudget-demo/ — corre ./tools/sincronizar-framebudget.sh"; falhou=1
elif diff -rq "$fb_origem/src" framebudget-demo/src > /dev/null 2>&1; then
  echo "  ok  as duas cópias do src/ são iguais"
else
  echo "  !!  framebudget-demo/src difere de $fb_origem/src"
  diff -rq "$fb_origem/src" framebudget-demo/src 2>&1 | sed 's|^|      |'
  echo "      corre ./tools/sincronizar-framebudget.sh"
  falhou=1
fi

titulo "7. Build"
./tools/build.sh > /dev/null && echo "  ok  dist/ gerado e verificado" || falhou=1

if [ "$falhou" -eq 0 ]; then
  printf '\n\033[32mTudo passa.\033[0m Faz `git push` e o Cloudflare publica sozinho.\n\n'
else
  printf '\n\033[31mHá coisas a corrigir acima.\033[0m\n\n'
  exit 1
fi
