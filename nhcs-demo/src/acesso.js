/* GERADO — NÃO EDITAR.
 * Origem: app/src/services/acesso.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * "Request Access" — o segundo botão do ecrã de entrada do Draft1.
 *
 * O Draft1 da NHCS pede que o pedido seja verificado no CRM: a quem já é
 * cliente, o formulário de registo; a quem não é, a política de acesso da app.
 *
 * A CONSULTA AO CRM FAZ-SE. O QUE NÃO SE FAZ É MOSTRAR O RESULTADO NO ECRÃ.
 *
 * Se o ecrã mudar consoante o email é ou não de um cliente, qualquer pessoa
 * descobre quem é cliente da NHCS escrevendo emails num formulário. Numa agência
 * de concierge de luxo, a lista de clientes é das coisas mais sensíveis que a
 * empresa tem — e o ecrã de entrada é a única página da app que não pede
 * autenticação.
 *
 * Portanto: o ecrã responde sempre o mesmo, e os dois ramos do Draft1 seguem
 * por email — o link para o formulário de registo a quem é cliente, a política
 * de acesso a quem não é. O dono do email é o único que fica a saber. É a mesma
 * razão pela qual o `client-session.ts` dá uma só mensagem para email errado e
 * para password errada.
 *
 * A demonstração mostra o que cada ramo receberia, com uma etiqueta a dizer que
 * isso só existe na demonstração. Em produção o campo `ramo` não sai do backend.
 */

import { CRM_DEMO } from './mock-servicos.js';

export class PedidoDeAcessoInvalido extends Error {
  constructor(mensagem        ) {
    super(mensagem);
    this.name = 'PedidoDeAcessoInvalido';
  }
}

/** A frase única. Está num sítio só para o teste garantir que é mesmo única. */
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
      /* Cinco pedidos por sessão da app, pela mesma razão que o login conta
         cinco tentativas: sem limite, o formulário é uma forma de testar uma
         lista de emails. O backend conta os dele, e é o dele que vale. */
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
