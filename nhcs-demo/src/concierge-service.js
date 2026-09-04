/* GERADO — NÃO EDITAR.
 * Origem: app/src/services/concierge-service.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */

/* Extensão explícita: o Metro resolve `../mock` sozinho, o Node não. Sem ela
   nada que importe este ficheiro pode ser testado fora do bundler — que era
   exactamente a razão pela qual esta camada não tinha testes.
   `allowImportingTsExtensions` já está ligado no tsconfig e o
   `scripts/verify-mock-contract.mts` já importa assim. */
import { buildConciergeProposal } from './mock.js';

function pause(ms        )                {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRequestId()         {
  const date = new Date();
  const day = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `NHCS-${day}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function createMockConciergeService(options                              = {})                   {
  const latencyMs = options.latencyMs ?? 420;

  return {
    async prepareProposal(intent) {
      if (!intent.trim()) {
        throw new Error('Descreva o que pretende antes de criar uma proposta.');
      }

      await pause(latencyMs);
      return buildConciergeProposal(intent);
    },

    async requestHumanFollowUp({ intent, proposal }) {
      await pause(latencyMs);

      if (!intent.trim()) {
        throw new Error('Escreva o que pretende antes de enviar o pedido.');
      }

      if (proposal.status !== 'ready') {
        throw new Error('A proposta tem de estar pronta antes de ser enviada à equipa NHCS.');
      }

      return {
        id: buildRequestId(),
        message: 'Pedido recebido. Um especialista NHCS irá validar disponibilidade e condições consigo.',
        status: 'received',
      };
    },
  };
}

export const conciergeService = createMockConciergeService();
