/* GERADO — NÃO EDITAR.
 * Origem: app/src/pesquisa.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * A pesquisa do Draft1: voos à mão, documentos de viagem e destinos por clima.
 *
 * O Draft1 da NHCS (22 de setembro de 2026) põe três portas no separador Search
 * — AI Concierge, By Weather, Manual Search — e seis categorias por baixo. Este
 * módulo é a lógica das duas portas que a app ainda não tinha, e da verificação
 * de documentos que o Draft1 pinta de amarelo e liga aos voos e aos hotéis.
 *
 * Nada aqui é uma reserva, uma disponibilidade ou um preço. Os voos são
 * gerados a partir da distância entre aeroportos, para as durações fazerem
 * sentido; os preços são uma fórmula, para haver números por onde ordenar. A
 * interface diz isso em cada resultado, e `pesquisa.test.mts` garante que a
 * frase não desaparece.
 *
 * Não importa React. Atravessa para a demonstração web pelo `gerar-demo.mjs`.
 */

import { parseMoment } from './journey.js';

import { AEROPORTOS, HUBS, ROTAS_DIRETAS } from './mock-servicos.js';

/* ── Aeroportos ─────────────────────────────────────────────────────────── */

/** Sem acentos e em minúsculas: "sao paulo" encontra São Paulo. */
function normalizar(texto        )         {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * "Enter City, Airport Name or IATA code" — o campo do Draft1.
 *
 * O código IATA exato vem primeiro, porque quem o escreve sabe o que quer; a
 * seguir, cidades e países que comecem pelo texto; por fim, os que o contêm.
 */
export function procurarAeroportos(consulta        , lista              = AEROPORTOS, limite = 6)              {
  const q = normalizar(consulta);
  if (!q) return [];
  const pontuar = (a           )         => {
    if (a.code.toLowerCase() === q) return 0;
    const cidade = normalizar(a.city);
    const pais = normalizar(a.country);
    if (cidade.startsWith(q)) return 1;
    if (pais.startsWith(q) || a.code.toLowerCase().startsWith(q)) return 2;
    if (cidade.includes(q) || pais.includes(q)) return 3;
    return 99;
  };
  return lista
    .map((a) => ({ a, p: pontuar(a) }))
    .filter((x) => x.p < 99)
    .sort((x, y) => x.p - y.p || x.a.city.localeCompare(y.a.city, 'pt'))
    .slice(0, limite)
    .map((x) => x.a);
}

export function aeroporto(code        , lista              = AEROPORTOS)                   {
  return lista.find((a) => a.code === code.toUpperCase()) ?? null;
}

/** Distância ortodrómica em quilómetros. É o que dá durações de voo plausíveis. */
export function distanciaKm(a           , b           )         {
  const R = 6371;
  const rad = (g        ) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/* ── Passageiros ────────────────────────────────────────────────────────── */

/**
 * As regras que qualquer companhia aplica e que a app pode verificar antes de
 * pedir seja o que for: pelo menos um adulto, um bebé ao colo por adulto, e
 * nove lugares no máximo por reserva.
 */
export function validarPassageiros(p             )                {
  const inteiros = [p.adultos, p.criancas, p.bebes].every((n) => Number.isInteger(n) && n >= 0);
  if (!inteiros) return 'Os passageiros têm de ser números inteiros.';
  if (p.adultos < 1) return 'É preciso pelo menos um adulto.';
  if (p.bebes > p.adultos) return 'Cada bebé viaja ao colo de um adulto — há mais bebés do que adultos.';
  if (p.adultos + p.criancas > 9) return 'No máximo nove lugares por reserva. Para grupos maiores, a equipa NHCS trata do pedido.';
  return null;
}

/** "2 adultos, 1 criança, 1 bebé" — o Draft1 escreve "2 Adults, 1 CHD, 1 INF". */
export function rotuloDePassageiros(p             )         {
  const partes           = [];
  const plural = (n        , um        , varios        ) => `${n} ${n === 1 ? um : varios}`;
  partes.push(plural(p.adultos, 'adulto', 'adultos'));
  if (p.criancas) partes.push(plural(p.criancas, 'criança', 'crianças'));
  if (p.bebes) partes.push(plural(p.bebes, 'bebé', 'bebés'));
  return partes.join(', ');
}

/* ── A pesquisa de voos ─────────────────────────────────────────────────── */

export const CLASSES                                        = [
  { id: 'economica', rotulo: 'Económica' },
  { id: 'premium', rotulo: 'Económica premium' },
  { id: 'executiva', rotulo: 'Executiva' },
  { id: 'primeira', rotulo: 'Primeira' },
];

/**
 * O que tem de estar certo antes de se pesquisar.
 *
 * `hoje` é o dia de hoje no calendário de quem pesquisa, em AAAA-MM-DD. Vem de
 * fora para os testes não dependerem do dia em que correm.
 */
export function validarPesquisa(q               , hoje        )                {
  if (!aeroporto(q.de)) return 'Escolha o aeroporto de partida.';
  if (!aeroporto(q.para)) return 'Escolha o aeroporto de destino.';
  if (q.de === q.para) return 'A partida e o destino são o mesmo aeroporto.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.data)) return 'Escolha a data da viagem.';
  if (q.data < hoje) return 'A data da viagem já passou.';
  if (!Number.isInteger(q.malas) || q.malas < 0 || q.malas > 3) return 'Entre zero e três malas de porão por passageiro.';
  return validarPassageiros(q.passageiros);
}

/** A frase que acompanha cada resultado. Existe num sítio só e é testada. */
export const AVISO_DE_RESULTADOS =
  'Resultados ilustrativos: horários, números de voo e preços não vêm de nenhuma companhia. Em produção a pesquisa passa pelo backend da NHCS.';

const VELOCIDADE_KMH = 820;
const MINUTOS_EM_SOLO = 30;
const LIGACAO_MIN = 105;

function minutosDeVoo(km        )         {
  return Math.round(((km / VELOCIDADE_KMH) * 60 + MINUTOS_EM_SOLO) / 5) * 5;
}

/** Um número pequeno e estável a partir de um texto — para voos "aleatórios" que não mudam entre execuções. */
function hash(texto        )         {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const p2 = (n        ) => String(n).padStart(2, '0');

/** Escreve um instante absoluto no relógio de um offset `±HH:MM`. */
export function noRelogioDe(epochMs        , offset        )         {
  const sinal = offset.startsWith('-') ? -1 : 1;
  const [h, m] = offset.slice(1).split(':').map(Number);
  const deslocado = new Date(epochMs + sinal * (h * 60 + m) * 60_000);
  return `${deslocado.getUTCFullYear()}-${p2(deslocado.getUTCMonth() + 1)}-${p2(deslocado.getUTCDate())}`
    + `T${p2(deslocado.getUTCHours())}:${p2(deslocado.getUTCMinutes())}:00${offset}`;
}

function temDireto(a        , b        )          {
  return ROTAS_DIRETAS.includes(`${a}-${b}`) || ROTAS_DIRETAS.includes(`${b}-${a}`);
}

const MULTIPLICADOR                         = { economica: 1, premium: 1.6, executiva: 3.2, primeira: 5 };

/**
 * Os voos da demonstração para uma pesquisa.
 *
 * Direto, se o par existir na tabela; e até três ligações por escalas cujo
 * desvio não passe de 35% da distância direta — porque ninguém vai de Lisboa a
 * Malé por Nova Iorque. As horas saem da distância, e a chegada é escrita no
 * relógio do destino.
 */
export function ofertasDeVoo(q               )                {
  const origem = aeroporto(q.de);
  const destino = aeroporto(q.para);
  if (!origem || !destino || origem.code === destino.code) return [];

  const direta = distanciaKm(origem, destino);
  const saidas = ['07:15', '10:40', '15:25', '21:50'];
  const ofertas                = [];

  const montar = (caminho             , indice        )              => {
    const [hh, mm] = saidas[indice % saidas.length].split(':').map(Number);
    let instante = parseMoment(`${q.data}T${p2(hh)}:${p2(mm)}:00${origem.utcOffset}`).epochMs;
    const inicio = instante;
    const escala = caminho.length > 2 ? caminho[1].code : null;
    const quem = escala && HUBS[escala]
      ? HUBS[escala]
      : { carrier: origem.countryCode === 'PT' ? 'TAP Air Portugal' : 'Companhia ilustrativa', carrierCode: origem.countryCode === 'PT' ? 'TP' : 'XX' };
    const pernas          = [];
    for (let i = 0; i < caminho.length - 1; i++) {
      const a = caminho[i];
      const b = caminho[i + 1];
      if (i > 0) instante += LIGACAO_MIN * 60_000;
      const partida = noRelogioDe(instante, a.utcOffset);
      instante += minutosDeVoo(distanciaKm(a, b)) * 60_000;
      pernas.push({
        de: a.code,
        para: b.code,
        numero: `${quem.carrierCode}${100 + (hash(`${a.code}${b.code}${indice}`) % 900)}`,
        partida,
        chegada: noRelogioDe(instante, b.utcOffset),
      });
    }
    const km = caminho.slice(1).reduce((s, b, i) => s + distanciaKm(caminho[i], b), 0);
    const base = 60 + 0.095 * km + (escala ? -40 : 30);
    return {
      id: `${q.de}-${q.para}-${q.data}-${indice}`,
      companhia: quem.carrier,
      pernas,
      escalas: caminho.slice(1, -1).map((a) => a.code),
      duracaoMin: Math.round((instante - inicio) / 60_000),
      classe: q.classe,
      precoPorLugar: Math.round(base * MULTIPLICADOR[q.classe]),
      lugaresRestantes: hash(`${q.de}${q.para}${indice}`) % 3 === 0 ? 2 + (hash(q.data + indice) % 8) : null,
    };
  };

  if (temDireto(origem.code, destino.code)) ofertas.push(montar([origem, destino], ofertas.length));

  if (q.escalasMaximas >= 1) {
    const ligacoes = Object.keys(HUBS)
      .map((code) => aeroporto(code))
      .filter((h)                 => !!h && h.code !== origem.code && h.code !== destino.code)
      .filter((h) => temDireto(origem.code, h.code) && temDireto(h.code, destino.code))
      .map((h) => ({ h, desvio: (distanciaKm(origem, h) + distanciaKm(h, destino)) / direta }))
      .filter((x) => x.desvio <= 1.35)
      .sort((x, y) => x.desvio - y.desvio)
      .slice(0, 3);
    for (const { h } of ligacoes) ofertas.push(montar([origem, h, destino], ofertas.length));
  }

  return ofertas.sort((a, b) => a.precoPorLugar - b.precoPorLugar);
}

/** "14h 35m" */
export function rotuloDeDuracao(minutos        )         {
  return `${Math.floor(minutos / 60)}h ${p2(minutos % 60)}m`;
}

/**
 * Quanto custaria, com as regras ilustrativas da demonstração: adultos e
 * crianças pagam o lugar, um bebé ao colo paga 10%, e cada mala de porão em
 * económica custa 45 € por passageiro com lugar. Em executiva e primeira as
 * malas estão incluídas.
 */
export function totalDaOferta(oferta             , q               )        {
  const lugares = q.passageiros.adultos + q.passageiros.criancas;
  const bilhetes = oferta.precoPorLugar * lugares;
  const bebes = Math.round(oferta.precoPorLugar * 0.1) * q.passageiros.bebes;
  const incluidas = oferta.classe === 'executiva' || oferta.classe === 'primeira';
  const malas = incluidas ? 0 : 45 * q.malas * lugares;
  return { lugares, bilhetes, bebes, malas, total: bilhetes + bebes + malas };
}

/** "2 011,99 €" à portuguesa, sem depender do `Intl` do Hermes. */
export function euros(valor        )         {
  const inteiro = Math.round(valor);
  const grupos = String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grupos} €`;
}

/* ── Documentos de viagem — o botão amarelo do Draft1 ──────────────────── */

const GRAVIDADE                                    = { ok: 0, desconhecido: 1, atencao: 2, impeditivo: 3 };

/**
 * O que é preciso para esta viagem, no destino **e nas escalas**.
 *
 * O Draft1 é explícito: nos voos verifica-se o destino e as escalas; nos hotéis,
 * só o destino. Uma escala nos Estados Unidos obriga a ESTA mesmo sem
 * sair do aeroporto — é o género de coisa que se descobre no balcão de check-in
 * se ninguém verificar antes.
 *
 * `passaporteValidoAte` pode faltar (o passaporte ainda não foi entregue); nesse
 * caso a validade fica por verificar e diz-se isso, em vez de se assumir que
 * está bem. `regresso` é a data de regresso, ISO com offset.
 */
export function verificarDocumentos(entrada

 )                          {
  const lista = entrada.aeroportos ?? AEROPORTOS;
  const itens                      = [];
  const vistos = new Set        ();

  const avaliar = (code        , papel                      ) => {
    const a = aeroporto(code, lista);
    if (!a || vistos.has(`${a.countryCode}-${papel}`)) return;
    vistos.add(`${a.countryCode}-${papel}`);
    const regra = entrada.regras.find((r) => r.countryCode === a.countryCode);
    if (!regra) {
      itens.push({ pais: a.country, papel, estado: 'desconhecido', texto: 'Sem regra na tabela — a equipa NHCS confirma antes da reserva.', source: '' });
      return;
    }
    if (papel === 'escala' && !regra.aplicaEmEscala) {
      itens.push({ pais: a.country, papel, estado: 'ok', texto: 'Escala sem controlo de entrada, se não sair do aeroporto.', source: regra.source });
      return;
    }
    if (regra.visto === 'obrigatorio') {
      itens.push({ pais: a.country, papel, estado: 'impeditivo', texto: 'É preciso visto antes de viajar.', source: regra.source });
    } else if (regra.visto === 'eta') {
      itens.push({ pais: a.country, papel, estado: 'atencao', texto: `${regra.autorizacao ?? 'Autorização eletrónica'} obrigatória antes de embarcar. ${regra.nota}`, source: regra.source });
    } else {
      itens.push({ pais: a.country, papel, estado: 'ok', texto: regra.nota, source: regra.source });
    }

    if (papel === 'destino' && regra.diasDeValidadeAposRegresso > 0) {
      const dias = regra.diasDeValidadeAposRegresso;
      if (!entrada.passaporteValidoAte) {
        itens.push({ pais: a.country, papel, estado: 'atencao', texto: `O passaporte tem de valer ${dias} dias depois do regresso. Ainda não o temos para verificar.`, source: regra.source });
      } else {
        const validade = parseMoment(entrada.passaporteValidoAte).epochMs;
        const regresso = parseMoment(entrada.regresso).epochMs;
        const folga = Math.floor((validade - regresso) / 86_400_000);
        if (folga < 0) {
          itens.push({ pais: a.country, papel, estado: 'impeditivo', texto: 'O passaporte caduca antes do regresso.', source: regra.source });
        } else if (folga < dias) {
          itens.push({ pais: a.country, papel, estado: 'impeditivo', texto: `O passaporte vale ${folga} dias depois do regresso; o destino pede ${dias}.`, source: regra.source });
        } else {
          itens.push({ pais: a.country, papel, estado: 'ok', texto: `Passaporte válido com ${folga} dias de margem (pedidos: ${dias}).`, source: regra.source });
        }
      }
    }
  };

  for (const escala of entrada.escalas) avaliar(escala, 'escala');
  avaliar(entrada.destino, 'destino');

  const estado = itens.reduce                   (
    (pior, item) => (GRAVIDADE[item.estado] > GRAVIDADE[pior] ? item.estado : pior),
    'ok',
  );
  return { estado, itens };
}

/* ── Por clima — "By Weather" ──────────────────────────────────────────── */

export const PREFERENCIAS                                                           = [
  { id: 'calor', rotulo: 'Calor de praia', alvo: 31 },
  { id: 'ameno', rotulo: 'Ameno', alvo: 23 },
  { id: 'fresco', rotulo: 'Fresco', alvo: 12 },
];

/**
 * Destinos ordenados por quão perto a máxima média do mês fica do que se quer.
 *
 * `mes` é 1 a 12. É uma ordenação, não um filtro: há sempre sugestões, e a
 * primeira é a que melhor encaixa.
 */
export function destinosPorClima(mes        , preferencia             , normais                   , limite = 4) {
  const alvo = PREFERENCIAS.find((p) => p.id === preferencia)?.alvo ?? 25;
  return normais
    .map((n) => ({ code: n.code, cidade: n.city, maxima: n.maximas[mes - 1], source: n.source }))
    .sort((a, b) => Math.abs(a.maxima - alvo) - Math.abs(b.maxima - alvo) || b.maxima - a.maxima)
    .slice(0, limite);
}
