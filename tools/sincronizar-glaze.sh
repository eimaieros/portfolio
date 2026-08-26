#!/bin/bash
# Traz a demo do glaze para dentro deste repositório.
#
# Mesma razão do sincronizar-framebudget.sh: o glaze é outro repositório
# (github.com/eimaieros/glaze) e o Cloudflare só clona ESTE quando constrói o
# site. Sem uma cópia versionada aqui, /glaze/ dava 404 em produção.
#
# A duplicação é aceitável porque é verificada: o verificar.sh compara as duas
# cópias antes de cada publicação e recusa deixar passar se divergirem.
#
# Correr sempre que se mexer no glaze:
#   ./tools/sincronizar-glaze.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DESTINO="glaze-demo"

ORIGEM=""
for tentativa in "../glaze" "../../glaze" "$HOME/glaze"; do
  if [ -d "$tentativa/src" ]; then ORIGEM="$tentativa"; break; fi
done

if [ -z "$ORIGEM" ]; then
  echo "ERRO: não encontro a pasta do glaze." >&2
  echo "      Procurei em ../glaze e ../../glaze." >&2
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
# raiz de /glaze/ com o src/ ao lado — o ../ passaria por cima da pasta.
sed -i "s|'\.\./src/index\.js'|'./src/index.js'|g" "$DESTINO/index.html"

if grep -q '\.\./src/' "$DESTINO/index.html"; then
  echo "ERRO: sobrou um ../src/ no HTML da demo" >&2
  exit 1
fi

cat > "$DESTINO/LEIA-ME.md" <<'EOF'
# Não editar esta pasta

É uma cópia gerada de `../glaze`, feita por `tools/sincronizar-glaze.sh`.
Existe porque o Cloudflare só clona este repositório quando constrói o site, e
a demo precisa do código ao lado.

Para mudar alguma coisa, muda em `../glaze/` e volta a correr o script.
O `verificar.sh` compara as duas e recusa publicar se estiverem diferentes.
EOF

echo "glaze-demo/ sincronizado — $(find "$DESTINO" -type f | wc -l) ficheiros"
