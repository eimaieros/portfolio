#!/usr/bin/env node
/**
 * Compute the Content-Security-Policy for the built page, from the built page.
 *
 * WHY THIS IS GENERATED AND NOT WRITTEN BY HAND.
 *
 * The site had no CSP. That is the header that turns an injected `<script>`
 * from a catastrophe into a blocked request, which is reason enough on its own.
 *
 * It is NOT, as an earlier version of this comment claimed, "the one failing
 * audit in Lighthouse's best practices category". That was never measured, and
 * Lighthouse's `csp-xss` audit is informative — weight zero, it does not move
 * the 96. Whatever costs those four points is something else, and
 * `tools/resumo-lighthouse.mjs` now prints the name of every weighted audit
 * still failing into each CI run summary, instead of leaving it to be guessed.
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
 * PORQUE E QUE RECEBE UMA PASTA E NAO UM FICHEIRO.
 *
 * A primeira versao lia so o dist/index.html. O cabecalho, esse, aplica-se a
 * `/*` — a todas as paginas do site. As duas demos vendidas em /framebudget/ e
 * /glaze/ tem os seus proprios <script> inline, nenhum deles estava na politica,
 * e ficaram bloqueadas no momento em que o CSP foi publicado. A pagina do glaze
 * ficou sem imagens (sao geradas em canvas no arranque) e a do framebudget com
 * a tela preta. Os dois itens 04 e 05 do portefolio, mortos, e verificados a
 * fundo — na pagina inicial.
 *
 * Agora percorre a pasta inteira e junta os hashes de todas as paginas. Uma
 * politica so, partilhada: cada pagina passa a permitir tambem os scripts das
 * outras duas, o que e um alargamento de tres hashes conhecidos e nao de uma
 * classe de coisas. A alternativa — um bloco por caminho no _headers — nao
 * serve: quando dois blocos coincidem, a Cloudflare junta os valores com
 * virgula, e duas politicas de CSP no mesmo cabecalho aplicam-se pela
 * interseccao, o que partia as tres paginas em vez de uma.
 *
 *   node tools/csp.mjs dist
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
export function politica(paginas) {
  const htmls = Array.isArray(paginas) ? paginas : [paginas];

  const hashes = new Set();
  const onload = new Set();
  for (const html of htmls) {
    for (const h of hashesDeScript(html)) hashes.add(h);
    for (const m of html.matchAll(/\bonload\s*=\s*"([^"]*)"/g)) onload.add(m[1]);
  }

  const script = [...ORIGENS.script, ...hashes];

  /* 'unsafe-hashes' para os onload= inline, no <link> das fontes. Sem ele o
     webfont nunca troca de `swap` para carregado. */
  for (const h of onload) script.push(sha256(h));
  if (onload.size) script.push("'unsafe-hashes'");

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

/** Todos os .html sob um caminho, recursivamente. Um ficheiro devolve-se a si. */
export function paginasHtml(caminho) {
  if (statSync(caminho).isFile()) return [caminho];
  const out = [];
  for (const e of readdirSync(caminho)) {
    const c = join(caminho, e);
    if (statSync(c).isDirectory()) out.push(...paginasHtml(c));
    else if (e.endsWith('.html')) out.push(c);
  }
  return out.sort();
}

const caminho = process.argv[2] ?? 'dist';
if (!existsSync(caminho)) {
  console.error(`csp: ${caminho} nao existe — corre o build primeiro`);
  process.exit(1);
}
const ficheiros = paginasHtml(caminho);
if (!ficheiros.length) {
  console.error(`csp: nao encontrei nenhum .html em ${caminho}`);
  process.exit(1);
}
if (process.env.CSP_VERBOSO) console.error('csp: ' + ficheiros.join(', '));
console.log(politica(ficheiros.map((f) => readFileSync(f, 'utf8'))));
