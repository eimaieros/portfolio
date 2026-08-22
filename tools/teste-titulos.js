/* Nenhum título de caso de estudo pode partir a palavra ao meio.
 *
 * PORQUÊ.
 * Os títulos são display type a 111px. Cabiam sete letras e a maioria tem nove
 * ou onze, por isso quatro dos seis partiam-se: FRAMEB / UDGET, PERFORM / ANCE,
 * PORTFOL / IO, CONCIER / GE. Esteve assim desde que os casos existem e nunca
 * ninguém viu, porque o único teste automático que os abre corre em jsdom — e o
 * jsdom não tem motor de layout, por isso não mede larguras.
 *
 * Este teste não precisa de browser: reproduz a aritmética das regras CSS e
 * compara a largura da palavra mais longa com a largura real do painel, para
 * todas as larguras de janela dos 320px aos 3840px.
 *
 * AS CONSTANTES SÃO LIDAS DO index.html, não copiadas para aqui. Um teste que
 * guarda a sua própria cópia dos valores deixa de testar o ficheiro no momento
 * em que alguém muda um deles.
 *
 * Correr: node tools/teste-titulos.js
 */
const fs = require('fs');
const path = require('path');

const ficheiro = path.join(__dirname, '..', 'site', 'index.html');
const html = fs.readFileSync(ficheiro, 'utf8');

const ROOT = 16;
/* Avanço médio do Syne 800 em caixa alta com letter-spacing -.035em, medido no
   Chrome: 1.20 em por letra. Se a fonte de display mudar, volta a medir. */
const EM = 1.20;

/** Lê uma custom property do :root, no formato clamp(a,b,c). */
function lerClamp(nome) {
  const m = html.match(new RegExp(`--${nome}:\\s*clamp\\(([^)]+)\\)`));
  if (!m) throw new Error(`não encontrei --${nome} no index.html`);
  const [lo, mid, hi] = m[1].split(',').map(s => s.trim());
  const px = s => parseFloat(s);
  const vw = s => parseFloat(s) / 100;
  return W => Math.min(Math.max(px(lo), vw(mid) * W), px(hi));
}

const u = lerClamp('u');
const pad = lerClamp('pad');

/** Largura disponível para o <h3>, à largura de janela W. */
function larguraDoH3(W) {
  const mInner = html.match(/#case \.inner\{max-width:calc\(var\(--u\)\*(\d+)\)/);
  if (!mInner) throw new Error('não encontrei o max-width do #case .inner');
  const inner = Math.min(W, Number(mInner[1]) * u(W));
  return inner - 2 * pad(W);
}

/** Os termos do font-size do #case h3, lidos da folha de estilo. */
const mFonte = html.match(
  /#case h3\{[^}]*font-size:max\(([\d.]+)rem,\s*min\(clamp\(([\d.]+)rem,([\d.]+)vw,([\d.]+)rem\),\s*calc\(([\d.]+)vw \/ var\(--ch,\d+\)\),\s*calc\(([\d.]+)rem \/ var\(--ch,\d+\)\)\)\)/s
);
if (!mFonte) {
  console.error('!! não consegui ler a regra de font-size do #case h3.');
  console.error('   Se a mudaste, actualiza a expressão regular aqui — ou este');
  console.error('   teste passa a validar uma regra que já não existe.');
  process.exit(1);
}
const [, chao, cLo, cVw, cHi, termoVw, termoRem] = mFonte.map(Number);

function fontSize(W, ch) {
  const base = Math.min(Math.max(cLo * ROOT, (cVw / 100) * W), cHi * ROOT);
  return Math.max(chao * ROOT, Math.min(base, (termoVw / 100) * W / ch, termoRem * ROOT / ch));
}

/* Os títulos vêm do próprio ficheiro: se amanhã entrar um caso novo com um
   nome comprido, este teste apanha-o sem ninguém se lembrar de o adicionar. */
const titulos = [...html.matchAll(/^\s*\w+:\{k:'[^']*',t:'([^']+)'/gm)].map(m => m[1]);
if (titulos.length < 5) {
  console.error(`!! só encontrei ${titulos.length} títulos de casos; esperava 6 ou mais.`);
  process.exit(1);
}

let pior = { folga: Infinity };
const falhas = [];
for (let W = 320; W <= 3840; W += 10) {
  const disp = larguraDoH3(W);
  for (const t of titulos) {
    const palavra = t.split(/\s+/).reduce((a, b) => (a.length >= b.length ? a : b), '');
    const largura = palavra.length * EM * fontSize(W, palavra.length);
    const folga = disp - largura;
    if (folga < pior.folga) pior = { folga, t, W, palavra };
    if (folga < 0) falhas.push({ W, t, palavra, largura: Math.round(largura), disp: Math.round(disp) });
  }
}

console.log(`  ${titulos.length} títulos, larguras de 320 a 3840 px`);
if (falhas.length) {
  const ws = [...new Set(falhas.map(f => f.W))];
  console.log(`  !! ${falhas.length} combinações partem a palavra ao meio (janelas de ${ws[0]} a ${ws[ws.length - 1]} px)`);
  falhas.slice(0, 5).forEach(f =>
    console.log(`     "${f.t}": ${f.palavra} ocupa ${f.largura}px em ${f.disp}px @ ${f.W}px`));
  process.exit(1);
}
console.log(`  ok  nenhum parte ao meio — pior folga ${Math.round(pior.folga)}px ("${pior.t}" @ ${pior.W}px)`);
