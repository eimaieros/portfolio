/* GERADO — NÃO EDITAR.
 * Origem: app/src/journey.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * Tempo de viagem: fases, datas e horas do itinerário.
 *
 * PORQUE E QUE ISTO EXISTE (dois defeitos reais no código anterior)
 *
 * 1. UM ITINERÁRIO DAVA-SE POR CONCLUÍDO A MEIO DA VIAGEM.
 *    `getJourneyTiming` só conhecia a partida. Qualquer momento depois dela
 *    caía em `daysUntilDeparture < 0` e devolvia "Itinerário concluído" — ou
 *    seja, a 15 de outubro, com o cliente na ilha e cinco dias por viajar, o
 *    Início dizia-lhe que a viagem tinha acabado. A app não tinha o fim da
 *    viagem em lado nenhum, por isso não era um erro de cálculo: era uma
 *    pergunta que os dados não sabiam responder. Daí `returnAt`.
 *
 * 2. AS HORAS DO ITINERÁRIO ERAM MOSTRADAS NO FUSO DO TELEMÓVEL.
 *    `Intl.DateTimeFormat('pt-PT', { hour, minute }).format(departure)` formata
 *    no fuso do dispositivo. Num itinerário Lisboa → Dubai → Malé isso é o
 *    defeito mais caro que uma app de viagem pode ter: o cliente aterra em
 *    Malé, o telemóvel muda para +05:00, e a hora do voo de regresso passa a
 *    aparecer quatro horas ao lado do que está no bilhete. As horas de um
 *    itinerário são locais ao sítio onde acontecem, sempre.
 *
 *    Por isso nada aqui usa `Intl` nem `Date` para formatar. Lê-se o offset que
 *    já vem dentro da string ISO e formata-se a partir dele. `Date` só é usado
 *    para comparar instantes, que é a única coisa para que serve sem ambiguidade.
 *
 * PORQUE E QUE OS MESES SÃO UMA CONSTANTE E NÃO `Intl`
 *
 * O Hermes (motor JS do React Native em Android) é compilado com ICU reduzido
 * em muitas configurações, e `Intl.DateTimeFormat` com `month: 'long'` cai para
 * inglês ou para o número sem avisar. Um nome de mês errado num itinerário não
 * rebenta nada — aparece só no ecrã de quem está a viajar.
 */

/** Momento com o relógio do sítio onde acontece, mais o instante absoluto. */

const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/;

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIA_MS = 86_400_000;

/**
 * Lê uma marca temporal ISO com offset explícito.
 *
 * Rejeita strings sem offset de propósito. `new Date('2026-10-10T17:30')` é
 * interpretado como hora local do dispositivo — que é exactamente a confusão
 * que este módulo existe para eliminar. Se o offset falta, o dado está errado
 * na origem e é melhor saber-se já.
 */
export function parseMoment(iso        )              {
  const m = ISO.exec(iso);
  if (!m) {
    throw new Error(`Marca temporal sem offset explícito: ${iso}. Use 2026-10-10T17:30:00+01:00.`);
  }

  const [, year, month, day, hour, minute, second, zone] = m;
  const offsetMinutes = zone === 'Z'
    ? 0
    : (zone.startsWith('-') ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6)));

  const wallClockMs = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second ?? '0'));

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    epochMs: wallClockMs - offsetMinutes * 60_000,
  };
}

const pad = (value        ) => String(value).padStart(2, '0');

/** "17:30", no relógio do sítio onde o evento acontece. */
export function formatTime(iso        )         {
  const moment = parseMoment(iso);
  return `${pad(moment.hour)}:${pad(moment.minute)}`;
}

/** "2026-10-11" no relógio local do evento — a chave que agrupa um dia. */
export function localDayKey(iso        )         {
  const moment = parseMoment(iso);
  return `${moment.year}-${pad(moment.month)}-${pad(moment.day)}`;
}

/** "11 de outubro" — cabeçalho de dia dentro do itinerário. */
export function formatDay(iso        )         {
  const moment = parseMoment(iso);
  return `${moment.day} de ${MESES[moment.month - 1]}`;
}

/**
 * "10 – 20 de outubro de 2026", e as variantes quando o mês ou o ano mudam.
 *
 * Antes isto era um campo escrito à mão (`dates: '10 - 20 outubro 2026'`) ao
 * lado das marcas temporais. Dois sítios para o mesmo facto, e o texto não
 * falha quando discorda das datas — só fica errado. Agora deriva-se.
 */
export function formatRange(journey         )         {
  const start = parseMoment(journey.departureAt);
  const end = parseMoment(journey.returnAt);

  if (start.year !== end.year) {
    return `${start.day} de ${MESES[start.month - 1]} de ${start.year} – ${end.day} de ${MESES[end.month - 1]} de ${end.year}`;
  }
  if (start.month !== end.month) {
    return `${start.day} de ${MESES[start.month - 1]} – ${end.day} de ${MESES[end.month - 1]} de ${end.year}`;
  }
  return `${start.day} – ${end.day} de ${MESES[start.month - 1]} de ${start.year}`;
}

/**
 * Em que ponto da viagem estamos.
 *
 * `imminent` é as 48 horas antes da partida, porque é a janela em que o Início
 * deixa de ser inspiração e passa a ser logística: check-in, documentos,
 * transferência. A especificação pede um Início que muda com o estado de viagem
 * (§4) e a app tinha um Início só, igual em qualquer dia do ano.
 */
export function journeyPhase(journey         , now       = new Date())               {
  const departure = parseMoment(journey.departureAt).epochMs;
  const returning = parseMoment(journey.returnAt).epochMs;
  const currentMs = now.getTime();

  if (currentMs > returning) return 'completed';
  if (currentMs >= departure) return 'travelling';
  if (departure - currentMs <= 2 * DIA_MS) return 'imminent';
  return 'preparing';
}

/**
 * Conta dias de calendário no relógio do sítio de partida, e não em UTC.
 *
 * A versão anterior misturava `Date.UTC(now.getFullYear(), …)` — campos do fuso
 * do dispositivo empacotados como se fossem UTC — com os campos da partida. Dá
 * o resultado certo quando os dois estão no mesmo fuso e erra por um dia quando
 * não estão, que é o caso normal de quem viaja.
 */
function calendarDaysBetween(fromIso        , now      )         {
  const from = parseMoment(fromIso);
  /* O relógio local do sítio de partida, no instante `now`: o instante absoluto
     mais o offset que aquela marca temporal declara. */
  const offsetMs = Date.UTC(from.year, from.month - 1, from.day, from.hour, from.minute) - from.epochMs;
  const nowThere = new Date(now.getTime() + offsetMs);

  const startOfDeparture = Date.UTC(from.year, from.month - 1, from.day);
  const startOfNow = Date.UTC(nowThere.getUTCFullYear(), nowThere.getUTCMonth(), nowThere.getUTCDate());
  return Math.round((startOfDeparture - startOfNow) / DIA_MS);
}

export function getJourneyTiming(journey         , now       = new Date())                {
  const phase = journeyPhase(journey, now);
  const daysUntilDeparture = calendarDaysBetween(journey.departureAt, now);

  const totalDays = Math.max(
    1,
    Math.round((parseMoment(journey.returnAt).epochMs - parseMoment(journey.departureAt).epochMs) / DIA_MS) + 1,
  );

  let relativeLabel        ;
  if (phase === 'completed') {
    relativeLabel = 'Viagem concluída';
  } else if (phase === 'travelling') {
    const dayOfTrip = Math.min(totalDays, 1 - daysUntilDeparture);
    relativeLabel = `Dia ${dayOfTrip} de ${totalDays}`;
  } else if (daysUntilDeparture === 0) {
    relativeLabel = 'Hoje';
  } else if (daysUntilDeparture === 1) {
    relativeLabel = 'Amanhã';
  } else {
    relativeLabel = `Em ${daysUntilDeparture} dias`;
  }

  return {
    datesLabel: formatRange(journey),
    daysUntilDeparture,
    phase,
    relativeLabel,
    timeLabel: formatTime(journey.departureAt),
  };
}

/**
 * Agrupa o itinerário por dia local.
 *
 * O ecrã de viagens listava "14:30 Check-in" e logo a seguir "07:00 Chegada"
 * sem dizer que são dias diferentes. Numa lista de horas por ordem crescente,
 * um 07:00 depois de um 17:30 lê-se como erro, não como dia seguinte.
 */
export function groupByDay(journey         )                {
  const days                = [];

  for (const event of journey.timeline) {
    const key = localDayKey(event.at);
    const last = days[days.length - 1];
    if (last && last.key === key) {
      last.events.push(event);
      continue;
    }
    days.push({ events: [event], key, label: formatDay(event.at) });
  }

  return days;
}

/** O próximo momento do itinerário, ou nulo se já passaram todos. */
export function nextEvent(journey         , now       = new Date())                       {
  const currentMs = now.getTime();
  for (const event of journey.timeline) {
    if (parseMoment(event.at).epochMs >= currentMs) return event;
  }
  return null;
}
