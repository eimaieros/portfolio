import { rotuloDePassageiros, totalDaOferta } from './pesquisa.js';

export function criarServicoDeReservaMock(opcoes         = {})                   {
  const latencia = opcoes.latenciaMs ?? 420;
  const agora = opcoes.agora ?? (() => new Date());
  const sufixo = opcoes.sufixo ?? (() => String(Math.floor(1000 + Math.random() * 9000)));
  const confirmadas = new Set        ();

  return {
    async confirmar(oferta, pesquisa, meio) {
      if (latencia > 0) await new Promise((r) => setTimeout(r, latencia));

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
