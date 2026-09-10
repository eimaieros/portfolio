export const nextJourney          = {
  id: 'nhcs-demo-maldivas',
  destination: 'Maldivas',
  departureAt: '2026-10-10T17:30:00+01:00',
  returnAt: '2026-10-20T22:00:00+01:00',
  status: 'Em preparação',
  flightNumber: 'EK091',
  entryRequirements: {
    passportValidityDaysAfterReturn: 180,
    source:
      'Valor de demonstração, não confirmado com nenhuma fonte oficial. Antes de um cliente ver este ecrã, o requisito de cada destino tem de vir da NHCS ou de fonte consular, com data.',
  },
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

export const phaseCopy                                  = {
  preparing: {

    greeting: null,
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

export const messages            = [
  {
    id: 'msg-passaporte',
    from: 'Marta Nunes · NHCS',
    subject: 'Falta o número do passaporte',
    body: 'Para emitir os bilhetes preciso do número e validade do passaporte de cada viajante. Pode responder por aqui.',
    at: '2026-09-04T09:12:00+01:00',
    read: false,
    needsReply: true,
  },
  {
    id: 'msg-transfer',
    from: 'Marta Nunes · NHCS',
    subject: 'Transfer à chegada confirmado',
    body: 'O motorista espera na saída de bagagens com um cartão. Envio o contacto dele na véspera.',
    at: '2026-09-02T16:40:00+01:00',
    read: false,
    needsReply: false,
  },
  {
    id: 'msg-bemvindo',
    from: 'Equipa NHCS',
    subject: 'A sua viagem está a ser preparada',
    body: 'Vamos acompanhando cada passo. Qualquer coisa que precise, é por aqui ou pelo concierge.',
    at: '2026-08-28T11:05:00+01:00',
    read: true,
    needsReply: false,
  },
];

export const documents                   = [
  {
    id: 'doc-passaporte-rodrigo',
    kind: 'passport',
    title: 'Passaporte',
    holder: 'Rodrigo Figueiredo',
    expiresAt: '2027-01-15T00:00:00+01:00',
    provided: true,
    hasFile: false,
  },
  {
    id: 'doc-passaporte-sofia',
    kind: 'passport',
    title: 'Passaporte',
    holder: 'Sofia Figueiredo',
    provided: false,
    hasFile: false,
  },
  {
    id: 'doc-seguro',
    kind: 'insurance',
    title: 'Seguro de viagem',
    holder: 'Ambos os viajantes',
    expiresAt: '2026-10-27T23:59:00+01:00',
    provided: true,
    hasFile: false,
  },
  {
    id: 'doc-bilhete',
    kind: 'ticket',
    title: 'Bilhete de avião',
    holder: 'Ambos os viajantes',
    provided: true,
    hasFile: false,
  },
  {
    id: 'doc-voucher',
    kind: 'voucher',
    title: 'Voucher de hotel',
    holder: 'Ambos os viajantes',
    provided: true,
    hasFile: false,
  },
  {
    id: 'doc-transfer',
    kind: 'transfer',
    title: 'Transfer privado',
    holder: 'Ambos os viajantes',
    provided: true,
    hasFile: false,
  },
];

export const promptSuggestions = [
  'Planear uma surpresa',
  'Encontrar uma praia quente durante 10 dias',
  'Marcar jantar para esta noite',
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
