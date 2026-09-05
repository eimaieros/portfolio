/* GERADO — NÃO EDITAR.
 * Origem: app/src/services/journey-repository.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */

import { nextJourney } from './mock.js';

/**
 * De onde vêm as viagens.
 *
 * PORQUE E QUE ISTO EXISTE
 *
 * Até aqui os ecrãs importavam `nextJourney` do `mock.ts` directamente. Isso
 * funciona enquanto o mock for a única fonte, e deixa de funcionar no dia em que
 * houver backend — porque nesse dia a viagem deixa de estar disponível no
 * instante em que o ecrã desenha. Passa a chegar mais tarde, ou a não chegar.
 *
 * A leitura da documentação da TIDE (5 de setembro, ver
 * `docs/TIDE_DISCOVERY_2026-09-05.md`) tornou isto concreto: existe mesmo uma
 * API de cliente, com `GET /api/web/client/entry/list` e
 * `GET /api/web/client/entry/:id`. O que ainda não se sabe é a forma das
 * respostas — e é precisamente por isso que esta interface fala o vocabulário
 * da **app** e não o da TIDE.
 *
 * `entry` (TIDE) → `Journey` (app). A tradução far-se-á no backend da NHCS. Se
 * a app aprender o vocabulário da TIDE, trocar de sistema um dia custa o
 * produto inteiro em vez de um ficheiro.
 *
 * NÃO HÁ AQUI TIPOS PARA AS RESPOSTAS DA TIDE, DE PROPÓSITO. A colecção Postman
 * não traz um único exemplo de resposta; qualquer tipo que eu escrevesse agora
 * seria ficção com aspecto de contrato, que é a coisa que este projecto passou
 * duas semanas a apagar.
 */

export function createMockJourneyRepository(options              = {})                    {
  const latencyMs = options.latencyMs ?? 380;

  const pausa = () => new Promise      ((resolve) => setTimeout(resolve, latencyMs));

  async function todas()                     {
    await pausa();
    if (options.failWith) throw new Error(options.failWith);
    /* Cópia rasa por viagem: quem recebe não deve conseguir alterar o mock por
       acidente. O `timeline` é partilhado de propósito — é imutável na prática
       e copiá-lo a cada leitura seria trabalho sem ganho. */
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
