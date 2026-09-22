/* GERADO — NÃO EDITAR.
 * Origem: app/src/services/reserva.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * Reservar e pagar — o fim do fluxo de pesquisa do Draft1.
 *
 * O Draft1 diz o que acontece depois do pagamento: a TIDE avança com as
 * reservas, a app abre sozinha o processo na TIDE — para ninguém o ter de abrir
 * à mão —, a TIDE emite a fatura ao cliente, e a fatura fica guardada na app.
 *
 * Esta é a versão de demonstração desse fluxo, e é **deliberadamente incapaz de
 * cobrar**: não há fornecedor de pagamentos, não há reserva e não há processo
 * na TIDE. O que há é a forma do que voltaria — uma referência, o processo que
 * seria aberto, e uma fatura no estado "por emitir" — para os ecrãs poderem ser
 * desenhados e revistos antes de haver backend.
 *
 * O recibo diz `cobrado: false` e `processoTide: 'simulado'` em vez de omitir os
 * campos, para nenhum ecrã poder mostrar "pago" por engano: o ecrã tem de ler o
 * campo, e o campo diz que não.
 */

import { rotuloDePassageiros, totalDaOferta } from './pesquisa.js';

export function criarServicoDeReservaMock(opcoes         = {})                   {
  const latencia = opcoes.latenciaMs ?? 420;
  const agora = opcoes.agora ?? (() => new Date());
  const sufixo = opcoes.sufixo ?? (() => String(Math.floor(1000 + Math.random() * 9000)));
  const confirmadas = new Set        ();

  return {
    async confirmar(oferta, pesquisa, meio) {
      if (latencia > 0) await new Promise((r) => setTimeout(r, latencia));
      /* Dois toques no botão não são duas reservas. Com dinheiro a sério isto é
         a diferença entre um cliente contente e um estorno. */
      if (confirmadas.has(oferta.id)) throw new Error('Esta reserva já foi enviada.');
      confirmadas.add(oferta.id);

      const d = agora();
      const p2 = (n        ) => String(n).padStart(2, '0');
      const referencia = `NHCS-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${sufixo()}`;
      const { total } = totalDaOferta(oferta, pesquisa);

      return {
        referencia,
        total,
        cobrado: false,
        processoTide: 'simulado',
        fatura: {
          id: `fatura-${referencia}`,
          categoria: 'voos',
          tipo: 'fiscal',
          titulo: `Fatura · ${pesquisa.de} → ${pesquisa.para}`,
          referencia,
          emitidoPor: 'TIDE',
          estado: 'por-emitir',
          detalhe: `${rotuloDePassageiros(pesquisa.passageiros)} · ${meio.rotulo}`,
        },
        mensagem:
          'Demonstração: nada foi cobrado e nenhuma reserva foi feita. Em produção, a confirmação do pagamento abre o processo na TIDE, a TIDE emite a fatura, e a fatura aparece aqui na carteira.',
      };
    },
  };
}

export const servicoDeReserva = criarServicoDeReservaMock();
