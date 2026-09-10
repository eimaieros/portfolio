const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/;

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIA_MS = 86_400_000;

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
    zone,
  };
}

export function deslocar(iso        , { dias = 0, hora }                                  )         {
  const m = parseMoment(iso);
  const base = new Date(Date.UTC(m.year, m.month - 1, m.day + dias, hora ?? m.hour, hora === undefined ? m.minute : 0));
  const p2 = (n        ) => String(n).padStart(2, '0');
  return `${base.getUTCFullYear()}-${p2(base.getUTCMonth() + 1)}-${p2(base.getUTCDate())}`
    + `T${p2(base.getUTCHours())}:${p2(base.getUTCMinutes())}:00${m.zone}`;
}

const pad = (value        ) => String(value).padStart(2, '0');

export function formatTime(iso        )         {
  const moment = parseMoment(iso);
  return `${pad(moment.hour)}:${pad(moment.minute)}`;
}

export function localDayKey(iso        )         {
  const moment = parseMoment(iso);
  return `${moment.year}-${pad(moment.month)}-${pad(moment.day)}`;
}

export function formatDay(iso        )         {
  const moment = parseMoment(iso);
  return `${moment.day} de ${MESES[moment.month - 1]}`;
}

export function formatFullDay(iso        )         {
  const moment = parseMoment(iso);
  return `${moment.day} de ${MESES[moment.month - 1]} de ${moment.year}`;
}

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

export function journeyPhase(journey         , now       = new Date())               {
  const departure = parseMoment(journey.departureAt).epochMs;
  const returning = parseMoment(journey.returnAt).epochMs;
  const currentMs = now.getTime();

  if (currentMs > returning) return 'completed';
  if (currentMs >= departure) return 'travelling';
  if (departure - currentMs <= 2 * DIA_MS) return 'imminent';
  return 'preparing';
}

function calendarDaysBetween(fromIso        , now      )         {
  const from = parseMoment(fromIso);

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

export function routeLabel(journey         )         {
  const paragens = journey.route.map((p) => p.code).join(' → ');
  return journey.flightNumber ? `${journey.flightNumber} · ${paragens}` : paragens;
}

export function eventProgress(journey         )                  {
  const instantes = journey.timeline.map((e) => parseMoment(e.at).epochMs);
  if (!instantes.length) return [];

  const inicio = Math.min(...instantes);
  const fim = Math.max(...instantes);
  const intervalo = fim - inicio;

  return journey.timeline.map((evento, i) => ({
    fraction: intervalo === 0 ? 0 : (instantes[i] - inicio) / intervalo,
    id: evento.id,
  }));
}

export function nextEvent(journey         , now       = new Date())                       {
  const currentMs = now.getTime();
  for (const event of journey.timeline) {
    if (parseMoment(event.at).epochMs >= currentMs) return event;
  }
  return null;
}

export function saudacaoDoDia(agora      )         {
  const hora = agora.getHours();

  if (hora < 6) return 'Boa noite';
  if (hora < 13) return 'Bom dia';
  if (hora < 20) return 'Boa tarde';
  return 'Boa noite';
}
