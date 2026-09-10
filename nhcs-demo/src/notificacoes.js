import { deslocar, formatTime, parseMoment, routeLabel } from './journey.js';
import { walletReadiness } from './document-repository.js';

export const DIAS_DE_AVISO_DE_DOCUMENTOS = 7;

export const DIAS_ATE_LEMBRAR_RESPOSTA = 2;

export function chegadaAoDestino(journey         )                                     {
  const partida = parseMoment(journey.departureAt).zone;
  for (const evento of journey.timeline) {
    if (parseMoment(evento.at).zone !== partida) return evento;
  }
  return null;
}

export function notificacoesDaViagem(
  journey         ,
  documents                  ,
  messages           ,
)                {
  const fora                = [];
  const rota = routeLabel(journey);

  const carteira = walletReadiness(documents, journey);
  if (carteira.needsAction > 0) {
    fora.push({
      id: 'documentos',
      at: deslocar(journey.departureAt, { dias: -DIAS_DE_AVISO_DE_DOCUMENTOS, hora: 9 }),
      titulo: carteira.headline,
      corpo: `Faltam ${DIAS_DE_AVISO_DE_DOCUMENTOS} dias para a partida. A NHCS trata do resto assim que estiverem.`,
      destino: 'trips',
      razao: `A carteira tem ${carteira.needsAction} documento(s) por tratar e faltam ${DIAS_DE_AVISO_DE_DOCUMENTOS} dias para a partida.`,
    });
  }

  fora.push({
    id: 'vespera',
    at: deslocar(journey.departureAt, { dias: -1, hora: 18 }),
    titulo: `Amanhã parte para ${journey.destination}.`,
    corpo: `${rota} · partida às ${formatTime(journey.departureAt)}. Está tudo pronto do nosso lado.`,
    destino: 'trips',
    razao: 'Véspera da partida, às 18:00 no relógio do aeroporto de saída.',
  });

  for (const m of messages) {
    if (!m.needsReply || m.read) continue;
    fora.push({
      id: `resposta-${m.id}`,
      at: deslocar(m.at, { dias: DIAS_ATE_LEMBRAR_RESPOSTA, hora: 10 }),
      titulo: `${m.from} continua à espera de si.`,
      corpo: m.subject,
      destino: 'home',
      razao: `A mensagem pede resposta, não foi lida, e passaram ${DIAS_ATE_LEMBRAR_RESPOSTA} dias.`,
    });
  }

  const chegada = chegadaAoDestino(journey);
  if (chegada) {
    fora.push({
      id: 'chegada',
      at: chegada.at,
      titulo: `Bem-vindo a ${journey.destination}.`,
      corpo: `${chegada.title} · ${formatTime(chegada.at)}, hora local. ${chegada.detail}`,
      destino: 'trips',
      razao: 'O primeiro momento do itinerário noutro fuso horário — é assim que se sabe que chegou.',
    });
  }

  return fora.sort((a, b) => parseMoment(a.at).epochMs - parseMoment(b.at).epochMs);
}

export function porEnviar(lista               , agora       = new Date())                {
  return lista.filter((n) => parseMoment(n.at).epochMs > agora.getTime());
}
