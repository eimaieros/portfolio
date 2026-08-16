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
node tools-harness.js site/index.html        | tail -1 || falhou=1
node tools-harness.js site/index.html webgl  | tail -1 || falhou=1

titulo "2. Variáveis usadas antes de declaradas"
python3 tools/check-tdz.py site/index.html || falhou=1

titulo "3. Peso, acessibilidade, SEO"
python3 tools/auditoria.py || falhou=1

titulo "4. Resíduos de QA no ficheiro publicado"
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

titulo "5. Build"
./tools/build.sh > /dev/null && echo "  ok  dist/ gerado e verificado" || falhou=1

if [ "$falhou" -eq 0 ]; then
  printf '\n\033[32mTudo passa.\033[0m Podes publicar: arrasta dist/ para o Netlify.\n\n'
else
  printf '\n\033[31mHá coisas a corrigir acima.\033[0m\n\n'
  exit 1
fi
