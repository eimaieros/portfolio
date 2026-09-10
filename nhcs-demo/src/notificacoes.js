/* GERADO — NÃO EDITAR.
 * Origem: app/src/notificacoes.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */

import { deslocar, formatTime, parseMoment, routeLabel } from './journey.js';
import { walletReadiness } from './document-repository.js';

/**
 * As notificações que a NHCS enviaria, e quando.
 *
 * PORQUE E QUE ISTO EXISTE
 *
 * *"Local notification simulation"* é um critério de saída da Fase 2 desde a
 * primeira versão do roadmap, e era o último que continuava sem existir. Não
 * por ser difícil: por ser a espécie de coisa que se adia porque não se vê no
 * ecrã enquanto não acontece.
 *
 * E é, de longe, a parte do produto com mais consequência por decisão tomada.
 * Uma notificação chega **fora** da app, num momento que o cliente não
 * escolheu, e cada uma gasta um pouco da paciência de quem a recebe. Num
 * serviço que se vende como discreto, mandar uma a mais é pior do que não
 * mandar nenhuma.
 *
 * O QUE ISTO E, E O QUE NAO E
 *
 * **É** o conjunto de regras: que notificações existem, o que dizem, e a que
 * hora — no relógio do sítio certo. É aritmética pura sobre dados que já
 * existem, e por isso testável sem telemóvel nem servidor.
 *
 * **Não é** o envio. Não há `expo-notifications`, não há push, não há
 * agendamento no sistema operativo. A app e a demonstração mostram-nas como
 * *simulação*, identificadas como tal, exactamente como fazem com a carteira e
 * com as propostas.
 *
 * CADA REGRA TRAZ A SUA RAZAO
 *
 * O campo `razao` não é comentário: vai para o ecrã. É o mesmo princípio do
 * `entryRequirements.source` da carteira — quando a app afirma alguma coisa,
 * diz de onde é que ela veio. Numa lista de notificações, essa frase é a
 * diferença entre *"porque é que me mandaram isto?"* e *"ah, faz sentido"*.
 *
 * AS HORAS
 *
 * Todas as marcas temporais saem de `deslocar()`, que constrói a hora nova no
 * mesmo relógio da que lhe deu origem. Uma notificação de véspera de partida é
 * às 18:00 **em Lisboa**, porque é aí que o cliente está; a de boas-vindas é à
 * hora de chegada **em Malé**, porque é aí que ele já está. Nenhuma passa pelo
 * fuso do telemóvel.
 */

/** Quantos dias antes da partida se avisa que há documentos por tratar. */
export const DIAS_DE_AVISO_DE_DOCUMENTOS = 7;

/** Quantos dias se espera por uma resposta antes de a lembrar. */
export const DIAS_ATE_LEMBRAR_RESPOSTA = 2;

/**
 * O primeiro momento do itinerário noutro fuso horário.
 *
 * É assim que se sabe que o cliente chegou, sem depender de um `id` chamado
 * `'arrival'` nem da posição na lista. Numa viagem dentro do mesmo fuso não
 * existe — e aí não há boas-vindas, o que está certo: uma notificação a dizer
 * "bem-vindo" a quem apanhou o comboio para o Porto é ruído.
 */
export function chegadaAoDestino(journey         )                                     {
  const partida = parseMoment(journey.departureAt).zone;
  for (const evento of journey.timeline) {
    if (parseMoment(evento.at).zone !== partida) return evento;
  }
  return null;
}

/**
 * Tudo o que a NHCS enviaria para esta viagem, por ordem cronológica.
 *
 * Não recebe `now`: a lista é do que **existe**, não do que já passou. Quem
 * quiser só as futuras filtra — e a demonstração mostra-as todas de propósito,
 * porque o que ela demonstra é a política, não o inbox.
 */
export function notificacoesDaViagem(
  journey         ,
  documents                  ,
  messages           ,
)                {
  const fora                = [];
  const rota = routeLabel(journey);

  /* 1. Documentos por tratar, uma semana antes.
        Uma semana e não três dias: um passaporte por renovar não se resolve
        num fim de semana, e avisar tarde de mais é a mesma coisa que não
        avisar. Uma semana e não um mês: a um mês ainda não é um problema, e um
        aviso que chega antes de o ser ensina a ignorá-lo. */
  const carteira = walletReadiness(documents, journey);
  if (carteira.needsAction > 0) {
    fora.push({
      id: 'documentos',
      at: deslocar(journey.departureAt, { dias: -DIAS_DE_AVISO_DE_DOCUMENTOS, hora: 9 }),
      titulo: carteira.headline,
      corpo: `Faltam ${DIAS_DE_AVISO_DE_DOCUMENTOS} dias para a partida. A NHCS trata do resto assim que estiverem.`,
      destino: 'trips',
      razao: `A carteira tem ${carteira.needsAction} ${carteira.needsAction === 1 ? 'documento' : 'documentos'} por tratar e faltam ${DIAS_DE_AVISO_DE_DOCUMENTOS} dias para a partida.`,
    });
  }

  /* 2. A véspera. É a única que toda a gente espera receber, e a hora é a que
        ainda dá para resolver alguma coisa: às 18:00 a bagagem ainda não está
        fechada. */
  fora.push({
    id: 'vespera',
    at: deslocar(journey.departureAt, { dias: -1, hora: 18 }),
    /* `"Maldivas, amanhã."` pela mesma razão do título da chegada: *parte para
       as Maldivas*, *para o Porto*, *para Paris* — e o artigo não está nos
       dados. Ver a nota mais abaixo. */
    titulo: `${journey.destination}, amanhã.`,
    corpo: `${rota} · partida às ${formatTime(journey.departureAt)}. Está tudo pronto do nosso lado.`,
    destino: 'trips',
    razao: 'Véspera da partida, às 18:00 no relógio do aeroporto de saída.',
  });

  /* 3. Uma mensagem que pede resposta e ficou por ler.
        O lembrete é sobre a mensagem, não sobre a app: quem manda é a pessoa
        que espera, e o nome dela aparece. */
  for (const m of messages) {
    if (!m.needsReply || m.read) continue;
    fora.push({
      id: `resposta-${m.id}`,
      at: deslocar(m.at, { dias: DIAS_ATE_LEMBRAR_RESPOSTA, hora: 10 }),
      titulo: `${m.from} continua à espera de si.`,
      corpo: m.subject,
      destino: 'home',
      razao: `A mensagem pede resposta, não foi lida, e passaram ${DIAS_ATE_LEMBRAR_RESPOSTA} dias.`,
    });
  }

  /* 4. A chegada. À hora do sítio, e com o primeiro momento já a seguir — que
        é a única informação de que alguém precisa depois de dez horas de voo. */
  const chegada = chegadaAoDestino(journey);
  if (chegada) {
    fora.push({
      id: 'chegada',
      at: chegada.at,
      /* `"Maldivas. Bem-vindo."` e não `"Bem-vindo a Maldivas"`.
         Em português a preposição contrai-se com o artigo do destino — *às*
         Maldivas, *ao* Porto, *a* Paris — e o artigo não está nos dados: um
         nome de cidade não diz o seu género nem o seu número. Ou se
         acrescentava um campo à `Journey` para uma frase, ou se escrevia a
         frase sem preposição. A segunda é mais curta, e soa ao resto da app,
         que já escreve assim: "Maldivas", "A sua pausa." */
      titulo: `${journey.destination}. Bem-vindo.`,
      corpo: `${chegada.title} · ${formatTime(chegada.at)}, hora local. ${chegada.detail}`,
      destino: 'trips',
      razao: 'O primeiro momento do itinerário noutro fuso horário — é assim que se sabe que chegou.',
    });
  }

  return fora.sort((a, b) => parseMoment(a.at).epochMs - parseMoment(b.at).epochMs);
}

/**
 * As que ainda estão para vir, a partir de um instante.
 *
 * Existe porque o ecrã de perfil mostra *o que a NHCS ainda vai enviar*, e uma
 * lista que inclua a de boas-vindas de uma viagem já feita é uma lista errada.
 */
export function porEnviar(lista               , agora       = new Date())                {
  return lista.filter((n) => parseMoment(n.at).epochMs > agora.getTime());
}
