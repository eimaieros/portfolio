/* GERADO — NÃO EDITAR.
 * Origem: app/src/services/message-repository.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */

import { messages as seed } from './mock.js';
import { parseMoment } from './journey.js';

/**
 * As mensagens da equipa NHCS sobre uma viagem.
 *
 * PORQUE E QUE ISTO EXISTE
 *
 * A especificação de produto pede "NHCS alerts and messages" no Início desde a
 * V1 (§4) e nunca chegou a existir — o Início tinha a viagem, o voo e o
 * concierge, e nenhuma maneira de a NHCS dizer alguma coisa ao cliente. Numa
 * app de serviço, isso é a funcionalidade que falta e não uma que sobra: a
 * relação com um concierge é feita de mensagens.
 *
 * A leitura da documentação da TIDE mostrou que o backend existe:
 * `GET /api/web/client/entry/:id/mails` e `PUT /api/web/client/mail/:noteId/read`.
 * A forma da resposta ainda não é conhecida, por isso o modelo aqui é o da app.
 *
 * Mesma fronteira que o `JourneyRepository`: uma interface que fala o
 * vocabulário da app, um mock por trás hoje, um cliente HTTP amanhã.
 */

/**
 * Ordena para leitura, não por data.
 *
 * Uma mensagem que pede acção — o passaporte que falta, a confirmação que
 * ninguém deu — vai à frente, mesmo que seja mais antiga do que uma
 * informativa. Depois vêm as por ler, e só depois as lidas. Dentro de cada
 * grupo, a mais recente primeiro.
 *
 * Ordenar só por data punha "o seu motorista está confirmado" por cima de
 * "precisamos do seu passaporte até quinta", e a segunda é a única com
 * consequência.
 */
export function sortForReading(list           )            {
  const rank = (m         ) => (m.needsReply && !m.read ? 0 : m.read ? 2 : 1);
  return [...list].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return parseMoment(b.at).epochMs - parseMoment(a.at).epochMs;
  });
}

/** Quantas estão por ler. É o número que aparece no Início. */
export function unreadCount(list           )         {
  return list.filter((m) => !m.read).length;
}

/**
 * "há 2 dias", "ontem", "há 3 h".
 *
 * Sem `Intl.RelativeTimeFormat`, pela mesma razão que os meses são uma
 * constante: o Hermes em Android é compilado com ICU reduzido em muitas
 * configurações e cai para inglês sem avisar.
 */
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
  /* Cópia própria: marcar como lida altera o estado desta instância e nunca o
     `mock.ts`, que é partilhado por todos os testes. */
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
      /* Marca antes de esperar: quem tocou já viu o estado mudar, e a espera é
         só a confirmação a caminho. Se falhar, a lista é recarregada. */
      estado = estado.map((m) => (m.id === messageId ? { ...m, read: true } : m));
      return ler();
    },
  };
}

export const messageRepository = createMockMessageRepository();
