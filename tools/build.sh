#!/bin/bash
# Monta dist/ — a pasta exacta que vai para o servidor.
#
# Em desenvolvimento o site vive em site/index.html e as imagens em assets/, por
# isso o HTML refere-as como ../assets/. Publicado, o index fica na raiz e as
# imagens em assets/ — os ../ deixariam de resolver e o site ia ao ar com as
# imagens todas partidas. É por isso que existe este passo.
#
# Correr: ./tools/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist

# HTML com os caminhos reescritos para a raiz
sed 's|\.\./assets/|assets/|g' site/index.html > dist/index.html

# imagens, sem o ficheiro de instruções
mkdir -p dist/assets
cp assets/*.webp assets/*.mp4 assets/*.svg assets/*.jpg dist/assets/ 2>/dev/null || true
# capturas do caso de estudo
mkdir -p dist/assets/case
cp assets/case/*.webp dist/assets/case/ 2>/dev/null || true

# A demo do framebudget, servida em rodrigofigueiredo.dev/framebudget/
#
# O caso de estudo diz que a biblioteca baixa a qualidade antes de a quebra ser
# visível. Uma pessoa a avaliar o portefólio pode carregar num botão e ver isso
# acontecer, em vez de ler que acontece. É por isso que vale a pena os 30 KB.
#
# A pasta é uma cópia gerada por tools/sincronizar-framebudget.sh — ver o
# LEIA-ME lá dentro, e a comparação em verificar.sh que impede que divirja.
if [ -d framebudget-demo ]; then
  mkdir -p dist/framebudget
  cp framebudget-demo/index.html framebudget-demo/LICENSE dist/framebudget/
  mkdir -p dist/framebudget/src
  cp framebudget-demo/src/*.js dist/framebudget/src/
fi

# A demo do glaze, servida em rodrigofigueiredo.dev/glaze/. Mesma lógica: a
# biblioteca promete que a página nunca perde as imagens, e quem estiver a
# avaliar pode desligar o WebGPU e ver que é verdade em vez de acreditar.
if [ -d glaze-demo ]; then
  mkdir -p dist/glaze/src
  cp glaze-demo/index.html glaze-demo/LICENSE dist/glaze/
  cp glaze-demo/src/*.js dist/glaze/src/
fi

cat > dist/robots.txt <<'EOF'
User-agent: *
Allow: /
EOF

# Netlify: o HTML muda a cada publicação, as imagens têm nome fixo
cat > dist/_headers <<'EOF'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
/index.html
  Cache-Control: public, max-age=0, must-revalidate
/assets/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
/framebudget/src/*
  Cache-Control: public, max-age=0, must-revalidate
/glaze/src/*
  Cache-Control: public, max-age=0, must-revalidate
# As páginas das demos precisam da mesma regra que a raiz, e não a tinham.
# Sem Cache-Control explícito caem no /* e o browser aplica cache heurística
# (uma fracção do tempo desde o Last-Modified), servindo HTML antigo com JS
# novo. Perdemos horas a depurar uma correcção que já estava publicada e que o
# browser se recusava a ir buscar.
/framebudget/
  Cache-Control: public, max-age=0, must-revalidate
/framebudget/index.html
  Cache-Control: public, max-age=0, must-revalidate
/glaze/
  Cache-Control: public, max-age=0, must-revalidate
/glaze/index.html
  Cache-Control: public, max-age=0, must-revalidate
EOF

cat > dist/netlify.toml <<'EOF'
# Site estático: um ficheiro HTML e uma pasta de imagens. Sem passo de build.
[build]
  publish = "."
EOF

# web.config — só serve se o site for para alojamento Windows/IIS (Amen e afins).
# Num host estático (Netlify, Cloudflare) é ignorado e não faz mal nenhum.
#
# O ponto crítico é o MIME do WebP: muitas configurações de IIS não o conhecem
# e devolvem 404 a TODAS as imagens. O site parecia partido sem razão aparente.
cat > dist/web.config <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <!-- sem isto, o IIS devolve 404 a todos os .webp -->
      <remove fileExtension=".webp" />
      <mimeMap fileExtension=".webp" mimeType="image/webp" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <!-- o HTML muda a cada publicação; as imagens têm nome fixo -->
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="7.00:00:00" />
    </staticContent>
    <httpCompression>
      <dynamicTypes>
        <add mimeType="text/html" enabled="true" />
      </dynamicTypes>
      <staticTypes>
        <add mimeType="text/html" enabled="true" />
        <add mimeType="text/css" enabled="true" />
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="image/svg+xml" enabled="true" />
      </staticTypes>
    </httpCompression>
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
        <add name="Permissions-Policy" value="geolocation=(), microphone=(), camera=()" />
      </customHeaders>
    </httpProtocol>
    <rewrite>
      <rules>
        <rule name="HTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="^OFF$" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
EOF

# verificação: nenhum ../ pode sobrar, e todos os assets referidos têm de existir
if grep -q '\.\./assets/' dist/index.html; then
  echo "ERRO: sobraram caminhos ../assets/ no dist" >&2
  exit 1
fi
# As imagens têm de existir. O vídeo (rir-hero.mp4) é opcional por desenho — o
# site cai para a imagem se não estiver lá — por isso só se avisa.
falta=0
for f in $(grep -o "assets/[A-Za-z0-9/._-]*\.webp" dist/index.html | sort -u); do
  [ -f "dist/$f" ] || { echo "ERRO: $f referido mas não existe em dist/" >&2; falta=1; }
done
for f in $(grep -o "assets/[A-Za-z0-9._-]*\.mp4" dist/index.html | sort -u); do
  [ -f "dist/$f" ] || echo "nota: $f é opcional e não está lá — o site usa a imagem"
done
[ "$falta" -eq 0 ] || exit 1

echo "dist/ pronto — $(du -sh dist | cut -f1), $(find dist -type f | wc -l) ficheiros"
find dist -type f | sed 's|^|  |'
