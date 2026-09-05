import { messages as seed } from './mock.js';
import { parseMoment } from './journey.js';

export function sortForReading(list           )            {
  const rank = (m         ) => (m.needsReply && !m.read ? 0 : m.read ? 2 : 1);
  return [...list].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return parseMoment(b.at).epochMs - parseMoment(a.at).epochMs;
  });
}

export function unreadCount(list           )         {
  return list.filter((m) => !m.read).length;
}

export function relativeLabel(at        , now       = new Date())         {
  const minutos = Math.floor((now.getTime() - parseMoment(at).epochMs) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;

  const semanas = Math.floor(dias / 7);
  return semanas === 1 ? 'há 1 semana' : `há ${semanas} semanas`;
}

export function createMockMessageRepository(options              = {})                    {
  const latencyMs = options.latencyMs ?? 300;

  let estado            = seed.map((m) => ({ ...m }));

  const pausa = () => new Promise      ((resolve) => setTimeout(resolve, latencyMs));

  async function ler()                     {
    await pausa();
    if (options.failWith) throw new Error(options.failWith);
    return sortForReading(estado).map((m) => ({ ...m }));
  }

  return {
    list: () => ler(),
    async markRead(_journeyId, messageId) {

      estado = estado.map((m) => (m.id === messageId ? { ...m, read: true } : m));
      return ler();
    },
  };
}

export const messageRepository = createMockMessageRepository();
