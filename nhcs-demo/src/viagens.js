import { journeyPhase, localDayKey, parseMoment } from './journey.js';

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

function hojeNoRelogioDe(iso        , agora      )         {
  const m = parseMoment(iso);
  const offsetMs = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute) - m.epochMs;
  const ali = new Date(agora.getTime() + offsetMs);
  const p2 = (n        ) => String(n).padStart(2, '0');
  return `${ali.getUTCFullYear()}-${p2(ali.getUTCMonth() + 1)}-${p2(ali.getUTCDate())}`;
}

export function lembretesDeHoje(viagem         , agora      )                  {
  return viagem.timeline
    .filter((e) => localDayKey(e.at) === hojeNoRelogioDe(e.at, agora))
    .filter((e) => parseMoment(e.at).epochMs >= agora.getTime())
    .sort((a, b) => parseMoment(a.at).epochMs - parseMoment(b.at).epochMs);
}

const MIN = 60_000;

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

export function traduzirFrase(texto        , frases                                   )                {
  const limpar = (s        ) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[?!.,]/g, '').trim();
  const alvo = limpar(texto);
  if (!alvo) return null;
  const frase = frases.find((f) => limpar(f.pt) === alvo);
  return frase ? frase.en : 'Sem tradução nesta demonstração — só as frases da lista.';
}
