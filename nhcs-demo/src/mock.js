/* GERADO — NÃO EDITAR.
 * Origem: app/src/mock.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */


/**
 * Dados de demonstração. Nada aqui é uma reserva, uma disponibilidade ou um
 * preço: os identificadores de voo são ilustrativos e a interface diz isso em
 * cada ecrã. Ver `docs/PRODUCT_UX_SPEC_V1.md`, secção "Interaction integrity".
 *
 * As horas trazem o offset do sítio onde acontecem — +01:00 em Lisboa, +05:00
 * nas Maldivas. Não é decoração: é a razão pela qual a chegada às 07:00 aparece
 * como 07:00 e não como 03:00 depois de o telemóvel mudar de fuso. Ver
 * `journey.ts`.
 */
export const nextJourney          = {
  id: 'nhcs-demo-maldivas',
  destination: 'Maldivas',
  departureAt: '2026-10-10T17:30:00+01:00',
  returnAt: '2026-10-20T22:00:00+01:00',
  status: 'Em preparação',
  flightNumber: 'EK091',
  route: [
    { code: 'LIS', city: 'Lisboa' },
    { code: 'DXB', city: 'Dubai' },
    { code: 'MLE', city: 'Malé' },
  ],
  timeline: [
    {
      id: 'check-in',
      at: '2026-10-10T14:30:00+01:00',
      title: 'Check-in',
      detail: 'EK091 · Lisboa, Terminal 1 · identificadores apenas ilustrativos',
      kind: 'flight',
    },
    {
      id: 'departure',
      at: '2026-10-10T17:30:00+01:00',
      title: 'Partida para Malé',
      detail: 'LIS → DXB → MLE · Classe executiva',
      kind: 'flight',
    },
    {
      id: 'arrival',
      at: '2026-10-11T07:00:00+05:00',
      title: 'Chegada e lounge VIP',
      detail: 'Aeroporto internacional de Malé · assistência NHCS à chegada',
      kind: 'transfer',
    },
    {
      id: 'seaplane',
      at: '2026-10-11T09:30:00+05:00',
      title: 'Hidroavião privado',
      detail: 'Transfer até ao resort · embarque acompanhado',
      kind: 'transfer',
    },
    {
      id: 'spa',
      at: '2026-10-11T16:00:00+05:00',
      title: 'Tratamento Ocean Ritual',
      detail: '90 minutos · exemplo de um item que poderia constar no itinerário',
      kind: 'experience',
    },
  ],
};

/**
 * O Início muda com a fase da viagem.
 *
 * Antes dizia sempre "A sua próxima viagem", em qualquer dia — inclusive com o
 * cliente já lá. Cada fase tem uma pergunta diferente, e o convite ao concierge
 * muda com ela: quem está a preparar quer antecipar, quem já chegou quer algo
 * para hoje.
 */

export const phaseCopy                                  = {
  preparing: {
    greeting: 'Bom dia',
    heroEyebrow: 'A sua próxima viagem',
    sectionTitle: 'Antes de partir',
    calloutTitle: 'Há algo que a NHCS possa antecipar?',
    calloutText: 'Peça um momento especial, uma alteração ou ajuda imediata.',
    calloutPrompt: 'Quero preparar algo especial para a chegada às Maldivas.',
  },
  imminent: {
    greeting: 'Está quase',
    heroEyebrow: 'Parte dentro de dois dias',
    sectionTitle: 'Antes de sair de casa',
    calloutTitle: 'Falta alguma coisa para a partida?',
    calloutText: 'Documentos, transferência para o aeroporto ou uma alteração de última hora.',
    calloutPrompt: 'Preciso de confirmar a transferência para o aeroporto.',
  },
  travelling: {
    greeting: 'Boa viagem',
    heroEyebrow: 'Está em viagem',
    sectionTitle: 'A seguir',
    calloutTitle: 'Precisa de alguma coisa agora?',
    calloutText: 'A equipa NHCS acompanha a viagem e responde durante a estadia.',
    calloutPrompt: 'Preciso de ajuda com o meu itinerário de hoje.',
  },
  completed: {
    greeting: 'Bem-vindo de volta',
    heroEyebrow: 'A sua última viagem',
    sectionTitle: 'Depois da viagem',
    calloutTitle: 'Quer repetir, ou ir a outro sítio?',
    calloutText: 'A NHCS guarda as suas preferências para não ter de repetir o contexto.',
    calloutPrompt: 'Quero planear a próxima viagem com o mesmo estilo.',
  },
};

export const promptSuggestions = [
  'Planeia uma surpresa',
  'Encontra uma praia quente durante 10 dias',
  'Marca jantar para esta noite',
];

export const planCategories = [
  { title: 'Voos', detail: 'Rotas e horários alinhados com as suas preferências.', prompt: 'Procuro voos em classe executiva.' },
  { title: 'Estadias', detail: 'Hotéis e villas escolhidos pelo seu estilo.', prompt: 'Quero uma estadia tranquila de 5 estrelas.' },
  { title: 'Transfers', detail: 'Meet & greet, motoristas e logística porta a porta.', prompt: 'Preciso de um transfer privado.' },
  { title: 'Experiências', detail: 'Restaurantes, cultura e momentos exclusivos NHCS.', prompt: 'Sugere uma experiência especial.' },
];

const beachProposal                                           = {
  title: 'Uma escapadinha de ilha tranquila.',
  summary: 'Com base no que pediu, começaria por Maldivas, Seychelles e Maurícia, com estadias privadas e transfers sem fricção.',
  understood: ['10 dias', 'Clima quente e praia', 'Experiência cuidada, não uma pesquisa genérica'],
  nextSteps: ['Confirmar datas e passageiros', 'Preparar 2 propostas comparáveis', 'Validar disponibilidade antes de qualquer cobrança'],
  status: 'ready',
};

const dinnerProposal                                           = {
  title: 'Um jantar à sua altura, esta noite.',
  summary: 'Posso selecionar uma mesa alinhada com o seu itinerário e confirmar transporte, preferências alimentares e horário ideal.',
  understood: ['Pedido para hoje', 'Experiência de restauração', 'Coordenação com a agenda de viagem'],
  nextSteps: ['Confirmar número de pessoas', 'Apresentar opções com disponibilidade real', 'Reservar apenas após a sua aprovação'],
  status: 'ready',
};

const transferProposal                                           = {
  title: 'Transporte tratado, porta a porta.',
  summary: 'Posso coordenar motorista, horário e ponto de encontro com o seu voo, e confirmar o contacto do condutor antes da partida.',
  understood: ['Deslocação a organizar', 'Ligação ao horário do voo', 'Ponto de encontro e contacto confirmados'],
  nextSteps: ['Confirmar morada, hora e número de passageiros', 'Reservar veículo com o parceiro aprovado', 'Enviar contacto do motorista antes da recolha'],
  status: 'ready',
};

const generalProposal                                           = {
  title: 'Vamos transformar isso num plano.',
  summary: 'A NHCS vai recolher só o contexto que falta e devolver uma proposta clara, com custos e condições antes da confirmação.',
  understood: ['Pedido recebido', 'Preferências do perfil serão consideradas', 'Aprovação do cliente é obrigatória'],
  nextSteps: ['Clarificar o essencial', 'Pesquisar parceiros aprovados', 'Apresentar proposta para confirmação'],
  status: 'ready',
};

export function buildConciergeProposal(input        )                    {
  const intent = input.trim().toLocaleLowerCase('pt-PT');

  if (/(jantar|restaurante|mesa|dinner)/.test(intent)) return cloneProposal(dinnerProposal, input);
  if (/(transfer|motorista|carro|aeroporto|recolha)/.test(intent)) return cloneProposal(transferProposal, input);
  if (/(praia|quente|ilha|maldiv|seychell|férias|ferias)/.test(intent)) return cloneProposal(beachProposal, input);
  return cloneProposal(generalProposal, input);
}

function cloneProposal(proposal                                          , requestIntent        )                    {
  return {
    ...proposal,
    nextSteps: [...proposal.nextSteps],
    requestIntent: requestIntent.trim(),
    understood: [...proposal.understood],
  };
}
