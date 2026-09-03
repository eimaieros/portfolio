#!/usr/bin/env node
/**
 * Compute the Content-Security-Policy for the built page, from the built page.
 *
 * WHY THIS IS GENERATED AND NOT WRITTEN BY HAND.
 *
 * The site had no CSP, which is the one failing audit in Lighthouse's best
 * practices category — 96 instead of 100 — and, more to the point, is the
 * header that turns an injected `<script>` from a catastrophe into a blocked
 * request.
 *
 * It cannot simply be typed into `_headers`, because this site is a single
 * 112 KB inline script. A policy with no `script-src` allowance kills the whole
 * page; one with `'unsafe-inline'` permits exactly what CSP exists to stop. The
 * remaining option is a hash of the script's exact bytes.
 *
 * A hash typed into a file is the same defect this repository has spent three
 * weeks removing — correct on the day it is written, wrong after the next edit.
 * Except worse: a stale script hash does not drift quietly, it takes the site
 * down. So it is derived from `dist/index.html` after the build has finished
 * rewriting asset paths, and cannot disagree with the file it describes.
 *
 * WHY NODE AND NOT PYTHON.
 *
 * This started as csp.py and the build failed on the machine it has to run on:
 * Git Bash on Windows has no python3, no python and no py. The rest of this
 * project's tooling is Node, and a build step should not add a second language
 * runtime for eighty lines of hashing.
 *
 *   node tools/csp.mjs dist/index.html
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Onde o próprio site vai buscar coisas. O que não estiver aqui é bloqueado.
 *
 * `static.cloudflareinsights.com` e `cloudflareinsights.com` não estão no HTML
 * deste repositório: a Cloudflare injecta o beacon do Web Analytics na resposta,
 * depois do ficheiro sair daqui. A primeira política não os tinha e a analítica
 * do site morreu em silêncio — o script foi bloqueado, o pedido ficou a zero
 * bytes, e nada na consola do próprio site o disse. Medido no site a sério, não
 * deduzido: `performance.getEntriesByType('resource')` mostrava a entrada do
 * beacon com transferSize e decodedBodySize a 0.
 */
const ORIGENS = {
  script: [
    "'self'",
    'https://cdnjs.cloudflare.com',
    'https://cdn.jsdelivr.net',
    'https://static.cloudflareinsights.com',
  ],
  style: ["'self'", 'https://fonts.googleapis.com'],
  font: ['https://fonts.gstatic.com', 'data:'],
  img: ["'self'", 'data:', 'blob:'],
  connect: ["'self'", 'https://cloudflareinsights.com'],
};

const sha256 = (texto) => "'sha256-" + createHash('sha256').update(texto, 'utf8').digest('base64') + "'";

/**
 * sha256 de cada <script> inline executável.
 *
 * O JSON-LD fica de fora porque `script-src` não se aplica a tipos que não são
 * executáveis. Tudo o que é executável entra, byte a byte — o browser compara
 * o conteúdo exacto, e um espaço a mais chega para bloquear a página.
 */
function hashesDeScript(html) {
  const out = [];
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, atributos, corpo] = m;
    if (/\bsrc=/.test(atributos)) continue;
    const tipo = atributos.match(/type\s*=\s*["']([^"']+)/);
    if (tipo && /json/i.test(tipo[1])) continue;
    if (!corpo.trim()) continue;
    out.push(sha256(corpo));
  }
  return out;
}

/**
 * O QUE FICA DE FORA, DE PROPÓSITO.
 *
 * A Cloudflare injecta um segundo script inline (~900 bytes, `/cdn-cgi/
 * challenge-platform/`) em cada resposta. O conteúdo muda a cada pedido, por
 * isso não há hash possível: só `'unsafe-inline'` o deixava passar, e
 * `'unsafe-inline'` em `script-src` anula a política inteira — é exactamente o
 * que este cabeçalho existe para travar.
 *
 * Fica bloqueado, e a consequência é conhecida: as detecções de bot que
 * dependem desse JavaScript deixam de correr. As da Cloudflare que correm no
 * servidor não dependem dele. Para um site estático de portefólio, trocar uma
 * política real por uma heurística de bots do lado do cliente seria trocar mal.
 */
export function politica(html) {
  const script = [...ORIGENS.script, ...hashesDeScript(html)];

  /* 'unsafe-hashes' para o único onload= inline da página, no <link> das
     fontes. Sem ele o webfont nunca troca de `swap` para carregado. */
  const onload = [...html.matchAll(/\bonload\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
  for (const h of new Set(onload)) script.push(sha256(h));
  if (onload.length) script.push("'unsafe-hashes'");

  /* style-src leva 'unsafe-inline': atributos style="" não podem ser cobertos
     por hash. É uma concessão pequena e declarada — o que este cabeçalho existe
     para travar é script injectado, e script-src não leva 'unsafe-inline'. */
  const estilo = [...ORIGENS.style, "'unsafe-inline'"];

  return [
    "default-src 'self'",
    'script-src ' + script.join(' '),
    'style-src ' + estilo.join(' '),
    'font-src ' + ORIGENS.font.join(' '),
    'img-src ' + ORIGENS.img.join(' '),
    'connect-src ' + ORIGENS.connect.join(' '),
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

const caminho = process.argv[2] ?? 'dist/index.html';
if (!existsSync(caminho)) {
  console.error(`csp: ${caminho} nao existe — corre o build primeiro`);
  process.exit(1);
}
console.log(politica(readFileSync(caminho, 'utf8')));
