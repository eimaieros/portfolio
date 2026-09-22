import { CRM_DEMO } from './mock-servicos.js';

export class PedidoDeAcessoInvalido extends Error {
  constructor(mensagem        ) {
    super(mensagem);
    this.name = 'PedidoDeAcessoInvalido';
  }
}

export const MENSAGEM_DE_PEDIDO =
  'Pedido recebido. Se este email estiver associado a um cliente NHCS, enviamos o link de registo; caso contrário, enviamos a nossa política de acesso à app.';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function criarServicoDeAcessoMock(opcoes         = {})                  {
  const latencia = opcoes.latenciaMs ?? 420;
  const crm = (opcoes.crm ?? CRM_DEMO).map((e) => e.toLowerCase());
  const agora = opcoes.agora ?? (() => new Date());
  const sufixo = opcoes.sufixo ?? (() => String(Math.floor(1000 + Math.random() * 9000)));
  let pedidos = 0;

  return {
    async pedir(email) {
      if (latencia > 0) await new Promise((r) => setTimeout(r, latencia));
      const limpo = email.trim().toLowerCase();
      if (!EMAIL.test(limpo)) throw new PedidoDeAcessoInvalido('Escreva um email válido.');

      if (pedidos >= 5) throw new PedidoDeAcessoInvalido('Demasiados pedidos seguidos. Tente mais tarde ou contacte a NHCS.');
      pedidos += 1;

      const d = agora();
      const p2 = (n        ) => String(n).padStart(2, '0');
      return {
        referencia: `ACS-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${sufixo()}`,
        mensagem: MENSAGEM_DE_PEDIDO,
        ramoDemo: crm.includes(limpo) ? 'cliente' : 'nao-cliente',
      };
    },
  };
}

export const servicoDeAcesso = criarServicoDeAcessoMock();
