/**
 * A camada de desenho da demonstração web.
 *
 * ESTE FICHEIRO NÃO TEM LÓGICA DE PRODUTO.
 *
 * Tudo o que decide alguma coisa — que proposta responde a que pedido, em que
 * fase a viagem está, como se agrupa o itinerário, quando um pedido pode seguir
 * para uma pessoa, quanto tempo o serviço espera de propósito — vem de
 * `src/*.js`, que é o TypeScript da app com os tipos retirados por
 * `tools/gerar-demo.mjs`. São os mesmos ficheiros que o Metro carrega no
 * telemóvel, e falham nos mesmos testes se alguém lhes mexer.
 *
 * O que está aqui é só o que o React Native não sabe fazer num browser:
 * transformar esses dados em DOM. Se te apetecer resolver um problema de
 * produto neste ficheiro, resolve-o no TypeScript e corre o gerador — senão
 * passam a existir duas apps, e a que está na página é a que ninguém testa.
 */

import { eventProgress, formatTime, getJourneyTiming, groupByDay, nextEvent, routeLabel } from './src/journey.js';
import { nextJourney, phaseCopy, planCategories, promptSuggestions } from './src/mock.js';
import { conciergeService } from './src/concierge-service.js';

/* ------------------------------------------------------------------ estado */

const estado = {
  separador: 'home',
  pedido: '',
  proposta: null,
  referencia: null,
  aPreparar: false,
  aEnviar: false,
  carteiraAberta: false,
  /* Relógio da demonstração. `null` é o relógio a sério — que é o que a app
     usa. Os botões lá em baixo põem aqui uma data para mostrar as outras fases,
     e a página diz que o está a fazer. */
  agora: null,
};

/* Um pedido em curso deixa de valer assim que outro começa. Sem isto, uma
   resposta lenta chega depois de o utilizador já ter mudado de ideias e
   escreve por cima da proposta nova — o mesmo contador existe no App.tsx. */
let sequencia = 0;

const relogio = () => (estado.agora ? new Date(estado.agora) : new Date());

const $ = (id) => document.getElementById(id);
const vista = $('vista');
const ecra = $('ecra');
const nav = $('nav');
const avisoEl = $('aviso');

const semMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------- primitivas */

function el(tag, props = {}, filhos = []) {
  const node = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (chave === 'class') node.className = valor;
    else if (chave === 'texto') node.textContent = valor;
    else if (chave === 'onclick') node.addEventListener('click', valor);
    else node.setAttribute(chave, valor === true ? '' : String(valor));
  }
  for (const filho of [].concat(filhos)) {
    if (filho === null || filho === undefined || filho === false) continue;
    node.append(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  }
  return node;
}

/** O mesmo que `el`, mas no espaço de nomes do SVG. `createElement` devolveria
    um elemento HTML com o nome certo e nada desenhava. */
function svg(tag, props = {}, filhos = []) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (chave === 'texto') node.textContent = valor;
    else node.setAttribute(chave, String(valor));
  }
  for (const filho of [].concat(filhos)) if (filho) node.append(filho);
  return node;
}

/** Entrada curta, só opacity e transform, desligada por preferência do sistema. */
function revelar(node, atrasoMs = 0) {
  if (semMovimento()) return node;
  node.animate(
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { delay: atrasoMs, duration: 220, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' },
  );
  return node;
}

function aviso(mensagem) {
  avisoEl.textContent = '';
  if (!mensagem) {
    avisoEl.hidden = true;
    return;
  }
  avisoEl.hidden = false;
  avisoEl.append(
    el('span', { texto: mensagem }),
    el('button', { 'aria-label': 'Fechar aviso', texto: '×', onclick: () => aviso('') }),
  );
}

/* ------------------------------------------------------------------ ecrãs */

function cabecalho(eyebrow, titulo, selo) {
  return el('div', { class: 'cabecalho' }, [
    el('div', {}, [el('p', { class: 'eyebrow', texto: eyebrow }), el('h2', { class: 'titulo-ecra', texto: titulo })]),
    selo
      ? el('span', { class: 'selo', texto: selo })
      : el('div', { class: 'avatar', 'aria-label': 'Perfil de Rodrigo', role: 'img' }, [el('span', { 'aria-hidden': 'true', texto: 'R' })]),
  ]);
}

function seccao(titulo, accao, aoClicar) {
  return el('div', { class: 'seccao' }, [
    el('h3', { texto: titulo }),
    accao ? el('button', { texto: accao + ' →', onclick: aoClicar }) : null,
  ]);
}

function cartaoContexto(titulo, detalhe, marca) {
  return el('div', { class: 'cartao' }, [
    el('div', { class: 'linha' }, [el('h4', { texto: titulo }), el('span', { class: 'marca', texto: marca })]),
    el('p', { class: 'suave', texto: detalhe }),
  ]);
}

function ecraInicio() {
  const timing = getJourneyTiming(nextJourney, relogio());
  const copy = phaseCopy[timing.phase];
  const proximo = nextEvent(nextJourney, relogio());

  return [
    cabecalho(copy.greeting, 'Rodrigo.'),
    el('button', { class: 'heroi', 'aria-label': `Abrir a viagem às ${nextJourney.destination}`, onclick: () => irPara('trips') }, [
      el('span', { class: 'marca-heroi', texto: 'EXEMPLO DE VIAGEM' }),
      el('p', { class: 'eyebrow', texto: copy.heroEyebrow }),
      el('h2', { texto: nextJourney.destination }),
      el('p', { class: 'meta', texto: `${timing.datesLabel} · ${timing.relativeLabel}` }),
    ]),
    el('div', { class: 'cartao-voo' }, [
      el('div', { class: 'linha' }, [
        el('div', {}, [
          el('p', { class: 'rotulo', texto: `Rota ilustrativa · partida ${timing.timeLabel} (hora de Lisboa)` }),
          el('p', { class: 'rota', texto: 'EK091 · LIS → DXB → MLE' }),
        ]),
        el('span', { class: 'pastilha', texto: 'EXEMPLO' }),
      ]),
      el('button', { class: 'accao-inline', onclick: () => irPara('trips') }, [
        'Ver viagem', el('span', { 'aria-hidden': 'true', texto: '→' }),
      ]),
    ]),
    seccao(copy.sectionTitle, 'Ver viagem', () => irPara('trips')),
    el('div', { class: 'pilha' }, [
      proximo
        ? cartaoContexto(proximo.title, `${formatTime(proximo.at)}, hora local · ${proximo.detail}`, 'ITINERÁRIO')
        : cartaoContexto('Itinerário cumprido', 'Não há mais momentos agendados nesta viagem de demonstração.', 'ITINERÁRIO'),
      cartaoContexto(nextJourney.destination, '28° · Céu limpo · exemplo de contexto de destino', 'DESTINO'),
    ]),
    el('button', { class: 'chamada', onclick: () => abrirConcierge(copy.calloutPrompt) }, [
      el('span', {}, [el('strong', { texto: copy.calloutTitle }), el('span', { texto: copy.calloutText })]),
      el('span', { class: 'icone', 'aria-hidden': 'true', texto: '✦' }),
    ]),
  ];
}

const ICONES = { flight: '✈', transfer: '→', stay: '⌂', experience: '✦' };

/**
 * A rota, desenhada, com o jato a andar por ela enquanto se percorre o
 * itinerário.
 *
 * PORQUE E QUE ISTO NÃO CONTRARIA O SISTEMA DE DESIGN
 *
 * O `DESIGN_SYSTEM_V1_1.md` diz, com todas as letras: "Não usar parallax, 3D ou
 * animação contínua para transportar informação necessária", e a pesquisa
 * rejeita "parallax no scroll" e "movimento periférico". Um jato a passar por
 * cima do ecrã, só porque fica bem, seria exactamente isso.
 *
 * Este não é isso. A posição do jato é o progresso pelo itinerário, e os pontos
 * no arco são os cinco momentos reais, colocados pela hora a que acontecem
 * (`eventProgress`) — a perna Lisboa→Dubai ocupa três vezes mais arco do que a
 * espera do check-in, porque demora três vezes mais. É uma barra de progresso
 * que por acaso tem a forma de um voo.
 *
 * A regra que continua a valer: **nada aqui é informação necessária.** As horas,
 * os dias e os títulos estão todos na lista por baixo, em texto. Se isto não
 * desenhar, não se perde nada — e com `prefers-reduced-motion` o jato fica
 * parado no próximo momento da viagem, que ainda diz onde se está.
 *
 * O caminho tem duas curvas e um canto no Dubai. O canto é de propósito: são
 * dois voos, e com `offset-rotate: auto` o nariz levanta na descolagem.
 */
/**
 * O caminho, para o número de paragens que a rota tiver.
 *
 * A primeira versão tinha `'M 18 100 Q 89 22 160 84 Q 231 22 302 100'` escrito
 * à mão — duas curvas, três paragens, Lisboa-Dubai-Malé para sempre. Bastava
 * um voo directo ou uma escala a mais para o desenho deixar de corresponder à
 * rota, sem avisar: o arco continuava a ter duas pernas e a legenda passava a
 * ter outro número. É o mesmo defeito que este projecto passou dois dias a
 * tirar de outros sítios, e ia entrando outra vez pela porta do desenho.
 *
 * Uma perna por par de paragens consecutivas, cada uma um arco quadrático que
 * sobe e volta a descer. As paragens ficam na linha de baixo (y = SOLO) porque
 * é onde os aviões estão quando não estão a voar.
 */
const ROTA_LARGURA = 320;
const ROTA_MARGEM = 18;
const ROTA_SOLO = 100;
const ROTA_TECTO = 22;

export function caminhoDaRota(paragens) {
  const n = Math.max(2, paragens);
  const util = ROTA_LARGURA - ROTA_MARGEM * 2;
  const passo = util / (n - 1);
  const x = (i) => ROTA_MARGEM + passo * i;

  /* Escalas intermédias não descem até ao solo no desenho: ficam a meio
     caminho, que é como se lê uma paragem curta sem sair do aeroporto. */
  const y = (i) => (i === 0 || i === n - 1 ? ROTA_SOLO : ROTA_SOLO - 16);

  let d = `M ${x(0)} ${y(0)}`;
  for (let i = 1; i < n; i++) {
    const cx = (x(i - 1) + x(i)) / 2;
    d += ` Q ${cx} ${ROTA_TECTO} ${x(i)} ${y(i)}`;
  }
  return d;
}

function rotaDeVoo() {
  const paragens = nextJourney.route;
  const progresso = eventProgress(nextJourney);
  const d = caminhoDaRota(paragens.length);

  const caminho = svg('path', { class: 'rota-traco', d, fill: 'none' });

  /* Os pontos dos eventos são colocados com `getPointAtLength`, que precisa do
     caminho já no documento. É por isso que ficam num grupo preenchido depois,
     e não aqui. */
  const pontos = svg('g', { class: 'rota-pontos' });

  /* O `offset-path` tem de ser o MESMO caminho que está desenhado, e por isso
     vem daqui e não do CSS: uma folha de estilo com o caminho lá dentro voltaria
     a fixar três paragens, e a divergência entre o traço e a trajectória do
     jato seria invisível até alguém mudar a rota. */
  const jato = svg('g', { class: 'rota-jato', style: `offset-path: path("${d}")` }, [
    /* Um triângulo alongado com uma cauda. Desenhado a apontar para a direita,
       porque `offset-rotate: auto` roda-o a partir daí. */
    svg('path', { class: 'rota-jato-corpo', d: 'M 9 0 L -6 5 L -3 0 L -6 -5 Z' }),
  ]);

  const desenho = svg('svg', {
    class: 'rota',
    viewBox: '0 0 320 120',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
    focusable: 'false',
  }, [caminho, pontos, jato]);

  /* Etiquetas em texto, fora do SVG: quem usa leitor de ecrã ouve a rota, e
     quem não tem o SVG desenhado continua a lê-la. */
  const etiquetas = el('div', { class: 'rota-paragens' },
    paragens.map((p) => el('span', {}, [
      el('strong', { texto: p.code }),
      el('span', { texto: p.city }),
    ])));

  const bloco = el('div', { class: 'rota-caixa' }, [
    el('p', { class: 'rotulo', texto: routeLabel(nextJourney) }),
    desenho,
    etiquetas,
  ]);

  /* Depois de estar no documento: medir o caminho e pôr um ponto em cada
     momento do itinerário, na fracção que lhe corresponde. */
  queueMicrotask(() => {
    if (!caminho.getTotalLength) return;
    const total = caminho.getTotalLength();
    if (!total) return;

    /* Só os eventos vão para o arco, e vão pela hora a que acontecem.
       A primeira versão punha TAMBÉM as três paragens da rota, espaçadas por
       igual — e isso são dois sistemas de coordenadas no mesmo desenho: pela
       lista de paragens, Malé ficava no fim do arco; pela hora, a chegada a
       Malé é aos 58%, porque ainda há o hidroavião e o spa depois. Dois pontos
       com o mesmo nome em sítios diferentes é pior do que não os ter.
       As paragens ficaram na legenda em texto por baixo, onde ninguém as lê
       como uma posição. */
    for (const { fraction, id } of progresso) {
      const p = caminho.getPointAtLength(total * fraction);
      pontos.append(svg('circle', { class: 'rota-ponto', cx: p.x, cy: p.y, r: 3, 'data-evento': id }));
    }
  });

  return bloco;
}

function ecraViagens() {
  const timing = getJourneyTiming(nextJourney, relogio());
  const dias = groupByDay(nextJourney);
  let posicao = -1;

  const itinerario = dias.map((dia) => el('div', {}, [
    el('div', { class: 'dia' }, [el('span', { texto: dia.label }), el('i', { 'aria-hidden': 'true' })]),
    ...dia.events.map((evento, indice) => {
      posicao += 1;
      /* O atraso pára ao quinto item: linear numa lista longa deixa de ser
         hierarquia e passa a ser espera. Igual ao TimelineReveal da app. */
      return revelar(el('div', { class: 'evento' }, [
        el('div', { class: 'calha', 'aria-hidden': 'true' }, [
          el('div', { class: 'ponto', texto: ICONES[evento.kind] }),
          indice < dia.events.length - 1 ? el('i', {}) : null,
        ]),
        el('div', { class: 'corpo' }, [
          el('p', { class: 'hora', texto: formatTime(evento.at) }),
          el('h4', { texto: evento.title }),
          el('p', { class: 'suave', texto: evento.detail }),
        ]),
      ]), Math.min(posicao, 5) * 34);
    }),
  ]));

  const carteira = estado.carteiraAberta
    ? el('div', { class: 'lista-doc' }, [
        el('div', { class: 'doc-aviso' }, [
          el('strong', { texto: 'CARTEIRA DE DEMONSTRAÇÃO' }),
          el('p', { texto: 'Pré-visualização sem ficheiros pessoais, reserva ou autenticação ativa.' }),
        ]),
        ...['Bilhete de avião', 'Voucher de hotel', 'Transfer privado', 'Seguro de viagem'].map((nome) =>
          el('div', { class: 'doc' }, [
            el('span', { class: 'icone', 'aria-hidden': 'true', texto: '⌁' }),
            el('span', { class: 'nome' }, [nome, el('p', { class: 'suave', texto: 'Exemplo visual — sem ficheiro real' })]),
            el('span', { class: 'demo', texto: 'DEMO' }),
          ])),
      ])
    : el('p', { class: 'suave', texto: 'Demonstração visual: não existem documentos reais nesta app. A versão de produção exigirá autenticação do dispositivo.' });

  return [
    cabecalho('Viagem de demonstração', nextJourney.destination, 'Exemplo'),
    el('div', { class: 'heroi heroi-viagem' }, [
      el('span', { class: 'marca-heroi marca-viagem', texto: 'EXEMPLO NHCS' }),
      el('p', { class: 'eyebrow', texto: timing.datesLabel }),
      el('h2', { texto: 'A sua pausa.' }),
      el('p', { class: 'meta', texto: 'Itinerário, documentos e assistência num só lugar.' }),
    ]),
    rotaDeVoo(),
    seccao('Itinerário', 'Assistência', () => abrirConcierge('Preciso de ajuda com o meu itinerário.')),
    /* A classe não é decorativa: é o `view-timeline` que o jato segue. */
    el('div', { class: 'itinerario' }, itinerario),
    el('div', { class: 'carteira-topo' }, [
      el('div', {}, [
        el('h3', { class: 'titulo-carteira', texto: 'Carteira de viagem' }),
        el('p', { class: 'suave', texto: 'Bilhetes, vouchers e documentos sensíveis.' }),
      ]),
      el('button', {
        class: 'botao-contorno',
        'aria-expanded': String(estado.carteiraAberta),
        texto: estado.carteiraAberta ? 'Ocultar' : 'Ver demonstração',
        onclick: () => { estado.carteiraAberta = !estado.carteiraAberta; desenhar(); },
      }),
    ]),
    carteira,
  ];
}

function ecraConcierge() {
  const proposta = estado.proposta;
  const enviada = proposta && proposta.status === 'requested';
  const ocupado = estado.aPreparar || estado.aEnviar;

  const campo = el('textarea', {
    rows: '1',
    placeholder: 'Ex.: uma praia quente durante 10 dias...',
    'aria-label': 'Pedido para o concierge',
    disabled: ocupado || undefined,
  });
  campo.value = estado.pedido;
  campo.addEventListener('input', () => {
    estado.pedido = campo.value;
    /* Editar o texto invalida a proposta que ele produziu: uma proposta tem de
       corresponder ao pedido que está no ecrã, sempre. Regra do App.tsx. */
    if (estado.proposta && campo.value.trim() !== estado.proposta.requestIntent) {
      sequencia += 1;
      estado.proposta = null;
      estado.referencia = null;
      estado.aPreparar = false;
      desenhar({ manterFoco: true });
    }
  });

  const passo = (numero, texto, activo) =>
    el('div', { class: 'passo' + (activo ? ' activo' : '') }, [
      el('b', { 'aria-hidden': 'true', texto: String(numero) }), el('span', { texto }),
    ]);

  return [
    el('div', { class: 'conc-topo' }, [
      el('span', { class: 'marca-nhcs', texto: 'NHCS' }),
      el('span', { class: 'conc-privado', texto: 'CONCIERGE PRIVADO' }),
    ]),
    el('div', { class: 'orb', 'aria-hidden': 'true' }),
    el('p', { class: 'eyebrow', texto: 'O seu concierge privado' }),
    el('h2', { class: 'conc-titulo' }, ['Diga-me', el('br'), 'o que tem', el('br'), 'em mente.']),
    el('p', { class: 'conc-intro', texto: 'A NHCS organiza intenção, opções e confirmação — sem o transformar num chat genérico.' }),
    el('div', { class: 'fluxo', 'aria-label': 'Fluxo do concierge: intenção, proposta, confirmação.' }, [
      passo(1, 'Intenção', true), el('i', { 'aria-hidden': 'true' }),
      passo(2, 'Proposta', Boolean(proposta)), el('i', { 'aria-hidden': 'true' }),
      passo(3, 'Confirmação', Boolean(enviada)),
    ]),
    el('div', { class: 'caixa-pedido' }, [
      campo,
      el('button', {
        class: 'botao-lima',
        disabled: ocupado || undefined,
        'aria-label': estado.aPreparar ? 'A preparar proposta' : 'Criar proposta',
        onclick: () => prepararProposta(),
      }, [estado.aPreparar ? el('span', { class: 'roda', 'aria-hidden': 'true' }) : 'Criar']),
    ]),
    el('div', { class: 'sugestoes' }, promptSuggestions.map((sugestao) =>
      el('button', { disabled: ocupado || undefined, texto: sugestao, onclick: () => prepararProposta(sugestao) }))),
    estado.aPreparar
      ? el('div', { class: 'a-carregar' }, [
          el('span', { class: 'roda', 'aria-hidden': 'true' }),
          el('div', {}, [
            el('strong', { texto: 'A organizar a sua proposta' }),
            el('span', { texto: 'A NHCS está a estruturar o pedido antes de envolver parceiros.' }),
          ]),
        ])
      : null,
    proposta ? revelar(el('div', { class: 'proposta' }, [
      el('p', { class: 'eyebrow', texto: enviada ? 'PEDIDO ENVIADO' : 'PROPOSTA INICIAL' }),
      el('h3', { texto: proposta.title }),
      el('p', { class: 'resumo', texto: proposta.summary }),
      el('h4', { texto: 'O que entendi' }),
      el('ul', {}, proposta.understood.map((item) => el('li', { texto: item }))),
      el('h4', { texto: 'Próximos passos' }),
      el('ul', {}, proposta.nextSteps.map((item) => el('li', { texto: item }))),
      enviada
        ? el('div', { class: 'recibo' }, [
            el('p', { texto: 'Um especialista confirmará disponibilidade e condições consigo antes de avançar.' }),
            estado.referencia ? el('code', { texto: 'Referência: ' + estado.referencia }) : null,
          ])
        : el('button', { class: 'botao-escalar', disabled: estado.aEnviar || undefined, onclick: () => pedirPessoa() },
            estado.aEnviar
              ? [el('span', { class: 'roda', 'aria-hidden': 'true' }), 'A enviar pedido']
              : ['Pedir proposta à equipa NHCS', el('span', { 'aria-hidden': 'true', texto: '→' })]),
    ])) : null,
  ];
}

function ecraPlanear() {
  return [
    cabecalho('Planear', 'O que podemos tratar por si?'),
    el('p', { class: 'suave', texto: 'Comece por onde preferir, ou entregue o contexto à NHCS para receber uma proposta completa.' }),
    el('div', { class: 'pilha pilha-plano' }, planCategories.map((categoria) =>
      el('button', { class: 'plano', onclick: () => abrirConcierge(categoria.prompt) }, [
        el('span', {}, [el('strong', { texto: categoria.title }), el('p', { class: 'suave', texto: categoria.detail })]),
        el('span', { class: 'seta', 'aria-hidden': 'true', texto: '→' }),
      ]))),
    el('button', { class: 'plano-nhcs', onclick: () => abrirConcierge('Quero que a NHCS planeie a minha próxima viagem.') }, [
      el('strong', { texto: 'Deixe a NHCS tratar do plano' }),
      el('span', { texto: 'Conte-nos a intenção. Nós tratamos das perguntas certas, parceiros e detalhes.' }),
    ]),
  ];
}

function ecraPerfil() {
  const fila = (titulo, detalhe, aoClicar) => {
    const conteudo = [el('span', {}, [el('strong', { texto: titulo }), el('span', { texto: detalhe })])];
    if (!aoClicar) return el('div', { class: 'fila' }, conteudo);
    return el('button', { class: 'fila', onclick: aoClicar }, [...conteudo, el('span', { class: 'seta', 'aria-hidden': 'true', texto: '→' })]);
  };

  return [
    cabecalho('Perfil privado', 'Rodrigo'),
    el('div', { class: 'destaque-perfil' }, [
      el('p', { class: 'rotulo', texto: 'O seu estilo de viagem' }),
      el('h4', { texto: 'Quiet luxury · 5 estrelas · transfers privados' }),
      el('p', { class: 'suave', texto: 'As suas preferências apoiam recomendações sem ter de repetir o contexto a cada pedido.' }),
    ]),
    seccao('Conta e preferências'),
    el('div', { class: 'pilha' }, [
      fila('Informação pessoal', 'Dados de contacto e identidade'),
      fila('Família', 'Viajantes e preferências partilhadas'),
      fila('Preferências de viagem', 'Voos, hotéis, transfers e seguros'),
      fila('Documentos de viagem', 'Acesso protegido na carteira', () => { estado.carteiraAberta = true; irPara('trips'); }),
      fila('Pagamentos', 'Métodos guardados pelo serviço de pagamentos'),
      fila('Privacidade e segurança', 'Sessão, dispositivos e permissões'),
    ]),
    el('div', { class: 'cartao-acess' }, [
      el('p', { class: 'rotulo', texto: 'Acessibilidade' }),
      el('h4', { texto: semMovimento() ? 'Movimento reduzido ativo' : 'Movimento reduzido segue a definição do dispositivo' }),
      el('p', { class: 'suave', texto: 'Informação crítica nunca depende de animação; os controlos mantêm alvos de toque amplos.' }),
    ]),
  ];
}

/* ------------------------------------------------------------------ acções */

async function prepararProposta(candidato) {
  const pedido = (candidato || estado.pedido || '').trim();
  if (!pedido) {
    estado.proposta = null;
    estado.referencia = null;
    desenhar();
    aviso('Descreva o que pretende antes de criar uma proposta.');
    return;
  }

  const minha = ++sequencia;
  estado.pedido = pedido;
  estado.proposta = null;
  estado.referencia = null;
  estado.aPreparar = true;
  aviso('');
  desenhar();

  try {
    const proposta = await conciergeService.prepareProposal(pedido);
    if (minha !== sequencia) return;
    estado.proposta = proposta;
    aviso('Pedido organizado numa proposta inicial.');
  } catch (erro) {
    if (minha !== sequencia) return;
    aviso(erro instanceof Error ? erro.message : 'Não foi possível preparar a proposta.');
  } finally {
    if (minha === sequencia) {
      estado.aPreparar = false;
      desenhar();
    }
  }
}

async function pedirPessoa() {
  if (!estado.proposta) return;
  estado.aEnviar = true;
  desenhar();

  try {
    const recibo = await conciergeService.requestHumanFollowUp({ intent: estado.proposta.requestIntent, proposal: estado.proposta });
    estado.proposta = { ...estado.proposta, status: 'requested' };
    estado.referencia = recibo.id;
    aviso(recibo.message + ' Nenhuma reserva ou cobrança foi feita.');
  } catch (erro) {
    aviso(erro instanceof Error ? erro.message : 'Não foi possível enviar o pedido à equipa NHCS.');
  } finally {
    estado.aEnviar = false;
    desenhar();
  }
}

function irPara(separador) {
  estado.separador = separador;
  aviso('');
  desenhar();
}

function abrirConcierge(pedido) {
  sequencia += 1;
  estado.separador = 'concierge';
  estado.aPreparar = false;
  estado.proposta = null;
  estado.referencia = null;
  aviso('');
  if (pedido) {
    void prepararProposta(pedido);
    return;
  }
  estado.pedido = '';
  desenhar();
}

/* ---------------------------------------------------------------- desenho */

const SEPARADORES = [
  { id: 'home', rotulo: 'Início', icone: '⌂', ecra: ecraInicio },
  { id: 'trips', rotulo: 'Viagens', icone: '◌', ecra: ecraViagens },
  { id: 'concierge', rotulo: 'Concierge', icone: '✦', ecra: ecraConcierge },
  { id: 'plan', rotulo: 'Planear', icone: '+', ecra: ecraPlanear },
  { id: 'profile', rotulo: 'Perfil', icone: '○', ecra: ecraPerfil },
];

function desenharNav() {
  nav.textContent = '';
  for (const separador of SEPARADORES) {
    const activo = separador.id === estado.separador;
    nav.append(el('button', {
      role: 'tab',
      'aria-selected': String(activo),
      'aria-label': separador.rotulo,
      class: separador.id === 'concierge' ? 'concierge' : null,
      onclick: () => (separador.id === 'concierge' ? abrirConcierge() : irPara(separador.id)),
    }, [
      el('span', { class: 'icone', 'aria-hidden': 'true', texto: separador.icone }),
      el('span', { 'aria-hidden': 'true', texto: separador.rotulo }),
    ]));
  }
}

let anterior = null;

function desenhar({ manterFoco = false } = {}) {
  const separador = SEPARADORES.find((s) => s.id === estado.separador);
  const escuro = estado.separador === 'concierge';
  ecra.classList.toggle('escuro', escuro);

  const posicao = vista.scrollTop;
  const focoEraCampo = manterFoco && document.activeElement && document.activeElement.tagName === 'TEXTAREA';
  const cursor = focoEraCampo ? document.activeElement.selectionStart : null;

  vista.textContent = '';
  vista.append(...separador.ecra().filter(Boolean));
  desenharNav();
  if (estado.separador === 'trips') ligarJato();

  if (manterFoco) {
    vista.scrollTop = posicao;
    const campo = vista.querySelector('textarea');
    if (focoEraCampo && campo) {
      campo.focus();
      if (cursor !== null) campo.setSelectionRange(cursor, cursor);
    }
  } else {
    vista.scrollTop = 0;
    /* Transição de ecrã: 180 ms de opacity, 260 ms de deslocação — os mesmos
       valores do ScreenTransition da app. Só quando o separador muda. */
    if (anterior !== estado.separador && !semMovimento()) {
      vista.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' },
      );
    }
  }
  anterior = estado.separador;
}

/* ------------------------------------------------ o jato, quando o CSS não chega
 *
 * O caminho normal é sem JavaScript nenhum: `animation-timeline` liga a animação
 * ao scroll e ela corre fora da thread principal. Chrome, Edge e Safari 26+ têm
 * isso; o Firefox, à data de hoje, ainda o tem atrás de uma flag.
 *
 * Para esses, isto escreve `--voo` a cada frame de scroll. É a mesma animação
 * pelo caminho pior — e só corre onde é preciso, medido com `CSS.supports` e não
 * por adivinhação de browser.
 *
 * Com `prefers-reduced-motion` não corre de todo: o jato vai uma vez para o
 * próximo momento da viagem e fica lá. Parado, continua a dizer onde se está.
 */

const TEM_TIMELINE_NATIVA = typeof CSS !== 'undefined'
  && typeof CSS.supports === 'function'
  && CSS.supports('animation-timeline', 'view()');

let pendenteVoo = false;

function fracaoDaViagemAgora() {
  const agora = relogio().getTime();
  const pontos = eventProgress(nextJourney);
  let ultima = 0;
  for (const [i, evento] of nextJourney.timeline.entries()) {
    if (new Date(evento.at).getTime() <= agora) ultima = pontos[i].fraction;
  }
  return ultima;
}

function ligarJato() {
  const lista = vista.querySelector('.itinerario');
  const alvo = vista.querySelector('.rota-jato');
  if (!lista || !alvo) return;

  if (semMovimento()) {
    alvo.style.setProperty('--voo', String(fracaoDaViagemAgora()));
    return;
  }
  /* `CSS.supports` diz que o browser CONHECE `animation-timeline`. Não diz que
     esta animação ficou ligada a um timeline vivo — e a diferença apanhou-me:
     com o nome a resolver mal, o Chrome dava uma `ViewTimeline` com
     `currentTime` a `null`, a animação ficava presa no primeiro fotograma, e o
     jato ficava parado num sítio perfeitamente plausível. Uma avaria que passa
     numa revisão visual.

     Por isso a pergunta aqui não é "suporta?" mas "está a andar?". A resposta
     só existe depois de um fotograma — antes do primeiro layout o timeline
     ainda não tem tempo — daí o `requestAnimationFrame`. Se ainda assim não
     estiver a andar, entra o caminho em JavaScript, que funciona em qualquer
     lado. Se estiver, não se liga ouvinte nenhum e o scroll fica de graça. */
  requestAnimationFrame(() => {
    if (TEM_TIMELINE_NATIVA && jatoTemTimelineViva(alvo)) return;
    conduzirJatoPorScroll(lista, alvo);
  });
}

function conduzirJatoPorScroll(lista, alvo) {
  /* O ouvinte é registado uma vez e não a cada desenho. `desenhar()` corre em
     cada toque no separador e em cada tecla escrita no concierge; um
     `addEventListener` por desenho acumula centenas de closures presas ao mesmo
     elemento, e o sintoma é a página ficar lenta depois de se usar um bocado —
     que é precisamente o tipo de fuga que ninguém liga a um jato. */
  if (!ouvinteVooLigado) {
    ouvinteVooLigado = true;
    vista.addEventListener('scroll', () => {
      if (pendenteVoo) return;
      pendenteVoo = true;
      requestAnimationFrame(() => {
        pendenteVoo = false;
        const l = vista.querySelector('.itinerario');
        const a = vista.querySelector('.rota-jato');
        if (l && a) medirCom(l, a);
      });
    }, { passive: true });
  }

  medirCom(lista, alvo);
}

let ouvinteVooLigado = false;

/**
 * A animação nativa está mesmo ligada a um timeline que anda?
 *
 * `getAnimations()` devolve a animação mesmo quando o timeline não resolveu; o
 * sinal que distingue os dois casos é `timeline.currentTime`, que fica a `null`
 * enquanto o timeline estiver inactivo. Se nenhuma das animações do jato tiver
 * um tempo, o CSS não está a conduzir nada e o JavaScript tem de conduzir.
 */
function jatoTemTimelineViva(alvo) {
  if (typeof alvo.getAnimations !== 'function') return false;
  return alvo.getAnimations().some((a) => a.timeline && a.timeline.currentTime !== null);
}

/**
 * `--voo`, entre 0 e 1, a partir de onde a lista está no ecrã.
 *
 * 0 quando o topo da lista chega ao fundo do ecrã, 1 quando o fundo da lista
 * chega ao topo — a mesma janela que o `animation-range: entry/exit` do CSS
 * define, para as duas versões coincidirem.
 */
function medirCom(lista, alvo) {
  const caixa = lista.getBoundingClientRect();
  const alturaEcra = vista.clientHeight || 1;
  const percorrido = (alturaEcra - caixa.top) / (alturaEcra + caixa.height);
  alvo.style.setProperty('--voo', String(Math.min(1, Math.max(0, percorrido))));
}

/* ------------------------------------------------------- relógio simulado */

const FASES = [
  { rotulo: 'A preparar', data: null, nota: 'relógio a sério' },
  { rotulo: 'Faltam 2 dias', data: '2026-10-09T09:00:00+01:00' },
  { rotulo: 'Em viagem', data: '2026-10-15T12:00:00+05:00' },
  { rotulo: 'Concluída', data: '2026-10-22T10:00:00+01:00' },
];

const DATA_LEGIVEL = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

function desenharFases() {
  const caixa = $('fases');
  caixa.textContent = '';
  for (const fase of FASES) {
    caixa.append(el('button', {
      texto: fase.rotulo,
      'aria-pressed': String(estado.agora === fase.data),
      onclick: () => { estado.agora = fase.data; desenharFases(); irPara('home'); },
    }));
  }
  const quando = relogio();
  $('agora').textContent = estado.agora
    ? `Relógio simulado: ${DATA_LEGIVEL.format(quando)}`
    : `Hoje: ${DATA_LEGIVEL.format(quando)}`;
}

/* ------------------------------------------------------------------ arranque */

desenharFases();
desenhar();
