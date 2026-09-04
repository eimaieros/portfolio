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

import { formatTime, getJourneyTiming, groupByDay, nextEvent } from './src/journey.js';
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
    seccao('Itinerário', 'Assistência', () => abrirConcierge('Preciso de ajuda com o meu itinerário.')),
    el('div', {}, itinerario),
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
