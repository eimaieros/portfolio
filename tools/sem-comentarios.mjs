#!/usr/bin/env node
/**
 * Tira os comentários aos ficheiros JavaScript e CSS de uma pasta.
 *
 * Serve a cópia da demo da NHCS. A app é privada e os comentários do código
 * dela são notas internas do projecto; a cópia pública leva só o código.
 *
 *   node tools/sem-comentarios.mjs <pasta>
 *
 * Sem dependências: um leitor pequeno que conhece strings, templates,
 * expressões regulares e comentários. Cada ficheiro JavaScript que escreve
 * passa no `node --check`, e se não passar a sincronização pára em vez de
 * publicar um ficheiro partido.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PALAVRAS_ANTES_DE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'throw', 'case', 'do', 'else', 'yield', 'await',
]);

/** Uma `/` aqui começa uma expressão regular, ou é uma divisão? */
function regexPodeComecar(codigo) {
  let i = codigo.length - 1;
  while (i >= 0 && /\s/.test(codigo[i])) i--;
  if (i < 0) return true;
  const c = codigo[i];
  if (/[\w$]/.test(c)) {
    let j = i;
    while (j >= 0 && /[\w$]/.test(codigo[j])) j--;
    return PALAVRAS_ANTES_DE_REGEX.has(codigo.slice(j + 1, i + 1));
  }
  return !(c === ')' || c === ']' || c === '}');
}

export function semComentariosJs(fonte) {
  let out = '';
  let i = 0;
  const n = fonte.length;
  // A profundidade de chavetas em que abriu cada `${` dentro de um template.
  const templates = [];
  let chaves = 0;

  const lerString = (aspas) => {
    let s = fonte[i++];
    while (i < n) {
      const c = fonte[i];
      if (c === '\\') { s += c + fonte[i + 1]; i += 2; continue; }
      s += c; i++;
      if (c === aspas) break;
    }
    return s;
  };

  // Texto de template até à crase que o fecha ou até ao próximo `${`, que
  // devolve a leitura ao código.
  const lerTemplate = () => {
    let s = '';
    while (i < n) {
      const c = fonte[i];
      if (c === '\\') { s += c + fonte[i + 1]; i += 2; continue; }
      if (c === '`') { s += c; i++; return s; }
      if (c === '$' && fonte[i + 1] === '{') {
        s += '${'; i += 2;
        templates.push(chaves);
        chaves++;
        return s;
      }
      s += c; i++;
    }
    return s;
  };

  while (i < n) {
    const c = fonte[i];
    const d = fonte[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && fonte[i] !== '\n' && fonte[i] !== '\r') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      const fim = fonte.indexOf('*/', i + 2);
      if (fim < 0) throw new Error('comentário de bloco sem fim');
      out += /[\n\r]/.test(fonte.slice(i, fim + 2)) ? '\n' : ' ';
      i = fim + 2;
      continue;
    }
    if (c === '"' || c === "'") { out += lerString(c); continue; }
    if (c === '`') { out += '`'; i++; out += lerTemplate(); continue; }
    if (c === '/' && regexPodeComecar(out)) {
      let s = c; i++;
      let classe = false;
      while (i < n) {
        const e = fonte[i];
        if (e === '\\') { s += e + fonte[i + 1]; i += 2; continue; }
        if (e === '\n' || e === '\r') throw new Error('expressão regular com quebra de linha');
        s += e; i++;
        if (e === '[') classe = true;
        else if (e === ']') classe = false;
        else if (e === '/' && !classe) break;
      }
      while (i < n && /[a-z]/i.test(fonte[i])) s += fonte[i++];
      out += s;
      continue;
    }
    if (c === '{') { chaves++; out += c; i++; continue; }
    if (c === '}') {
      chaves--;
      out += c; i++;
      if (templates.length && templates[templates.length - 1] === chaves) {
        templates.pop();
        out += lerTemplate();
      }
      continue;
    }
    out += c; i++;
  }
  return arrumar(out);
}

export function semComentariosCss(fonte) {
  let out = '';
  let i = 0;
  const n = fonte.length;
  while (i < n) {
    const c = fonte[i];
    if (c === '/' && fonte[i + 1] === '*') {
      const fim = fonte.indexOf('*/', i + 2);
      if (fim < 0) throw new Error('comentário de bloco sem fim');
      out += /[\n\r]/.test(fonte.slice(i, fim + 2)) ? '\n' : ' ';
      i = fim + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let s = fonte[i++];
      while (i < n) {
        const e = fonte[i];
        if (e === '\\') { s += e + fonte[i + 1]; i += 2; continue; }
        s += e; i++;
        if (e === c) break;
      }
      out += s;
      continue;
    }
    out += c; i++;
  }
  return arrumar(out);
}

/** Tira as linhas que ficaram vazias e os espaços no fim; mantém CRLF se o ficheiro o tinha. */
function arrumar(texto) {
  const crlf = texto.includes('\r\n');
  const linhas = texto.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  const saida = [];
  for (const l of linhas) {
    if (l === '' && (saida.length === 0 || saida[saida.length - 1] === '')) continue;
    saida.push(l);
  }
  while (saida.length && saida[saida.length - 1] === '') saida.pop();
  const corpo = saida.join('\n') + '\n';
  return crlf ? corpo.replace(/\n/g, '\r\n') : corpo;
}

function ficheiros(pasta) {
  const lista = [];
  for (const nome of readdirSync(pasta).sort()) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) lista.push(...ficheiros(caminho));
    else lista.push(caminho);
  }
  return lista;
}

function principal() {
  const pasta = process.argv[2];
  if (!pasta) {
    console.error('uso: node tools/sem-comentarios.mjs <pasta>');
    process.exit(2);
  }
  let falhou = 0;
  for (const caminho of ficheiros(pasta)) {
    const js = caminho.endsWith('.js') || caminho.endsWith('.mjs');
    const css = caminho.endsWith('.css');
    if (!js && !css) continue;
    const fonte = readFileSync(caminho, 'utf8');
    const limpo = js ? semComentariosJs(fonte) : semComentariosCss(fonte);
    writeFileSync(caminho, limpo);
    if (js) {
      const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: limpo, encoding: 'utf8' });
      if (r.status !== 0) {
        console.error(`  !!  ${caminho}: sem comentários, o ficheiro não passa no node --check`);
        console.error(String(r.stderr).split('\n').slice(0, 6).join('\n'));
        falhou = 1;
      }
    }
  }
  process.exit(falhou);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) principal();
