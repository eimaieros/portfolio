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
