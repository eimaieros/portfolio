import { nextJourney } from './mock.js';

export function createMockJourneyRepository(options              = {})                    {
  const latencyMs = options.latencyMs ?? 380;

  const pausa = () => new Promise      ((resolve) => setTimeout(resolve, latencyMs));

  async function todas()                     {
    await pausa();
    if (options.failWith) throw new Error(options.failWith);

    return [{ ...nextJourney }];
  }

  return {
    list: todas,
    async get(id) {
      const viagens = await todas();
      const viagem = viagens.find((v) => v.id === id);
      if (!viagem) throw new Error(`Não encontrei a viagem ${id}.`);
      return viagem;
    },
  };
}

export const journeyRepository = createMockJourneyRepository();
