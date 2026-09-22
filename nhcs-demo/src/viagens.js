/* GERADO — NÃO EDITAR.
 * Origem: app/src/viagens.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * As três listas de viagens e o Início em viagem, como o Draft1 os desenha.
 *
 * O Draft1 da NHCS divide o separador Journeys em *My Next Journey*, *My Future
 * Journeys* e *My Past Journeys*, e pede que o Início, durante a viagem, mostre
 * os lembretes do dia, o motorista, a bagagem e o clima do destino. A app tinha
 * uma viagem só e um Início que mudava de texto com a fase, mas não de
 * conteúdo.
 *
 * Tudo aqui depende do relógio, e o relógio entra por parâmetro: é o que deixa
 * a demonstração adiantar o tempo e os testes fixá-lo.
 */

import { journeyPhase, localDayKey, parseMoment } from './journey.js';

/**
 * Divide as viagens em próxima, futuras e passadas.
 *
 * "Próxima" é a que está a decorrer, se houver — quem está nas Maldivas quer
 * ver as Maldivas e não Nova Iorque, que é em dezembro. Se nenhuma estiver a
 * decorrer, é a que parte primeiro. Duas viagens sobrepostas são raras e
 * possíveis (uma escapadinha dentro de uma estadia longa); fica a que partiu
 * primeiro, e a outra aparece nas futuras até a primeira acabar.
 */
export function classificarViagens(viagens           , agora      )                       {
  const partida = (v         ) => parseMoment(v.departureAt).epochMs;
  const regresso = (v         ) => parseMoment(v.returnAt).epochMs;

  const passadas = viagens
    .filter((v) => journeyPhase(v, agora) === 'completed')
    .sort((a, b) => regresso(b) - regresso(a));
  const porFazer = viagens
    .filter((v) => journeyPhase(v, agora) !== 'completed')
    .sort((a, b) => partida(a) - partida(b));

  const emCurso = porFazer.find((v) => journeyPhase(v, agora) === 'travelling');
  const proxima = emCurso ?? porFazer[0] ?? null;
  const futuras = porFazer.filter((v) => v !== proxima);
  return { proxima, futuras, passadas };
}

/**
 * O dia de hoje no relógio de uma marca temporal.
 *
 * "Hoje" numa viagem Lisboa → Malé depende de onde se está: às 22h de Lisboa já
 * é amanhã nas Maldivas. Cada evento traz o seu offset, e é no relógio dele que
 * se pergunta se é hoje — a mesma regra do resto da app.
 */
function hojeNoRelogioDe(iso        , agora      )         {
  const m = parseMoment(iso);
  const offsetMs = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute) - m.epochMs;
  const ali = new Date(agora.getTime() + offsetMs);
  const p2 = (n        ) => String(n).padStart(2, '0');
  return `${ali.getUTCFullYear()}-${p2(ali.getUTCMonth() + 1)}-${p2(ali.getUTCDate())}`;
}

/**
 * "Today: Dinner at Nobu, 8:00 pm · Desert safari, 4:00 pm" — o cartão do Draft1.
 *
 * Os eventos de hoje, no relógio do sítio onde acontecem, que ainda não
 * passaram. Um lembrete de uma coisa que já aconteceu não lembra nada.
 */
export function lembretesDeHoje(viagem         , agora      )                  {
  return viagem.timeline
    .filter((e) => localDayKey(e.at) === hojeNoRelogioDe(e.at, agora))
    .filter((e) => parseMoment(e.at).epochMs >= agora.getTime())
    .sort((a, b) => parseMoment(a.at).epochMs - parseMoment(b.at).epochMs);
}

const MIN = 60_000;

/**
 * Os cartões ao vivo do Início durante a viagem: motorista, bagagem e clima.
 *
 * Cada um tem uma janela, porque um cartão fora de tempo é pior do que nenhum:
 * "o seu motorista chegou" três horas depois é ruído, e "a sua bagagem está no
 * tapete 5" antes de aterrar é mentira.
 *
 * - motorista: dos 45 minutos antes do transfer até 30 minutos depois;
 * - bagagem: da aterragem até duas horas depois;
 * - clima: durante a viagem toda.
 *
 * Os dados vêm de uma simulação presa ao itinerário, e dizem que são simulados.
 */
export function cartoesEmViagem(viagem         , agora      , simulacao                          )                   {
  if (!simulacao || simulacao.journeyId !== viagem.id) return [];
  if (journeyPhase(viagem, agora) !== 'travelling') return [];

  const cartoes                   = [];
  const quando = (id        ) => {
    const evento = viagem.timeline.find((e) => e.id === id);
    return evento ? parseMoment(evento.at).epochMs : null;
  };
  const t = agora.getTime();

  const transfer = quando(simulacao.motorista.eventId);
  if (transfer !== null && t >= transfer - 45 * MIN && t <= transfer + 30 * MIN) {
    cartoes.push({
      tipo: 'motorista',
      titulo: t >= transfer - 10 * MIN ? 'O seu transfer está à espera' : 'O seu transfer está a caminho',
      detalhe: `${simulacao.motorista.nome} · ${simulacao.motorista.veiculo}`,
    });
  }

  const chegada = quando(simulacao.bagagem.eventId);
  if (chegada !== null && t >= chegada && t <= chegada + 120 * MIN) {
    cartoes.push({ tipo: 'bagagem', titulo: `A sua bagagem: tapete ${simulacao.bagagem.tapete}`, detalhe: 'Informação do aeroporto · simulada' });
  }

  cartoes.push({
    tipo: 'clima',
    titulo: `${simulacao.clima.cidade} · ${simulacao.clima.temperaturaC} °C`,
    detalhe: `${simulacao.clima.resumo} · simulado (previsto: ${simulacao.clima.fornecedorPrevisto})`,
  });
  return cartoes;
}

/**
 * O tradutor de demonstração: frases fixas, português → inglês.
 *
 * Um tradutor a sério é uma API paga, com voz, e fica para quando houver
 * backend. O que existe aqui é o ecrã do Draft1 a funcionar com uma lista
 * curta — e a resposta diz que é só isso quando a frase não está na lista, em
 * vez de inventar uma tradução.
 */
export function traduzirFrase(texto        , frases                                   )                {
  const limpar = (s        ) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[?!.,]/g, '').trim();
  const alvo = limpar(texto);
  if (!alvo) return null;
  const frase = frases.find((f) => limpar(f.pt) === alvo);
  return frase ? frase.en : 'Sem tradução nesta demonstração — só as frases da lista.';
}
