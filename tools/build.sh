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
# O CSP e calculado a partir do dist/index.html ja construido, porque a pagina
# e um unico script inline de 112 KB: sem allowance nenhuma o CSP mata a
# pagina, com 'unsafe-inline' permite exactamente aquilo que o CSP existe para
# travar, e a unica saida e o hash do script. Um hash escrito a mao seria o
# mesmo defeito de sempre — certo no dia em que se escreve — excepto que este
# nao se degrada em silencio: deita o site abaixo inteiro. Ver tools/csp.mjs.
# Node e nao Python: isto comecou em csp.py e o build falhou na maquina onde
# tem de correr — o Git Bash do Windows nao tem python3, nem python, nem py. O
# resto das ferramentas deste projecto ja e Node, e um passo de build nao deve
# trazer um segundo runtime atras por oitenta linhas de hashing.
CSP="$(node tools/csp.mjs dist/index.html)"
if [ -z "$CSP" ]; then
  echo "  !!  nao consegui calcular o CSP; nao vou publicar sem ele" >&2
  exit 1
fi

# Guarda: cada script inline executavel do dist/index.html tem de ter o seu hash
# dentro da politica. O gerador tira-os do mesmo ficheiro, por isso em teoria
# nao podem divergir — mas "em teoria" e a regex do gerador, e uma regex que
# deixe de apanhar um <script> nao falha, so devolve menos. O sintoma seria uma
# pagina em branco em producao. Isto custa milissegundos e transforma isso num
# build vermelho.
node -e '
const {readFileSync}=require("fs"),{createHash}=require("crypto");
const html=readFileSync("dist/index.html","utf8"), csp=process.argv[1];
let n=0, mal=0;
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  const [,a,c]=m;
  if(/\bsrc=/.test(a)) continue;
  const t=a.match(/type\s*=\s*["\x27]([^"\x27]+)/);
  if(t && /json/i.test(t[1])) continue;
  if(!c.trim()) continue;
  n++;
  const h=createHash("sha256").update(c,"utf8").digest("base64");
  if(!csp.includes(h)){ mal++; console.error("  !!  script inline de "+c.length+" bytes sem hash na politica"); }
}
if(!n){ console.error("  !!  nao encontrei nenhum script inline — a regex do csp.mjs partiu-se"); process.exit(1); }
if(mal) process.exit(1);
console.log("  ok  "+n+" script(s) inline, todos com hash na politica");
' "$CSP" || exit 1

# CSP_MODO=relatorio pede o cabecalho Report-Only: o browser avisa na consola e
# nao bloqueia nada.
#
# NAO CONFIES NISTO COMO REDE DE SEGURANCA. A 3 de setembro de 2026 publicou-se
# com CSP_MODO=relatorio, o dist/_headers dizia Content-Security-Policy-Report-
# Only, e o browser no site a serio devolveu disposition "enforce" e bloqueou um
# <script> injectado a titulo de teste. Medido duas vezes, por dois caminhos
# diferentes (evento securitypolicyviolation e um fetch cross-origin travado
# pelo connect-src). Porque e que a Cloudflare serve o cabecalho a valer com
# este nome no _headers, nao se apurou.
#
# O que fica: publica-se dist/csp-modo.txt com o modo deste build, para se poder
# perguntar ao site qual a versao que esta no ar sem depender de ler cabecalhos.
# A verificacao a serio e sempre no browser, na pagina publicada.
CABECALHO="Content-Security-Policy"
if [ "${CSP_MODO:-}" = "relatorio" ]; then
  CABECALHO="Content-Security-Policy-Report-Only"
  echo "  ..  CSP em modo RELATORIO (pedido; confirma no site que foi respeitado)"
fi
printf '%s\n' "${CSP_MODO:-normal}" > dist/csp-modo.txt

cat > dist/_headers <<EOF
/*
  ${CABECALHO}: ${CSP}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
/index.html
  Cache-Control: public, max-age=0, must-revalidate
/csp-modo.txt
  Cache-Control: no-store
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
