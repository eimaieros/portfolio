#!/usr/bin/env node
/**
 * Print the Lighthouse numbers into the job log and the run summary.
 *
 * WHY THIS EXISTS.
 *
 * A passing Lighthouse job says "All results processed!" and nothing else. It
 * tells you the assertions held; it does not tell you what the score *is*. So
 * the number could drift from 57 to 58 to 62 across a month of commits and the
 * only way to find out would be to download a 1.7 MB artifact and grep it.
 *
 * That is the same shape as every other bug this repository found in August:
 * an instrument that measures correctly and then keeps the reading to itself.
 * A ratchet you cannot read is a ratchet nobody will ever raise.
 *
 * This prints the median run — the one LHCI itself marks representative — to
 * stdout and to $GITHUB_STEP_SUMMARY, so both numbers are on the run page.
 *
 *   node tools/resumo-lighthouse.js <resultsDir> <label>
 */

import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, rotulo = 'lighthouse'] = process.argv.slice(2);

if (!dir || !existsSync(dir)) {
  // Not fatal. This step runs with `if: always()`, so it also runs when the
  // Lighthouse step failed before writing anything — and a summary script that
  // fails the build on its way to explaining a failure helps nobody.
  console.log(`resumo-lighthouse: nao ha resultados em ${dir || '(sem caminho)'}`);
  process.exit(0);
}

/** The run LHCI marks representative — its median — or the first one found. */
function lhrRepresentativo(dir) {
  const manifesto = join(dir, 'manifest.json');
  if (existsSync(manifesto)) {
    const entradas = JSON.parse(readFileSync(manifesto, 'utf8'));
    const m = entradas.find((e) => e.isRepresentativeRun) ?? entradas[0];
    if (m && existsSync(m.jsonPath)) return JSON.parse(readFileSync(m.jsonPath, 'utf8'));
  }
  // No manifest means the filesystem upload never ran. The raw collect output
  // is still there, so use it rather than reporting nothing.
  const crus = readdirSync(dir).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));
  if (!crus.length) return null;
  const todos = crus.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  todos.sort((a, b) => pontuacao(a, 'performance') - pontuacao(b, 'performance'));
  return todos[Math.floor(todos.length / 2)];
}

const pontuacao = (lhr, cat) => Math.round((lhr.categories?.[cat]?.score ?? 0) * 100);
const metrica = (lhr, id) => lhr.audits?.[id]?.displayValue ?? '—';

const lhr = lhrRepresentativo(dir);
if (!lhr) {
  console.log(`resumo-lighthouse: ${dir} existe mas nao tem relatorios`);
  process.exit(0);
}

const categorias = [
  ['Performance', 'performance'],
  ['Accessibility', 'accessibility'],
  ['Best practices', 'best-practices'],
  ['SEO', 'seo'],
];
const metricas = [
  ['First contentful paint', 'first-contentful-paint'],
  ['Largest contentful paint', 'largest-contentful-paint'],
  ['Total blocking time', 'total-blocking-time'],
  ['Cumulative layout shift', 'cumulative-layout-shift'],
  ['Speed index', 'speed-index'],
];

/**
 * Que auditorias e que estao a puxar cada categoria para baixo.
 *
 * Uma pontuacao de 96 diz que falta alguma coisa e nao diz o que. Escrevi numa
 * commit que a auditoria em falta nas boas praticas era o CSP; e uma afirmacao
 * que nunca medi, e a diferenca entre 96 e 100 pode ser mapas de codigo-fonte,
 * uma imagem com o racio errado ou um aviso na consola. Este repositorio ja
 * apanhou o mesmo defeito seis vezes: um numero em prosa sem instrumento por
 * tras. Agora o instrumento imprime os nomes.
 *
 * So conta o que tem peso. As auditorias informativas aparecem a vermelho no
 * relatorio e nao mexem no numero — inclui-las era convidar a "corrigir" coisas
 * que nao mudam nada.
 */
function auditoriasEmFalta(lhr, cat) {
  const c = lhr.categories?.[cat];
  if (!c) return [];
  return c.auditRefs
    .filter((r) => (r.weight ?? 0) > 0)
    .map((r) => ({ ref: r, a: lhr.audits?.[r.id] }))
    .filter(({ a }) => a && a.score !== null && a.score < 1)
    .sort((x, y) => (y.ref.weight ?? 0) - (x.ref.weight ?? 0))
    .map(({ ref, a }) => `${a.title} (${ref.id}, peso ${ref.weight})`);
}

/**
 * Que elementos, exactamente.
 *
 * Nomear a auditoria foi um avanço e nao chegou. `color-contrast` sobreviveu a
 * cinco correcoes seguidas porque de cada vez eu deduzi qual seria o elemento
 * em falta — cor sem opacidade, depois com opacidade, depois o contorno vazado
 * — e de cada vez a deducao foi plausivel, barata de justificar e errada. O
 * relatorio sabia a resposta desde a primeira execucao.
 *
 * O axe devolve, por cada no reprovado, um selector e uma explicacao com os
 * numeros ("Expected contrast ratio of 4.5:1"). Esta tudo no mesmo JSON que ja
 * se le aqui para tirar a pontuacao. Imprimir isso custa vinte linhas e poupa
 * uma execucao de treze minutos por palpite.
 */
function nosEmFalta(lhr, id, max = 6) {
  const itens = lhr.audits?.[id]?.details?.items;
  if (!Array.isArray(itens)) return [];
  const linhas = [];
  for (const it of itens.slice(0, max)) {
    const no = it.node ?? it.subItems?.items?.[0]?.node ?? {};
    const sel = (no.selector || no.snippet || '(sem selector)').replace(/\s+/g, ' ').slice(0, 110);
    const porque = (no.explanation || '').replace(/\s+/g, ' ').slice(0, 130);
    linhas.push(porque ? `\`${sel}\` — ${porque}` : `\`${sel}\``);
  }
  if (itens.length > max) linhas.push(`…e mais ${itens.length - max}`);
  return linhas;
}

const CATS_A_DETALHAR = ['accessibility', 'best-practices', 'seo'];

const falhas = CATS_A_DETALHAR
  .flatMap((cat) => auditoriasEmFalta(lhr, cat).map((t) => `| ${cat} | ${t} |`));

/** Os ids que falharam, para depois pedir os nós de cada um. */
const idsFalhados = CATS_A_DETALHAR.flatMap((cat) =>
  (lhr.categories?.[cat]?.auditRefs ?? [])
    .filter((r) => (r.weight ?? 0) > 0)
    .filter((r) => {
      const a = lhr.audits?.[r.id];
      return a && a.score !== null && a.score < 1;
    })
    .map((r) => r.id),
);

const detalhe = [];
for (const id of [...new Set(idsFalhados)]) {
  const nos = nosEmFalta(lhr, id);
  if (!nos.length) continue;
  detalhe.push(`<details><summary><b>${id}</b> — que elementos</summary>`, '');
  for (const n of nos) detalhe.push(`- ${n}`);
  detalhe.push('', '</details>', '');
}

const linhas = [
  `### ${rotulo}`,
  '',
  '| | |',
  '|---|---:|',
  ...categorias.map(([nome, id]) => `| ${nome} | **${pontuacao(lhr, id)}** |`),
  ...metricas.map(([nome, id]) => `| ${nome} | ${metrica(lhr, id)} |`),
  '',
  ...(falhas.length
    ? ['**O que falta para 100** (só auditorias com peso)', '', '| categoria | auditoria |', '|---|---|', ...falhas, '', ...detalhe]
    : ['Accessibility, best practices e SEO sem auditorias com peso em falta.', '']),
];

const texto = linhas.join('\n');
console.log(texto);

// The step summary is what puts the number on the run page itself, where you
// see it without opening a log group.
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto + '\n');
}
