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

titulo "3. Os títulos dos casos cabem no painel"
# O jsdom não tem motor de layout, por isso o teste-casos.cjs não vê larguras.
# Foi por isso que quatro dos seis títulos estiveram a partir a palavra ao meio
# durante meses sem ninguém dar por isso.
node tools/teste-titulos.js || falhou=1

titulo "4. Variáveis usadas antes de declaradas"
python3 tools/check-tdz.py site/index.html || falhou=1

titulo "5. Peso, acessibilidade, SEO"
python3 tools/auditoria.py || falhou=1

titulo "6. Resíduos de QA no ficheiro publicado"
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

# As demos das bibliotecas (framebudget, glaze) são cópias geradas dos repos
# irmãos, versionadas aqui porque o Cloudflare só clona ESTE repositório. Uma
# cópia que ninguém compara é uma segunda versão à espera de divergir, por isso
# compara-se — no único sítio onde as duas pastas existem ao mesmo tempo: a
# máquina do Rodrigo.
#
# Escrito como função e não duas vezes de propósito: da primeira vez que isto
# existiu só comparava o src/ e deixou passar uma alteração ao demo/index.html.
# Com duas cópias do guarda, corrigir uma e esquecer a outra é o resultado
# provável.
comparar_copia() {
  local nome="$1" destino="$2" origem=""
  for t in "../$nome" "../../$nome"; do
    [ -d "$t/src" ] && { origem="$t"; break; }
  done

  if [ -z "$origem" ]; then
    # Em CI os dois irmãos são clonados de propósito (ver ci.yml), por isso aqui
    # a ausência não é "normal": é o próprio guarda a desligar-se. Foi assim que
    # as demos publicadas ficaram uma semana atrás do código — o passo dizia
    # "nada a comparar" e passava. Uma verificação que se pode calar sozinha
    # não é uma verificação, e é este `exit` que a impede de se calar.
    if [ -n "${CI:-}" ]; then
      echo "  !!  $nome: os irmãos deviam estar clonados em CI e não estão."
      echo "      ci.yml faz checkout de eimaieros/$nome — vê se o path mudou."
      falhou=1
      return
    fi
    # Localmente pode faltar de facto (e no Cloudflare falta sempre), mas em voz
    # alta: correr isto a partir de uma cópia solta, sem os irmãos ao lado, foi
    # exactamente como o problema passou despercebido.
    echo "  !!  $nome: original não está em ../$nome nem ../../$nome — NÃO comparado."
    echo "      Isto passa, mas não verificou nada. Corre-o na pasta a sério,"
    echo "      com $nome ao lado, antes de acreditares neste 'Tudo passa'."
    return
  fi
  if [ ! -d "$destino" ]; then
    echo "  !!  falta $destino/ — corre ./tools/sincronizar-$nome.sh"; falhou=1; return
  fi

  local dif=0
  diff -rq "$origem/src" "$destino/src" > /dev/null 2>&1 || {
    echo "  !!  $destino/src difere de $origem/src"
    diff -rq "$origem/src" "$destino/src" 2>&1 | sed 's|^|      |'
    dif=1
  }

  # A cópia leva o import reescrito (../src/ -> ./src/), por isso normaliza-se
  # o original da mesma maneira antes de comparar, senão diferiam sempre.
  local tmp; tmp=$(mktemp)
  sed "s|'\.\./src/index\.js'|'./src/index.js'|g" "$origem/demo/index.html" > "$tmp"
  diff -q "$tmp" "$destino/index.html" > /dev/null 2>&1 || {
    echo "  !!  $destino/index.html difere de $origem/demo/index.html"
    dif=1
  }
  rm -f "$tmp"

  if [ "$dif" -eq 0 ]; then
    echo "  ok  $nome: src/ e demo/index.html iguais ao original"
  else
    echo "      corre ./tools/sincronizar-$nome.sh"
    falhou=1
  fi
}

titulo "7. As cópias das bibliotecas estão a par dos originais"
comparar_copia framebudget framebudget-demo
comparar_copia glaze glaze-demo

# Cada biblioteca já guarda os seus próprios números — o tamanho do bundle e a
# contagem de testes falham o CI dela se o README discordar. Esta página depois
# CITA esses números nos painéis dos casos de estudo, e essa ponte não tinha
# nada a verificá-la: dizia 10 KB quando eram 11,7 e falava de 83 testes quando
# já eram 91. Uma cadeia de alegações verificadas vale o que vale o elo que
# ninguém instrumentou.
python3 tools/numeros-irmaos.py || falhou=1

titulo "8. Build"
./tools/build.sh > /dev/null && echo "  ok  dist/ gerado e verificado" || falhou=1

if [ "$falhou" -eq 0 ]; then
  printf '\n\033[32mTudo passa.\033[0m Faz `git push` e o Cloudflare publica sozinho.\n\n'
else
  printf '\n\033[31mHá coisas a corrigir acima.\033[0m\n\n'
  exit 1
fi
