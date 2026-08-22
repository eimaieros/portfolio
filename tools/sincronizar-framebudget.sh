#!/bin/bash
# Traz a demo do framebudget para dentro deste repositório.
#
# PORQUÊ EXISTE UMA CÓPIA.
# O framebudget é outro repositório (github.com/eimaieros/framebudget). Quando o
# Cloudflare constrói este site, clona só ESTE repositório — o ../framebudget não
# existe lá. Sem uma cópia versionada aqui, a demo dava 404 em produção.
#
# Duplicar código é a coisa que este projecto evita em toda a parte (ver o que o
# README diz sobre o dist/). A diferença é que aqui a duplicação é verificada:
# o `verificar.sh` compara as duas cópias antes de cada publicação e recusa-se a
# deixar passar se estiverem diferentes. Uma cópia que a máquina compara é uma
# cópia; uma cópia que ninguém compara é uma segunda versão à espera de divergir.
#
# Correr sempre que se mexer no framebudget:
#   ./tools/sincronizar-framebudget.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DESTINO="framebudget-demo"

# Na tua máquina as duas pastas são irmãs (portfolio/v1 e portfolio/framebudget).
# Noutros sítios o caminho muda, por isso procura-se em vez de assumir.
ORIGEM=""
for tentativa in "../framebudget" "../../framebudget" "$HOME/framebudget"; do
  if [ -d "$tentativa/src" ]; then ORIGEM="$tentativa"; break; fi
done

if [ -z "$ORIGEM" ]; then
  echo "ERRO: não encontro a pasta do framebudget." >&2
  echo "      Procurei em ../framebudget e ../../framebudget." >&2
  echo "      Este script só corre onde as duas pastas existem lado a lado." >&2
  echo "      Não é preciso no servidor: a cópia já vai versionada." >&2
  exit 1
fi

rm -rf "$DESTINO"
mkdir -p "$DESTINO/src"

cp "$ORIGEM/demo/index.html" "$DESTINO/index.html"
cp "$ORIGEM"/src/*.js "$DESTINO/src/"
cp "$ORIGEM/LICENSE" "$DESTINO/LICENSE"

# A demo vive em demo/index.html e importa ../src/index.js. Publicada, fica na
# raiz de /framebudget/ com o src/ ao lado — o ../ passaria por cima da pasta.
sed -i "s|'\.\./src/index\.js'|'./src/index.js'|g" "$DESTINO/index.html"

if grep -q '\.\./src/' "$DESTINO/index.html"; then
  echo "ERRO: sobrou um ../src/ no HTML da demo" >&2
  exit 1
fi

cat > "$DESTINO/LEIA-ME.md" <<'EOF'
# Não editar esta pasta

É uma cópia gerada de `../framebudget`, feita por
`tools/sincronizar-framebudget.sh`. Existe porque o Cloudflare só clona este
repositório quando constrói o site, e a demo precisa do código ao lado.

Para mudar alguma coisa, muda em `../framebudget/` e volta a correr o script.
O `verificar.sh` compara as duas e recusa publicar se estiverem diferentes.
EOF

echo "framebudget-demo/ sincronizado — $(find "$DESTINO" -type f | wc -l) ficheiros"
