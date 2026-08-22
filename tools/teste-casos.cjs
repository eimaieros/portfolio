/* Abre todos os casos de estudo em jsdom e verifica o que lá está.
 *
 * PORQUÊ.
 * Os casos de estudo são construídos em JavaScript a partir de um objecto, e
 * nunca são vistos até alguém carregar no item da lista. Um erro ali não parte
 * a página: parte só o painel, e só quando se clica — que é a última coisa que
 * se testa à mão. O harness geral só confirma que o módulo executa até ao fim;
 * não abre nada.
 *
 * O que este teste garante:
 *   - a lista tem os itens todos, e nenhum abre um caso vazio
 *   - cada caso tem título, texto e pelo menos uma ligação para o trabalho
 *   - o campo `live` aceita um par ou uma lista de pares (o framebudget tem
 *     dois: a demo a correr e o código) sem partir os que têm um só
 *
 * Correr: NODE_PATH=/tmp/node_modules node tools/teste-casos.cjs
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ficheiro = path.join(__dirname, '..', 'site', 'index.html');
const noop = () => {};

/* Os duplos vivem aqui e não no jsdom porque as bibliotecas são carregadas de
   CDN e não estão disponíveis; o que se quer testar é o código do site. */
const dom = new JSDOM(fs.readFileSync(ficheiro, 'utf8'), {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://rodrigofigueiredo.dev/site/index.html',
  beforeParse(w) {
    w.matchMedia = q => ({ matches: false, media: q, onchange: null,
      addEventListener: noop, addListener: noop, removeEventListener: noop,
      removeListener: noop, dispatchEvent: () => false });
    w.gsap = { ticker: { add: noop, wake: noop, sleep: noop, lagSmoothing: noop },
      to: noop, from: noop, set: noop, timeline: () => ({ to: noop, from: noop }),
      quickTo: () => () => {}, registerPlugin: noop, utils: { toArray: () => [] } };
    w.ScrollTrigger = { create: () => ({ progress: 0, kill: noop }), refresh: noop,
      update: noop, addEventListener: noop, defaults: noop, getAll: () => [] };
    w.Lenis = function () { return { raf: noop, on: noop, stop: noop, start: noop, scrollTo: noop, scroll: 0 }; };
    const g2d = new Proxy({}, { get: (t, k) => k === 'canvas' ? { width: 9, height: 9 }
      : () => ({ addColorStop: noop, data: [] }), set: () => true });
    w.HTMLCanvasElement.prototype.getContext = t => t === '2d' ? g2d : null;
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  },
});

const espera = ms => new Promise(r => setTimeout(r, ms));
let falhas = 0;
const mal = m => { console.log('  !! ' + m); falhas++; };
const bem = m => console.log('  ok  ' + m);

(async () => {
  await espera(1300);
  const d = dom.window.document;

  const itens = [...d.querySelectorAll('.itm')];
  if (itens.length < 5) mal(`só ${itens.length} itens na lista de trabalho`);
  else bem(`${itens.length} itens na lista de trabalho`);

  for (const item of itens) {
    const nome = (item.querySelector('.t')?.textContent || '?').replace('CODE', '').trim();
    item.click();
    await espera(220);

    const titulo = d.querySelector('#case h3')?.textContent?.trim();
    const paras = d.querySelectorAll('#case .body p').length;
    const links = [...d.querySelectorAll('#case .caseLive')];

    const problemas = [];
    if (!titulo) problemas.push('sem título');
    if (paras < 2) problemas.push(`só ${paras} parágrafo(s)`);
    if (!links.length) problemas.push('sem ligação para o trabalho');
    /* Um href vazio ou "undefined" é o que sai quando o campo `live` muda de
       forma e o código que o desenha não acompanha. */
    for (const a of links) {
      const href = a.getAttribute('href');
      if (!href || href === 'undefined' || href.includes('undefined')) problemas.push(`href inválido: ${href}`);
      if (!a.textContent.trim().replace('↗', '').trim()) problemas.push('ligação sem texto');
    }
    /* Só faz sentido destacar uma quando há mais do que uma. */
    const pri = links.filter(a => a.classList.contains('pri')).length;
    if (links.length === 1 && pri) problemas.push('ligação única marcada como principal');
    if (links.length > 1 && pri !== 1) problemas.push(`${pri} ligações marcadas como principal, devia ser 1`);

    if (problemas.length) mal(`${nome}: ${problemas.join('; ')}`);
    else bem(`${nome}: ${paras} parágrafos, ${links.length} ligação(ões)`);
  }

  if (falhas) { console.log(`\n${falhas} caso(s) com problemas`); process.exit(1); }
  console.log('\ntodos os casos de estudo abrem e estão completos');
  process.exit(0);
})();
