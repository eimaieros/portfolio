/* GERADO — NÃO EDITAR.
 * Origem: app/src/mock-servicos.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * Dados de demonstração para os ecrãs que o Draft1 da NHCS acrescentou.
 *
 * O Draft1 da NHCS (recebido a 22 de setembro de 2026)
 * pede pesquisa manual de voos, verificação de documentos de viagem, pesquisa
 * por clima, meteorologia, estado do voo, tradutor, contactos de emergência,
 * pedido de acesso com consulta ao CRM e o separador Chat. Cada um desses ecrãs
 * precisa de dados, e nenhum desses dados existe ainda do lado da NHCS.
 *
 * A REGRA DESTE FICHEIRO
 *
 * Tudo o que aqui está que se parece com um facto sobre o mundo — um requisito
 * de fronteira, um número de emergência, uma temperatura média, um preço —
 * carrega um campo que diz de onde veio. Hoje esse campo diz sempre a mesma
 * coisa: **é um valor de demonstração, não confirmado**. É a regra que o
 * `entryRequirements.source` introduziu a 5 de setembro: um requisito de
 * fronteira sem proveniência é um palpite com ar de facto, e num produto que
 * existe para evitar que alguém chegue ao aeroporto sem poder embarcar, um
 * palpite com ar de facto é o pior defeito possível.
 *
 * Em produção, cada bloco vem de um sítio diferente, e o nome desse sítio está
 * no campo `fornecedorPrevisto` quando já se sabe qual é.
 */

/** A frase que acompanha todos os valores inventados neste ficheiro. */
export const FONTE_DEMO =
  'Valor de demonstração, não confirmado com nenhuma fonte oficial. Antes de um cliente ver isto, tem de vir da NHCS ou do fornecedor, com data.';

/* ── Aeroportos ─────────────────────────────────────────────────────────── */

/**
 * Um aeroporto, para a pesquisa manual de voos.
 *
 * O `utcOffset` é **fixo e de demonstração**: é o offset de verão de cada sítio
 * e não muda com a data. Serve para a demonstração escrever horas de chegada no
 * relógio do destino, que é a regra do projecto. Em produção o offset vem do
 * fornecedor de voos para cada voo, com o fuso IANA por trás — um offset fixo
 * erra por uma hora em metade do ano.
 */

export const AEROPORTOS              = [
  { code: 'LIS', city: 'Lisboa', country: 'Portugal', countryCode: 'PT', lat: 38.7742, lon: -9.1342, utcOffset: '+01:00' },
  { code: 'OPO', city: 'Porto', country: 'Portugal', countryCode: 'PT', lat: 41.2481, lon: -8.6814, utcOffset: '+01:00' },
  { code: 'FAO', city: 'Faro', country: 'Portugal', countryCode: 'PT', lat: 37.0144, lon: -7.9659, utcOffset: '+01:00' },
  { code: 'MAD', city: 'Madrid', country: 'Espanha', countryCode: 'ES', lat: 40.4719, lon: -3.5626, utcOffset: '+02:00' },
  { code: 'BCN', city: 'Barcelona', country: 'Espanha', countryCode: 'ES', lat: 41.2974, lon: 2.0833, utcOffset: '+02:00' },
  { code: 'LHR', city: 'Londres', country: 'Reino Unido', countryCode: 'GB', lat: 51.47, lon: -0.4543, utcOffset: '+01:00' },
  { code: 'CDG', city: 'Paris', country: 'França', countryCode: 'FR', lat: 49.0097, lon: 2.5479, utcOffset: '+02:00' },
  { code: 'AMS', city: 'Amesterdão', country: 'Países Baixos', countryCode: 'NL', lat: 52.3105, lon: 4.7683, utcOffset: '+02:00' },
  { code: 'FRA', city: 'Frankfurt', country: 'Alemanha', countryCode: 'DE', lat: 50.0379, lon: 8.5622, utcOffset: '+02:00' },
  { code: 'ZRH', city: 'Zurique', country: 'Suíça', countryCode: 'CH', lat: 47.4582, lon: 8.5555, utcOffset: '+02:00' },
  { code: 'FCO', city: 'Roma', country: 'Itália', countryCode: 'IT', lat: 41.8003, lon: 12.2389, utcOffset: '+02:00' },
  { code: 'IST', city: 'Istambul', country: 'Turquia', countryCode: 'TR', lat: 41.2753, lon: 28.7519, utcOffset: '+03:00' },
  { code: 'DOH', city: 'Doha', country: 'Catar', countryCode: 'QA', lat: 25.2731, lon: 51.6081, utcOffset: '+03:00' },
  { code: 'DXB', city: 'Dubai', country: 'Emirados Árabes Unidos', countryCode: 'AE', lat: 25.2532, lon: 55.3657, utcOffset: '+04:00' },
  { code: 'MLE', city: 'Malé', country: 'Maldivas', countryCode: 'MV', lat: 4.1918, lon: 73.529, utcOffset: '+05:00' },
  { code: 'BKK', city: 'Banguecoque', country: 'Tailândia', countryCode: 'TH', lat: 13.69, lon: 100.7501, utcOffset: '+07:00' },
  { code: 'JFK', city: 'Nova Iorque', country: 'Estados Unidos', countryCode: 'US', lat: 40.6413, lon: -73.7781, utcOffset: '-04:00' },
  { code: 'MIA', city: 'Miami', country: 'Estados Unidos', countryCode: 'US', lat: 25.7959, lon: -80.287, utcOffset: '-04:00' },
  { code: 'GRU', city: 'São Paulo', country: 'Brasil', countryCode: 'BR', lat: -23.4356, lon: -46.4731, utcOffset: '-03:00' },
  { code: 'GIG', city: 'Rio de Janeiro', country: 'Brasil', countryCode: 'BR', lat: -22.809, lon: -43.2506, utcOffset: '-03:00' },
  { code: 'CPT', city: 'Cidade do Cabo', country: 'África do Sul', countryCode: 'ZA', lat: -33.9715, lon: 18.6021, utcOffset: '+02:00' },
];

/**
 * Pares com voo direto nesta demonstração. Ilustrativo: não é a rede de
 * nenhuma companhia, é o suficiente para a pesquisa ter voos diretos e com
 * escala e o filtro de escalas ter o que filtrar.
 */
export const ROTAS_DIRETAS           = [
  'LIS-OPO', 'LIS-FAO', 'LIS-MAD', 'LIS-BCN', 'LIS-LHR', 'LIS-CDG', 'LIS-AMS', 'LIS-FRA', 'LIS-ZRH',
  'LIS-FCO', 'LIS-IST', 'LIS-DOH', 'LIS-DXB', 'LIS-JFK', 'LIS-MIA', 'LIS-GRU', 'LIS-GIG',
  'OPO-LHR', 'OPO-CDG', 'OPO-FRA', 'DXB-MLE', 'DOH-MLE', 'IST-MLE', 'DXB-BKK', 'DOH-BKK',
  'FRA-JFK', 'LHR-JFK', 'AMS-JFK', 'CDG-JFK', 'LHR-MIA', 'MAD-MIA', 'FRA-CPT', 'LHR-CPT',
  'AMS-CPT', 'DXB-CPT', 'MAD-GRU', 'FRA-GRU',
];

/**
 * Onde se faz escala, e com quem. As companhias são reais e os números de voo
 * que a pesquisa gera **não são**: seguem o formato e mais nada, e a interface
 * diz isso por baixo de cada resultado. Os preços também não são de ninguém.
 */
export const HUBS                                                           = {
  DXB: { carrier: 'Emirates', carrierCode: 'EK' },
  DOH: { carrier: 'Qatar Airways', carrierCode: 'QR' },
  IST: { carrier: 'Turkish Airlines', carrierCode: 'TK' },
  FRA: { carrier: 'Lufthansa', carrierCode: 'LH' },
  ZRH: { carrier: 'Swiss', carrierCode: 'LX' },
  AMS: { carrier: 'KLM', carrierCode: 'KL' },
  LHR: { carrier: 'British Airways', carrierCode: 'BA' },
  MAD: { carrier: 'Iberia', carrierCode: 'IB' },
  CDG: { carrier: 'Air France', carrierCode: 'AF' },
};

/* ── Regras de entrada (o botão Timatic / Check Travel Docs) ─────────────── */

/**
 * O que um país exige a um passaporte da UE.
 *
 * O Draft1 chama a este botão "Timatic/TravelDocs". O Timatic é um produto da
 * IATA com licença comercial; não é uma API que se liga com uma chave. Até
 * haver fornecedor escolhido, a regra vem desta tabela, e a tabela diz em cada
 * linha que é de demonstração.
 */

export const REGRAS_DE_ENTRADA                   = [
  { countryCode: 'MV', country: 'Maldivas', visto: 'a-chegada', diasDeValidadeAposRegresso: 180, aplicaEmEscala: false, nota: 'Visto de turista emitido à chegada.', source: FONTE_DEMO },
  { countryCode: 'AE', country: 'Emirados Árabes Unidos', visto: 'a-chegada', diasDeValidadeAposRegresso: 180, aplicaEmEscala: false, nota: 'Entrada à chegada; em escala sem sair do aeroporto não há controlo.', source: FONTE_DEMO },
  { countryCode: 'QA', country: 'Catar', visto: 'nao-necessario', diasDeValidadeAposRegresso: 180, aplicaEmEscala: false, nota: 'Isenção de visto para estadias curtas.', source: FONTE_DEMO },
  { countryCode: 'TR', country: 'Turquia', visto: 'nao-necessario', diasDeValidadeAposRegresso: 150, aplicaEmEscala: false, nota: 'Isenção de visto para estadias curtas.', source: FONTE_DEMO },
  { countryCode: 'US', country: 'Estados Unidos', visto: 'eta', autorizacao: 'ESTA', diasDeValidadeAposRegresso: 0, aplicaEmEscala: true, nota: 'Autorização eletrónica antes de embarcar — também para quem só faz escala.', source: FONTE_DEMO },
  { countryCode: 'GB', country: 'Reino Unido', visto: 'eta', autorizacao: 'ETA', diasDeValidadeAposRegresso: 0, aplicaEmEscala: false, nota: 'Autorização eletrónica antes de embarcar.', source: FONTE_DEMO },
  { countryCode: 'TH', country: 'Tailândia', visto: 'nao-necessario', diasDeValidadeAposRegresso: 180, aplicaEmEscala: false, nota: 'Isenção de visto para estadias curtas.', source: FONTE_DEMO },
  { countryCode: 'BR', country: 'Brasil', visto: 'nao-necessario', diasDeValidadeAposRegresso: 180, aplicaEmEscala: false, nota: 'Isenção de visto para estadias curtas.', source: FONTE_DEMO },
  { countryCode: 'ZA', country: 'África do Sul', visto: 'nao-necessario', diasDeValidadeAposRegresso: 30, aplicaEmEscala: false, nota: 'Isenção de visto para estadias curtas; páginas em branco no passaporte.', source: FONTE_DEMO },
  /* Espaço Schengen e UE: com documento de cidadão da UE não há visto nem
     margem de validade. Fica escrito em vez de ficar implícito, para a
     verificação poder dizer "sem requisitos" e não "sem regra". */
  ...['PT', 'ES', 'FR', 'NL', 'DE', 'IT', 'CH'].map((countryCode) => ({
    countryCode,
    country: countryCode,
    visto: 'nao-necessario'         ,
    diasDeValidadeAposRegresso: 0,
    aplicaEmEscala: false,
    nota: 'Espaço Schengen / UE: documento de cidadão da UE válido.',
    source: FONTE_DEMO,
  })),
];

/* ── Pesquisa por clima ─────────────────────────────────────────────────── */

/**
 * Máxima média aproximada por mês, de janeiro a dezembro.
 *
 * Normais climáticas arredondadas, de demonstração. Em produção vêm de um
 * serviço de clima histórico — o Draft1 aponta a OpenWeather.
 */

export const NORMAIS_CLIMATICAS                    = [
  { code: 'MLE', city: 'Maldivas', maximas: [30, 31, 31, 32, 31, 31, 30, 30, 30, 30, 30, 30], source: FONTE_DEMO },
  { code: 'DXB', city: 'Dubai', maximas: [24, 25, 29, 33, 38, 40, 41, 41, 39, 35, 30, 26], source: FONTE_DEMO },
  { code: 'MIA', city: 'Miami', maximas: [24, 25, 26, 28, 30, 32, 32, 32, 31, 29, 27, 25], source: FONTE_DEMO },
  { code: 'BKK', city: 'Banguecoque', maximas: [32, 33, 34, 35, 34, 33, 33, 33, 32, 32, 31, 31], source: FONTE_DEMO },
  { code: 'CPT', city: 'Cidade do Cabo', maximas: [27, 27, 26, 24, 21, 19, 18, 19, 20, 22, 24, 26], source: FONTE_DEMO },
  { code: 'GIG', city: 'Rio de Janeiro', maximas: [30, 31, 30, 28, 27, 26, 26, 26, 26, 27, 28, 29], source: FONTE_DEMO },
  { code: 'LIS', city: 'Lisboa', maximas: [15, 16, 19, 20, 22, 26, 28, 28, 27, 23, 18, 15], source: FONTE_DEMO },
  { code: 'FCO', city: 'Roma', maximas: [12, 13, 16, 19, 24, 28, 31, 31, 27, 22, 16, 13], source: FONTE_DEMO },
  { code: 'JFK', city: 'Nova Iorque', maximas: [4, 5, 10, 17, 22, 27, 30, 29, 25, 18, 12, 6], source: FONTE_DEMO },
  { code: 'IST', city: 'Istambul', maximas: [9, 9, 12, 16, 21, 26, 28, 29, 25, 20, 15, 11], source: FONTE_DEMO },
];

/* ── Em viagem: o que o Draft1 põe no Início ────────────────────────────── */

/**
 * O que aconteceria em tempo real durante a viagem das Maldivas.
 *
 * Motorista, tapete da bagagem e clima são dados ao vivo de três fornecedores
 * diferentes (o do transfer, o do aeroporto, o de meteorologia). Aqui estão
 * presos a eventos do itinerário, para a demonstração os mostrar à hora certa
 * quando se adianta o relógio.
 */
export const SIMULACAO_EM_VIAGEM = {
  journeyId: 'nhcs-demo-maldivas',
  motorista: { eventId: 'seaplane', nome: 'Equipa de receção do resort', veiculo: 'Hidroavião · balcão do resort no terminal' },
  bagagem: { eventId: 'arrival', tapete: 5 },
  clima: { cidade: 'Malé', temperaturaC: 31, resumo: 'Sol com algumas nuvens', fornecedorPrevisto: 'OpenWeather' },
  source: FONTE_DEMO,
};

/* ── A próxima viagem: meteorologia, estado do voo, tradutor, emergência ── */

export const PREVISAO_DEMO = {
  cidade: 'Malé',
  fornecedorPrevisto: 'OpenWeather',
  dias: [
    { dia: 'Sáb', maxima: 31, minima: 27, resumo: 'Sol' },
    { dia: 'Dom', maxima: 31, minima: 27, resumo: 'Aguaceiros à tarde' },
    { dia: 'Seg', maxima: 30, minima: 26, resumo: 'Nublado' },
    { dia: 'Ter', maxima: 31, minima: 27, resumo: 'Sol' },
    { dia: 'Qua', maxima: 32, minima: 27, resumo: 'Sol' },
  ],
  source: FONTE_DEMO,
};

export const ESTADO_DO_VOO_DEMO = {
  voo: 'EK091',
  de: 'LIS',
  para: 'DXB',
  terminal: '1',
  porta: 'por anunciar',
  estado: 'Programado',
  atrasoMinutos: 15,
  fornecedorPrevisto: 'FlightStats (Cirium)',
  source: FONTE_DEMO,
};

/** Frases fixas. Um tradutor a sério é uma API paga; isto mostra o ecrã. */
export const FRASES_DEMO                                    = [
  { pt: 'Obrigado', en: 'Thank you' },
  { pt: 'Bom dia', en: 'Good morning' },
  { pt: 'Quanto custa?', en: 'How much is it?' },
  { pt: 'Onde fica a casa de banho?', en: 'Where is the restroom?' },
  { pt: 'Preciso de um médico', en: 'I need a doctor' },
  { pt: 'Sou alérgico a frutos secos', en: 'I am allergic to nuts' },
  { pt: 'A conta, por favor', en: 'The bill, please' },
  { pt: 'Pode chamar um táxi?', en: 'Could you call a taxi?' },
];

/**
 * Contactos de emergência por destino.
 *
 * Os números locais são o género de facto que não pode estar errado, e por isso
 * vêm com a proveniência ao lado: são de demonstração e a NHCS confirma cada um
 * em fonte oficial antes de um cliente os ver. A linha da NHCS espera pelo
 * número real — não se inventa um telefone de uma empresa.
 */
export const CONTACTOS_DE_EMERGENCIA

   = {
  MV: {
    pais: 'Maldivas',
    contactos: [
      { nome: 'NHCS — assistência 24 horas', numero: null },
      { nome: 'Polícia', numero: '119' },
      { nome: 'Ambulância', numero: '102' },
      { nome: 'Bombeiros', numero: '118' },
      { nome: 'Representação consular portuguesa', numero: null },
    ],
    source: FONTE_DEMO,
  },
};

/* ── Chat, pagamentos, CRM ──────────────────────────────────────────────── */

/**
 * O número de WhatsApp da NHCS. `null` até alguém da NHCS o dar.
 *
 * O botão WhatsApp do Draft1 é uma ligação `wa.me/<número>` e não precisa da
 * WhatsApp Business API para existir — essa só é precisa se a NHCS quiser
 * mandar mensagens a partir de um sistema. Com `null`, o botão aparece e diz
 * porque é que ainda não abre.
 */
export const WHATSAPP_NHCS                = null;

/**
 * Meios de pagamento guardados, como a app os vê.
 *
 * A app **nunca** vê um número de cartão: vê o que o fornecedor de pagamentos
 * devolve — uma marca, os últimos quatro dígitos e um token. Guardar o número é
 * pôr a NHCS no âmbito do PCI DSS, e a proposta de 18 de setembro fala em
 * guardar "payment cards" no perfil. Este tipo é a forma de isso não acontecer
 * por acidente: não tem onde pôr o número.
 */

export const MEIOS_DE_PAGAMENTO_DEMO                    = [
  { id: 'pm-visa', tipo: 'cartao', rotulo: 'Visa •••• 4242', token: 'tok_demo_nao_serve' },
  { id: 'pm-transferencia', tipo: 'transferencia', rotulo: 'Transferência bancária imediata', token: null },
];

/**
 * Os emails que o CRM de demonstração reconhece como clientes.
 *
 * O Draft1 manda o "Request Access" consultar o CRM: se é cliente, formulário
 * de registo; se não é, a política de acesso. A consulta existe; o que ela
 * **não** faz é mostrar o resultado no ecrã — ver `services/acesso.ts`.
 */
export const CRM_DEMO           = ['cliente@exemplo.pt', 'familia@exemplo.pt'];
