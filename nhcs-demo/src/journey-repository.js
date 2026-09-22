import { allJourneys, nextJourney } from './mock.js';

export function createMockJourneyRepository(options              = {})                    {
  const latencyMs = options.latencyMs ?? 380;

  const pausa = () => new Promise      ((resolve) => setTimeout(resolve, latencyMs));

  async function todas()                     {
    await pausa();
    if (options.failWith) throw new Error(options.failWith);

    return [{ ...nextJourney }];
  }

  async function todasAsViagens()                     {
    await pausa();
    if (options.failWith) throw new Error(options.failWith);
    return allJourneys.map((viagem) => ({ ...viagem }));
  }

  return {
    list: todas,
    listAll: todasAsViagens,
    async get(id) {

      const viagens = await todasAsViagens();
      const viagem = viagens.find((v) => v.id === id);
      if (!viagem) throw new Error(`Não encontrei a viagem ${id}.`);
      return viagem;
    },
  };
}

export const journeyRepository = createMockJourneyRepository();
