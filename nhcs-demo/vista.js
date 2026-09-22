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

import { eventProgress, formatDay, formatFullDay, formatTime, localDayKey, getJourneyTiming, groupByDay, nextEvent, routeLabel, saudacaoDoDia } from './src/journey.js';
import { phaseCopy, promptSuggestions } from './src/mock.js';
import { conciergeService } from './src/concierge-service.js';
import { journeyRepository } from './src/journey-repository.js';
import { messageRepository, relativeLabel, unreadCount } from './src/message-repository.js';
import { documentLabel, documentRepository, documentStatus, sortForAttention, walletReadiness } from './src/document-repository.js';
import { notificacoesDaViagem, porEnviar } from './src/notificacoes.js';
import { canSee, createMockClientSessionService, SignInError } from './src/client-session.js';
/* O Draft1 da NHCS, 22 de setembro de 2026. Tudo o que decide vem do
   TypeScript da app, gerado para `src/` — como o resto. */
import { cartoesEmViagem, classificarViagens, lembretesDeHoje, traduzirFrase } from './src/viagens.js';
import {
  AVISO_DE_RESULTADOS, CLASSES, PREFERENCIAS, aeroporto, destinosPorClima, euros, ofertasDeVoo,
  procurarAeroportos, rotuloDeDuracao, rotuloDePassageiros, totalDaOferta, validarPesquisa, verificarDocumentos,
} from './src/pesquisa.js';
import {
  CONTACTOS_DE_EMERGENCIA, ESTADO_DO_VOO_DEMO, FRASES_DEMO, MEIOS_DE_PAGAMENTO_DEMO, NORMAIS_CLIMATICAS,
  PREVISAO_DEMO, REGRAS_DE_ENTRADA, SIMULACAO_EM_VIAGEM, WHATSAPP_NHCS,
} from './src/mock-servicos.js';
import { agruparPorCategoria, DOCUMENTOS_DE_SERVICO_DEMO } from './src/carteira.js';
import { LINGUAS, t } from './src/i18n.js';
import { servicoDeAcesso } from './src/acesso.js';
import { servicoDeReserva } from './src/reserva.js';

/* ------------------------------------------------------------------ estado */

const estado = {
  /* Os quatro botões fixos do Draft1: 'home' | 'search' | 'journeys' | 'chat'. */
  separador: 'home',
  pedido: '',
  proposta: null,
  referencia: null,
  aPreparar: false,
  aEnviar: false,
  carteiraAberta: false,
  /* A viagem deixou de ser importada do mock e passa a ser pedida.
     Ver `journey-repository.ts`: hoje responde o mock, amanhã o backend da
     NHCS. `null` enquanto não chega — e "enquanto não chega" é um estado que
     tem de existir no ecrã, não uma suposição. */
  viagem: null,
  erroViagem: null,
  /* Mensagens da equipa NHCS. A especificação pede-as no Início desde a V1 e
     nunca existiram. Ver `message-repository.ts`. */
  mensagens: [],
  /* A carteira. Eram quatro strings escritas aqui à mão, iguais às quatro que
     estavam escritas à mão no App.tsx — o mesmo facto em dois sítios, que é o
     defeito que este projecto passou a semana a caçar. Agora vem do mesmo
     repositório que a app usa. */
  documentos: [],
  mensagemAberta: null,

  /* A porta. `null` é "ninguém entrou ainda", e é o estado inicial de propósito.
     Até 9 de setembro a demonstração começava por dentro, tal como a app —
     porque se assumia que a TIDE autenticaria o cliente final. Não autentica:
     tem uma credencial só, ao nível do tenant, que abre os dados de toda a
     gente. Ver `src/client-session.js` e
     `_projeto-claude/08c-descoberta-tide-2026-09-09.md`. */
  sessao: null,
  aEntrar: false,
  erroEntrada: null,

  /* Relógio da demonstração. `null` é o relógio a sério — que é o que a app
     usa. Os botões lá em baixo põem aqui uma data para mostrar as outras fases,
     e a página diz que o está a fazer. */
  agora: null,

  /* ---- Draft1 (v0.3.0) -------------------------------------------------- */

  /* "Use native language": a entrada, os quatro botões e o menu. */
  lingua: 'pt',
  /* A porta tem duas portas: entrar e pedir acesso. */
  entradaModo: 'entrar',
  acesso: { aEnviar: false, recibo: null, erro: null },

  /* Todas as viagens que a sessão pode ver, e as três listas do Draft1. */
  todas: [],
  /* 'listas' | 'futuras' | 'passadas' | 'viagem' */
  vistaViagens: 'listas',
  viagemAberta: null,
  /* null (os seis botões) | 'itinerario' | 'documentos' | 'clima' | 'voo' | 'tradutor' | 'emergencia' */
  subViagem: null,

  /* Pesquisa: null é o painel com as três portas do Draft1. */
  modoPesquisa: null,
  categoria: null,
  voo: null,
  clima: { mes: 1, pref: 'calor' },
  traducao: { texto: '', resultado: null },

  /* O menu ≡ do Draft1: dados pessoais, família, pagamentos, legal. */
  menuAberto: false,
  menuSeccao: null,

  /* Faturas que a reserva simulada deixou "por emitir". Entram na carteira. */
  faturasNovas: [],
  /* A viagem cujo itinerário está no ecrã — o jato e a espinha seguem-na. */
  viagemDoJato: null,
};

/* Um pedido em curso deixa de valer assim que outro começa. Sem isto, uma
   resposta lenta chega depois de o utilizador já ter mudado de ideias e
   escreve por cima da proposta nova — o mesmo contador existe no App.tsx. */
let sequencia = 0;

const relogio = () => (estado.agora ? new Date(estado.agora) : new Date());

/* Um serviço só para a página inteira, criado fora de qualquer função: a
   contagem de tentativas falhadas tem de sobreviver aos redesenhos, senão um
   limite de cinco tentativas não é limite nenhum. */
const sessaoService = createMockClientSessionService();

/** Um símbolo por espécie de documento. Decorativo: o texto ao lado diz tudo. */
const ICONES_DOC = { passport: '▣', visa: '◈', ticket: '⌁', voucher: '▤', transfer: '⇄', insurance: '⛨' };

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
    /* Qualquer `onalgumacoisa` que seja função vira listener. Era só `onclick`,
       e o `onsubmit` do formulário de entrada caía no `setAttribute` do fim —
       ficava o texto da função dentro de um atributo e o formulário não fazia
       nada. O teste de fumo apanhou-o à primeira: "a recusa não apareceu". */
    else if (chave.startsWith('on') && typeof valor === 'function') node.addEventListener(chave.slice(2), valor);
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
  /* Duas animações e não uma: a opacidade acaba aos 150 ms e o deslocamento aos
     220. É de propósito — o elemento lê-se como presente enquanto ainda está a
     assentar, e o olho não espera pelo fim para começar a ler. Os números vêm
     de `DURACOES` no `app/src/components/movimento.ts`, e o
     `tools/gerar-demo.mjs --verificar` compara-os. */
  node.animate([{ opacity: 0 }, { opacity: 1 }],
    { delay: atrasoMs, duration: 150, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
  node.animate([{ transform: 'translateY(8px)' }, { transform: 'none' }],
    { delay: atrasoMs, duration: 220, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
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

/**
 * Pede a viagem ao repositório.
 *
 * Corre uma vez no arranque. Se falhar, o ecrã diz que falhou e oferece tentar
 * outra vez — que é mais do que a app fazia, porque até aqui a viagem não podia
 * falhar: estava importada.
 */
async function carregarViagem() {
  estado.erroViagem = null;
  estado.viagem = null;
  estado.mensagens = [];
  estado.documentos = [];
  desenhar();
  try {
    /* Duas leituras: a próxima, que é o que o Início mostra (e o que a app em
       React Native lê), e todas, para as três listas do Draft1. Ambas passam
       pelo `canSee` da sessão — a autorização do que cada cliente vê é da NHCS,
       e a demonstração faz o que o produto tem de fazer. */
    const [viagens, todas] = await Promise.all([journeyRepository.list(), journeyRepository.listAll()]);
    const visivel = (v) => estado.sessao && canSee(estado.sessao, v.id);
    estado.todas = todas.filter(visivel);
    estado.viagem = viagens.find(visivel) || null;
    if (!estado.viagem) estado.erroViagem = 'Não há viagens nesta conta de demonstração.';
    if (estado.viagem) {
      /* Em paralelo, como na app: são duas leituras independentes e encadeá-las
         só somava latências. */
      const [mensagens, documentos] = await Promise.all([
        messageRepository.list(estado.viagem.id),
        documentRepository.list(estado.viagem.id),
      ]);
      estado.mensagens = mensagens;
      estado.documentos = documentos;
    }
  } catch (erro) {
    estado.erroViagem = erro instanceof Error ? erro.message : 'Não foi possível carregar a viagem.';
  }
  desenhar();
}

/** Placa de carregamento ou de erro, quando ainda não há viagem para desenhar. */
function semViagem() {
  if (estado.erroViagem) {
    return [el('div', { class: 'cartao aviso-carregar' }, [
      el('h3', { texto: 'Não consegui carregar a viagem' }),
      el('p', { class: 'suave', texto: estado.erroViagem }),
      el('button', { class: 'botao-contorno', texto: 'Tentar outra vez', onclick: () => void carregarViagem() }),
    ])];
  }
  return [el('div', { class: 'cartao aviso-carregar' }, [
    el('span', { class: 'roda roda-escura', 'aria-hidden': 'true' }),
    el('p', { class: 'suave', texto: 'A carregar a sua viagem…' }),
  ])];
}

/* ------------------------------------------------------------------ ecrãs */

function cabecalho(eyebrow, titulo, selo) {
  return el('div', { class: 'cabecalho' }, [
    el('div', {}, [el('p', { class: 'eyebrow', texto: eyebrow }), el('h2', { class: 'titulo-ecra', texto: titulo })]),
    /* O ≡ do Draft1 está em todos os ecrãs, no canto — e abre os dados
       pessoais, a família, os pagamentos e a informação legal. Substitui o
       avatar, que era decorativo e não abria nada. */
    selo
      ? el('span', { class: 'selo', texto: selo })
      : el('button', { class: 'menu-botao', 'aria-label': 'Abrir menu', onclick: abrirMenu }, [el('span', { 'aria-hidden': 'true', texto: '≡' })]),
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
  if (!estado.viagem) return [cabecalho('Bom dia', 'Rodrigo.'), ...semViagem()];
  const timing = getJourneyTiming(estado.viagem, relogio());
  const copy = phaseCopy[timing.phase];
  const proximo = nextEvent(estado.viagem, relogio());

  return [
    /* `null` quer dizer "pela hora" — e a hora é a do relógio da demonstração,
       que o visitante muda nos botões de fase. Ver `saudacaoDoDia`. */
    cabecalho(copy.greeting ?? saudacaoDoDia(relogio()), 'Rodrigo.'),
    el('button', { class: 'heroi', 'aria-label': `Abrir a viagem às ${estado.viagem.destination}`, onclick: () => abrirViagem(estado.viagem.id) }, [
      el('span', { class: 'marca-heroi', texto: 'EXEMPLO DE VIAGEM' }),
      el('p', { class: 'eyebrow', texto: copy.heroEyebrow }),
      el('h3', { texto: estado.viagem.destination }),
      el('p', { class: 'meta', texto: `${timing.datesLabel} · ${timing.relativeLabel}` }),
    ]),
    el('div', { class: 'cartao-voo' }, [
      el('div', { class: 'linha' }, [
        el('div', {}, [
          el('p', { class: 'rotulo', texto: `Rota ilustrativa · partida ${timing.timeLabel} (hora de Lisboa)` }),
          el('p', { class: 'rota-texto', texto: routeLabel(estado.viagem) }),
        ]),
        el('span', { class: 'pastilha', texto: 'EXEMPLO' }),
      ]),
      el('button', { class: 'accao-inline', onclick: () => abrirViagem(estado.viagem.id, 'itinerario') }, [
        'Ver viagem', el('span', { 'aria-hidden': 'true', texto: '→' }),
      ]),
    ]),
    ...alertaDaCarteira(),
    ...emViagemNoInicio(),
    seccao(copy.sectionTitle, 'Ver viagem', () => abrirViagem(estado.viagem.id, 'itinerario')),
    el('div', { class: 'pilha' }, [
      proximo
        ? cartaoContexto(proximo.title, `${formatTime(proximo.at)}, hora local · ${proximo.detail}`, 'ITINERÁRIO')
        : cartaoContexto('Itinerário cumprido', 'Não há mais momentos agendados nesta viagem de demonstração.', 'ITINERÁRIO'),
      cartaoContexto(estado.viagem.destination, '28° · Céu limpo · exemplo de contexto de destino', 'DESTINO'),
    ]),
    ...mensagensDaNHCS(),
    convitePlanear(),
    el('button', { class: 'chamada', onclick: () => abrirConcierge(copy.calloutPrompt) }, [
      el('span', {}, [el('strong', { texto: copy.calloutTitle }), el('span', { texto: copy.calloutText })]),
      el('span', { class: 'icone', 'aria-hidden': 'true', texto: '✦' }),
    ]),
  ];
}

/**
 * O aviso da carteira, no Início.
 *
 * Só existe quando há alguma coisa a dizer. A regra que decide isso é a
 * `walletReadiness`, que vive no repositório e é testada lá; aqui só se
 * desenha. Um cartão permanente a dizer "0 documentos por tratar" é ruído, e
 * ruído treina o cliente a ignorar o sítio onde um dia haverá um problema.
 */
function alertaDaCarteira() {
  if (!estado.viagem || !estado.documentos.length) return [];
  const estadoCarteira = walletReadiness(estado.documentos, estado.viagem);
  if (!estadoCarteira.headline) return [];

  const grave = estadoCarteira.needsAction > 0;
  return [el('button', {
    class: grave ? 'alerta-carteira' : 'alerta-carteira suave',
    'aria-label': `${estadoCarteira.headline}. Abrir carteira.`,
    onclick: () => abrirViagem(estado.viagem.id, 'itinerario', { carteira: true }),
  }, [
    el('span', { class: 'icone', 'aria-hidden': 'true', texto: grave ? '!' : '·' }),
    el('span', { class: 'texto' }, [
      el('strong', { texto: estadoCarteira.headline }),
      el('span', { texto: `Carteira de viagem · ${estadoCarteira.total} no total` }),
    ]),
    el('span', { class: 'seta', 'aria-hidden': 'true', texto: '→' }),
  ])];
}

/**
 * As mensagens da equipa NHCS, no Início.
 *
 * A ordem não é por data: quem pede acção vai à frente, depois as por ler,
 * depois as lidas — a regra vive em `sortForReading`, no repositório, e é
 * testada lá. Aqui só se desenha.
 *
 * Tocar abre o corpo e marca como lida. Marcar é uma escrita e podia falhar,
 * por isso a lista é substituída pela que o repositório devolve, e não
 * corrigida à mão no ecrã — assim o que se vê é sempre o que o servidor diz.
 */
function mensagensDaNHCS() {
  if (!estado.mensagens.length) return [];
  const porLer = unreadCount(estado.mensagens);
  const agora = relogio();

  return [
    el('div', { class: 'seccao' }, [
      el('h3', { texto: 'Mensagens' }),
      porLer ? el('span', { class: 'contador', 'aria-label': `${porLer} por ler`, texto: String(porLer) }) : null,
    ]),
    el('div', { class: 'pilha' }, estado.mensagens.slice(0, 3).map((m) => {
      const aberta = estado.mensagemAberta === m.id;
      return el('button', {
        class: 'mensagem' + (m.read ? '' : ' por-ler') + (m.needsReply && !m.read ? ' pede-accao' : '') + (aberta ? ' aberta' : ''),
        'aria-expanded': String(aberta),
        onclick: () => void abrirMensagem(m.id),
      }, [
        el('div', { class: 'linha' }, [
          el('span', { class: 'quem', texto: m.from }),
          el('span', { class: 'quando', texto: relativeLabel(m.at, agora) }),
        ]),
        el('p', { class: 'assunto', texto: m.subject }),
        m.needsReply && !m.read ? el('span', { class: 'etiqueta-accao', texto: 'PRECISA DE RESPOSTA' }) : null,
        aberta ? el('p', { class: 'corpo-mensagem', texto: m.body }) : null,
      ]);
    })),
  ];
}

async function abrirMensagem(id) {
  estado.mensagemAberta = estado.mensagemAberta === id ? null : id;
  desenhar();
  if (!estado.viagem) return;
  try {
    estado.mensagens = await messageRepository.markRead(estado.viagem.id, id);
  } catch (erro) {
    aviso(erro instanceof Error ? erro.message : 'Não foi possível marcar a mensagem como lida.');
  }
  desenhar();
}

const ICONES = { flight: '✈', transfer: '→', stay: '⌂', experience: '✦' };

/**
 * A rota, desenhada, com o jato a andar por ela enquanto se percorre o
 * itinerário.
 *
 * PORQUE E QUE ISTO NÃO CONTRARIA O SISTEMA DE DESIGN
 *
 * O `_projeto-claude/03-sistema-de-design.md` diz, com todas as letras: "Não usar parallax, 3D ou
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

function rotaDeVoo(viagem) {
  const paragens = viagem.route;
  const progresso = eventProgress(viagem);
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
    /* `rota-mapa` e nao `rota`: `.rota` ja era a classe do texto da rota no
       cartao de voo do Inicio, e as duas regras de CSS aplicavam-se uma a
       outra — o texto ganhava `width:100%` e `display:block` de um SVG, o SVG
       ganhava `font-weight:800` de um paragrafo. Apanhado a reler o ficheiro,
       nao a ve-lo. */
    class: 'rota-mapa',
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
    el('p', { class: 'rotulo', texto: routeLabel(viagem) }),
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

function ecraItinerario(viagem, tipo) {
  /* O jato e a espinha medem-se a partir da viagem que está no ecrã, que já não
     é sempre a próxima. */
  estado.viagemDoJato = viagem;
  const timing = getJourneyTiming(viagem, relogio());
  const dias = groupByDay(viagem);
  /* A carteira de embarque (passaportes, seguro) é da próxima viagem: é a que
     o repositório de documentos carregou. */
  const temCarteira = estado.viagem && viagem.id === estado.viagem.id;
  let posicao = -1;

  const itinerario = dias.map((dia) => el('div', {}, [
    el('div', { class: 'dia' }, [el('span', { texto: dia.label }), el('i', { 'aria-hidden': 'true' })]),
    ...dia.events.map((evento, indice) => {
      posicao += 1;
      /* O atraso pára ao quinto item: linear numa lista longa deixa de ser
         hierarquia e passa a ser espera. Igual ao `Revelar` da app. */
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

  /* A carteira entra como tudo o resto entra nesta app. Era o único bloco que
     aparecia de repente — e é o que aparece por acção directa da pessoa, que é
     onde a revelação mais diz: liga o botão que se carregou ao que apareceu.
     Em React Native é o mesmo `<Revelar chave="carteira">`. */
  const carteira = !temCarteira ? null : estado.carteiraAberta
    ? revelar(el('div', { class: 'lista-doc' }, [
        el('div', { class: 'doc-aviso' }, [
          el('strong', { texto: 'CARTEIRA DE DEMONSTRAÇÃO' }),
          el('p', { texto: 'Pré-visualização sem ficheiros pessoais, reserva ou autenticação ativa.' }),
        ]),
        ...sortForAttention(estado.documentos, viagem).map((doc) => {
          const st = documentStatus(doc, viagem);
          const grave = st === 'missing' || st === 'expired' || st === 'insufficient';
          return el('div', { class: grave ? 'doc doc-accao' : 'doc' }, [
            el('span', { class: 'icone', 'aria-hidden': 'true', texto: ICONES_DOC[doc.kind] || '⌁' }),
            el('span', { class: 'nome' }, [
              `${doc.title} · ${doc.holder}`,
              el('p', { class: grave ? 'estado-doc grave' : 'estado-doc', texto: documentLabel(doc, viagem) }),
              doc.expiresAt ? el('p', { class: 'suave', texto: `Válido até ${formatFullDay(doc.expiresAt)}` }) : null,
            ].filter(Boolean)),
            el('span', { class: grave ? 'demo demo-accao' : 'demo', texto: grave ? 'AÇÃO' : 'DEMO' }),
          ]);
        }),
        /* A proveniência do requisito, à vista. Um número sobre fronteiras sem
           origem é um palpite com ar de facto. */
        el('div', { class: 'nota-carteira' }, [
          el('strong', { texto: `Requisito de entrada usado nesta conta: ${viagem.entryRequirements.passportValidityDaysAfterReturn} dias de validade depois do regresso` }),
          el('p', { texto: viagem.entryRequirements.source }),
        ]),
      ]))
    : el('p', { class: 'suave', texto: 'Demonstração visual: não existem documentos reais nesta app. A versão de produção exigirá autenticação do dispositivo.' });

  /* Os botões do Draft1 por baixo do itinerário: "My Concierge" e "Add WOW",
     e o "Edit" para acrescentar, alterar ou cancelar. Seguem todos pelo
     concierge, porque qualquer mudança a uma reserva passa por uma pessoa da
     NHCS — é a regra do projecto, e a TIDE não tem outra porta para o cliente. */
  const accoes = tipo === 'passada' ? null : el('div', { class: 'accoes-viagem' }, [
    el('button', { class: 'botao-contorno', onclick: () => abrirConcierge(`Preciso de ajuda com a minha viagem a ${viagem.destination}.`) }, 'O meu concierge'),
    el('button', { class: 'botao-wow', onclick: () => abrirConcierge(`Quero acrescentar um momento WOW à minha viagem a ${viagem.destination}.`) }, 'Adicionar WOW'),
    el('button', { class: 'botao-contorno', onclick: () => abrirConcierge(`Quero acrescentar, alterar ou cancelar um serviço da minha viagem a ${viagem.destination}.`) }, 'Acrescentar, alterar ou cancelar'),
  ]);

  return [
    cabecalho('O meu itinerário', viagem.destination, 'Exemplo'),
    el('div', { class: 'heroi heroi-viagem' }, [
      el('span', { class: 'marca-heroi marca-viagem', texto: 'EXEMPLO NHCS' }),
      el('p', { class: 'eyebrow', texto: timing.datesLabel }),
      el('h3', { texto: 'A sua pausa.' }),
      el('p', { class: 'meta', texto: 'Itinerário, documentos e assistência num só lugar.' }),
    ]),
    rotaDeVoo(viagem),
    seccao('Itinerário', 'Assistência', () => abrirConcierge('Preciso de ajuda com o meu itinerário.')),
    /* A classe não é decorativa: é o `view-timeline` que o jato segue. */
    el('div', { class: 'itinerario' }, itinerario),
    accoes,
    !temCarteira ? null : el('div', { class: 'carteira-topo' }, [
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
    /* O concierge passou a ser uma das três portas da Pesquisa, como no Draft1. */
    voltar('Pesquisa', () => { sequencia += 1; estado.modoPesquisa = null; estado.aPreparar = false; desenhar(); }),
    el('div', { class: 'conc-topo' }, [
      el('span', { class: 'marca-nhcs', texto: 'NHCS' }),
      el('span', { class: 'conc-privado', texto: 'CONCIERGE PRIVADO' }),
    ]),
    /* Três estados, e o movimento diz qual é. Em repouso respira devagar; a
       pensar acelera e aperta; quando a proposta chega, abre uma vez e assenta.
       É a assinatura do produto: o único elemento do ecrã que não é texto nem
       fotografia, e por isso é o que tem de trabalhar mais. */
    el('div', { class: 'orb orb-' + (estado.aPreparar || estado.aEnviar ? 'pensa' : proposta ? 'respondeu' : 'repouso'), 'aria-hidden': 'true' }),
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

/**
 * O que a NHCS enviaria, e porquê.
 *
 * A simulação de notificação local era o último critério de saída da Fase 2 por
 * cumprir. Não é o envio — é a política, e as regras estão em
 * `src/notificacoes.js`, gerado do TypeScript da app e testado lá.
 *
 * As horas vêm com o fuso do sítio onde o cliente vai estar: a véspera em
 * Lisboa, as boas-vindas em Malé. É a mesma regra do itinerário, e a razão pela
 * qual nada aqui passa pelo `Intl`.
 */
function politicaDeNotificacoes() {
  if (!estado.viagem) return null;
  const proximas = porEnviar(
    notificacoesDaViagem(estado.viagem, estado.documentos, estado.mensagens),
    relogio(),
  );

  return el('div', { class: 'cartao-notif' }, [
    el('p', { class: 'rotulo', texto: 'Notificações' }),
    el('h3', { texto: 'O que lhe vamos enviar' }),
    el('p', { class: 'notif-nota', texto: 'Simulação: nesta demonstração não é enviada nenhuma. As horas são as do sítio onde vai estar — a véspera em Lisboa, as boas-vindas em Malé.' }),
    ...(proximas.length === 0
      ? [el('p', { class: 'suave', texto: 'Nada por enviar. Ou está tudo tratado, ou a viagem já passou.' })]
      : proximas.map((n) => el('div', { class: 'notif' }, [
          el('p', { class: 'notif-quando', texto: `${formatDay(n.at)} · ${formatTime(n.at)}` }),
          el('h4', { texto: n.titulo }),
          el('p', { class: 'notif-corpo', texto: n.corpo }),
          el('p', { class: 'notif-razao', texto: `Porquê: ${n.razao}` }),
        ]))),
  ]);
}

/* ============================================================ Draft1 (v0.3.0)
 *
 * O Draft1 da NHCS (22 de setembro de 2026) redesenha a navegação:
 * quatro botões fixos — Home, Search, Journeys, Chat — e um menu ≡ no topo. Os
 * ecrãs abaixo são essa navegação. Como o resto deste ficheiro, **não decidem
 * nada**: as regras vêm de `src/pesquisa.js`, `src/viagens.js`,
 * `src/carteira.js`, `src/acesso.js` e `src/reserva.js`, que são TypeScript da
 * app com testes.
 * ------------------------------------------------------------------------- */

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const seta = () => el('span', { class: 'seta', 'aria-hidden': 'true', texto: '→' });
const roda = () => el('span', { class: 'roda', 'aria-hidden': 'true' });
const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MARCA_CARTAO = { motorista: 'TRANSFER', bagagem: 'BAGAGEM', clima: 'CLIMA' };

function voltar(rotulo, aoClicar) {
  return el('button', { class: 'voltar', onclick: aoClicar }, [el('span', { 'aria-hidden': 'true', texto: '←' }), rotulo]);
}

function fila(titulo, detalhe, aoClicar) {
  const conteudo = [el('span', {}, [el('strong', { texto: titulo }), detalhe ? el('span', { texto: detalhe }) : null])];
  if (!aoClicar) return el('div', { class: 'fila' }, conteudo);
  return el('button', { class: 'fila', onclick: aoClicar }, [...conteudo, seta()]);
}

function porta(titulo, detalhe, aoClicar) {
  return el('button', { class: 'plano', onclick: aoClicar }, [
    el('span', {}, [el('strong', { texto: titulo }), el('p', { class: 'suave', texto: detalhe })]),
    seta(),
  ]);
}

const viagemPorId = (id) => estado.todas.find((v) => v.id === id) || null;
const viagensClassificadas = () => classificarViagens(estado.todas, relogio());

function abrirViagem(id, sub = null, { carteira = false } = {}) {
  estado.separador = 'journeys';
  estado.menuAberto = false;
  estado.vistaViagens = 'viagem';
  estado.viagemAberta = id;
  estado.subViagem = sub;
  if (carteira) estado.carteiraAberta = true;
  aviso('');
  desenhar();
}

/* ---------------------------------------------------------------- Início */

/** Motorista, bagagem e clima — os cartões "em viagem" do Draft1. */
function emViagemNoInicio() {
  const agora = relogio();
  const cartoes = cartoesEmViagem(estado.viagem, agora, SIMULACAO_EM_VIAGEM);
  const emViagem = getJourneyTiming(estado.viagem, agora).phase === 'travelling';
  const hoje = emViagem ? lembretesDeHoje(estado.viagem, agora) : [];
  if (!cartoes.length && !hoje.length) return [];
  return [
    seccao('Agora'),
    el('div', { class: 'pilha' }, [
      ...cartoes.map((c) => cartaoContexto(c.titulo, c.detalhe, MARCA_CARTAO[c.tipo])),
      hoje.length
        ? el('div', { class: 'cartao' }, [
            el('div', { class: 'linha' }, [el('h4', { texto: 'Hoje' }), el('span', { class: 'marca', texto: 'LEMBRETES' })]),
            el('ul', { class: 'lembretes' }, hoje.map((e) => el('li', {}, [el('strong', { texto: formatTime(e.at) }), ` ${e.title}`]))),
          ])
        : null,
    ]),
  ];
}

/** "Vamos começar a planear a sua próxima viagem?" — o Draft1, fora de viagem. */
function convitePlanear() {
  if (estado.viagem && getJourneyTiming(estado.viagem, relogio()).phase === 'travelling') return null;
  return el('button', { class: 'plano-nhcs', onclick: () => irPara('search') }, [
    el('strong', { texto: 'Vamos começar a planear a sua próxima viagem?' }),
    el('span', { texto: 'Concierge, clima ou pesquisa manual — três portas para o mesmo sítio.' }),
  ]);
}

/* -------------------------------------------------------------- Pesquisa */

function ecraPesquisa() {
  if (estado.modoPesquisa === 'concierge') return ecraConcierge();
  if (estado.modoPesquisa === 'clima') return ecraPorClima();
  if (estado.modoPesquisa === 'manual') return estado.categoria === 'voos' ? ecraVoos() : ecraCategorias();
  return [
    cabecalho('Pesquisa', 'Por onde quer começar?'),
    el('div', { class: 'pilha pilha-plano' }, [
      porta('Concierge IA', 'Diga o que quer em linguagem normal. Recebe uma proposta estruturada, e uma pessoa da NHCS confirma.', () => abrirConcierge()),
      porta('Por clima', 'Escolha o mês e o tempo que quer encontrar. Sugerimos destinos.', () => {
        estado.modoPesquisa = 'clima';
        estado.clima.mes = relogio().getMonth() + 1;
        desenhar();
      }),
      porta('Pesquisa manual', 'Voos, transfers, hotéis, atividades, restaurantes e serviços de concierge.', () => {
        estado.modoPesquisa = 'manual';
        estado.categoria = null;
        desenhar();
      }),
    ]),
  ];
}

const CATEGORIAS_PESQUISA = [
  { id: 'voos', titulo: 'Voos', detalhe: 'Pesquisa completa, com verificação de documentos no destino e nas escalas.' },
  { id: 'transfers', titulo: 'Transfers com meet & greet', pedido: 'Preciso de um transfer com meet & greet.' },
  { id: 'hoteis', titulo: 'Hotéis', pedido: 'Quero reservar um hotel.' },
  { id: 'atividades', titulo: 'Atividades', pedido: 'Quero reservar uma atividade.' },
  { id: 'restaurantes', titulo: 'Restaurantes', pedido: 'Quero reservar um restaurante.' },
  { id: 'concierge', titulo: 'Serviços de concierge', pedido: 'Preciso de um serviço de concierge.' },
];

function ecraCategorias() {
  return [
    voltar('Pesquisa', () => { estado.modoPesquisa = null; desenhar(); }),
    cabecalho('Pesquisa manual', 'O que procura?'),
    el('p', { class: 'suave', texto: 'Nesta versão a pesquisa de voos está completa. As outras cinco categorias seguem pelo concierge, que organiza o pedido para a equipa NHCS.' }),
    el('div', { class: 'pilha pilha-plano' }, CATEGORIAS_PESQUISA.map((c) => porta(c.titulo, c.detalhe ?? 'Pelo concierge, nesta versão.', () => {
      if (c.id !== 'voos') { abrirConcierge(c.pedido); return; }
      estado.categoria = 'voos';
      estado.voo ??= novaPesquisa();
      desenhar();
    }))),
  ];
}

function ecraPorClima() {
  const c = estado.clima;
  const resultados = destinosPorClima(c.mes, c.pref, NORMAIS_CLIMATICAS);
  const mes = el('select', { id: 'campo-mes' }, MESES_PT.map((nome, i) =>
    el('option', { value: String(i + 1), selected: i + 1 === c.mes || null, texto: nome })));
  mes.addEventListener('change', () => { c.mes = Number(mes.value); desenhar(); });
  return [
    voltar('Pesquisa', () => { estado.modoPesquisa = null; desenhar(); }),
    cabecalho('Pesquisa por clima', 'Que tempo procura?'),
    el('div', { class: 'campo' }, [el('label', { for: 'campo-mes', texto: 'Mês da viagem' }), mes]),
    el('div', { class: 'segmentos', role: 'group', 'aria-label': 'Tempo que procura' }, PREFERENCIAS.map((p) =>
      el('button', { class: 'segmento', 'aria-pressed': String(c.pref === p.id), texto: p.rotulo, onclick: () => { c.pref = p.id; desenhar(); } }))),
    seccao('Sugestões'),
    el('div', { class: 'pilha' }, resultados.map((r) => porta(
      `${r.cidade} · ${r.maxima} °C`,
      'Máxima média do mês · planear com o concierge',
      () => abrirConcierge(`Quero ir a ${r.cidade} em ${MESES_PT[c.mes - 1]}.`),
    ))),
    el('p', { class: 'aviso-ilustrativo', texto: 'Normais climáticas aproximadas, de demonstração. Em produção, clima histórico da OpenWeather, como o Draft1 prevê.' }),
  ];
}

/* ------------------------------------------------------ Pesquisa de voos */

function novaPesquisa() {
  return {
    fase: 'form',
    de: 'LIS', para: 'MIA', textoDe: 'LIS — Lisboa', textoPara: 'MIA — Miami',
    data: '2026-10-20', regresso: '2026-10-27',
    passageiros: { adultos: 2, criancas: 0, bebes: 0 },
    classe: 'executiva', escalasMaximas: 1, malas: 1,
    sugestoes: { campo: null, lista: [] },
    aProcurar: false, ofertas: [], escolhida: null,
    meio: MEIOS_DE_PAGAMENTO_DEMO[0].id, aConfirmar: false, recibo: null,
    erro: null, docs: null,
  };
}

function pesquisaDoEstado() {
  const v = estado.voo;
  return { de: v.de, para: v.para, data: v.data, passageiros: v.passageiros, classe: v.classe, escalasMaximas: v.escalasMaximas, malas: v.malas };
}

function hojeNaDemo() {
  const d = relogio();
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** O passaporte do titular, se já foi entregue. Vem da carteira de embarque. */
function passaporteDoCliente() {
  const p = estado.documentos.find((d) => d.kind === 'passport' && d.provided && d.expiresAt);
  return p ? p.expiresAt : undefined;
}

function verificacaoDoVoo(escalas) {
  const v = estado.voo;
  const destino = aeroporto(v.para);
  const dia = v.regresso || v.data;
  return verificarDocumentos({
    destino: v.para,
    escalas,
    regresso: `${dia}T12:00:00${destino ? destino.utcOffset : '+00:00'}`,
    passaporteValidoAte: passaporteDoCliente(),
    regras: REGRAS_DE_ENTRADA,
  });
}

const TITULO_DOCS = {
  ok: 'Documentos em ordem',
  atencao: 'Há passos antes de embarcar',
  impeditivo: 'Há um impedimento',
  desconhecido: 'Sem regra para verificar',
};

function blocoDocumentos(ver, nota) {
  return el('div', { class: `docs-verif docs-${ver.estado}` }, [
    el('p', { class: 'rotulo', texto: 'Documentos de viagem · verificação de demonstração' }),
    el('h3', { texto: TITULO_DOCS[ver.estado] }),
    el('ul', {}, ver.itens.map((i) => el('li', {}, [
      el('strong', { texto: `${i.papel === 'escala' ? 'Escala' : 'Destino'} · ${i.pais}: ` }), i.texto,
    ]))),
    el('p', { class: 'suave', texto: nota ?? 'Tabela de demonstração, não é o Timatic. Cada regra tem de vir de fonte oficial, com data, antes de um cliente a ver.' }),
  ]);
}

function campoAeroporto(qual, rotulo) {
  const v = estado.voo;
  const id = `campo-${qual}`;
  const input = el('input', {
    id, type: 'text', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'Cidade, aeroporto ou código IATA',
    value: qual === 'de' ? v.textoDe : v.textoPara,
  });
  input.addEventListener('input', () => {
    if (qual === 'de') { v.textoDe = input.value; v.de = ''; } else { v.textoPara = input.value; v.para = ''; }
    v.sugestoes = { campo: qual, lista: procurarAeroportos(input.value) };
    v.docs = null;
    desenhar({ manterFoco: true });
  });
  const lista = v.sugestoes.campo === qual && v.sugestoes.lista.length
    ? el('div', { class: 'sugestoes-aeroporto', role: 'listbox', 'aria-label': rotulo }, v.sugestoes.lista.map((a) =>
        el('button', {
          class: 'sugestao-aeroporto', role: 'option',
          onclick: () => {
            if (qual === 'de') { v.de = a.code; v.textoDe = `${a.code} — ${a.city}`; } else { v.para = a.code; v.textoPara = `${a.code} — ${a.city}`; }
            v.sugestoes = { campo: null, lista: [] };
            desenhar();
          },
        }, [el('strong', { texto: a.code }), ` ${a.city}, ${a.country}`])))
    : null;
  return el('div', { class: 'campo' }, [el('label', { for: id, texto: rotulo }), input, lista]);
}

function campoData(id, rotulo, valor, aoMudar) {
  const input = el('input', { id: `campo-${id}`, type: 'date', value: valor });
  input.addEventListener('change', () => { aoMudar(input.value); estado.voo.docs = null; desenhar(); });
  return el('div', { class: 'campo' }, [el('label', { for: `campo-${id}`, texto: rotulo }), input]);
}

function quantidade(rotulo, valor, aoMudar, minimo = 0) {
  return el('div', { class: 'quantidade' }, [
    el('span', { texto: rotulo }),
    el('div', { class: 'quantidade-botoes' }, [
      el('button', { class: 'quantidade-botao', 'aria-label': `${rotulo}: menos um`, disabled: valor <= minimo || null, texto: '−', onclick: () => aoMudar(valor - 1) }),
      el('span', { class: 'quantidade-valor', 'aria-live': 'polite', texto: String(valor) }),
      el('button', { class: 'quantidade-botao', 'aria-label': `${rotulo}: mais um`, texto: '+', onclick: () => aoMudar(valor + 1) }),
    ]),
  ]);
}

function ecraVoos() {
  const v = estado.voo;
  if (v.fase === 'resultados') return [voltar('Alterar pesquisa', () => { v.fase = 'form'; desenhar(); }), ...vooResultados()];
  if (v.fase === 'resumo') return [voltar('Resultados', () => { v.fase = 'resultados'; desenhar(); }), ...vooResumo()];
  if (v.fase === 'pagamento') return [voltar('A sua reserva', () => { v.fase = 'resumo'; desenhar(); }), ...vooPagamento()];
  if (v.fase === 'recibo') return vooRecibo();
  return [voltar('Categorias', () => { estado.categoria = null; desenhar(); }), ...vooFormulario()];
}

function vooFormulario() {
  const v = estado.voo;
  const mudar = (fn) => (n) => { fn(n); v.docs = null; desenhar(); };
  const classe = el('select', { id: 'campo-classe' }, CLASSES.map((c) =>
    el('option', { value: c.id, selected: c.id === v.classe || null, texto: c.rotulo })));
  classe.addEventListener('change', () => { v.classe = classe.value; desenhar(); });

  return [
    cabecalho('Pesquisa manual · Voos', 'Para onde vai?'),
    el('div', { class: 'form-voo' }, [
      campoAeroporto('de', 'De onde parte?'),
      campoAeroporto('para', 'Para onde vai?'),
      el('div', { class: 'duas-colunas' }, [
        campoData('data', 'Partida', v.data, (x) => { v.data = x; }),
        campoData('regresso', 'Regresso (opcional)', v.regresso, (x) => { v.regresso = x; }),
      ]),
      el('p', { class: 'rotulo', texto: 'Passageiros' }),
      quantidade('Adultos', v.passageiros.adultos, mudar((n) => { v.passageiros.adultos = n; }), 1),
      quantidade('Crianças', v.passageiros.criancas, mudar((n) => { v.passageiros.criancas = n; })),
      quantidade('Bebés', v.passageiros.bebes, mudar((n) => { v.passageiros.bebes = n; })),
      el('div', { class: 'campo' }, [el('label', { for: 'campo-classe', texto: 'Classe' }), classe]),
      el('div', { class: 'segmentos', role: 'group', 'aria-label': 'Escalas' }, [
        el('button', { class: 'segmento', 'aria-pressed': String(v.escalasMaximas === 0), texto: 'Só diretos', onclick: () => { v.escalasMaximas = 0; desenhar(); } }),
        el('button', { class: 'segmento', 'aria-pressed': String(v.escalasMaximas === 1), texto: 'Até 1 escala', onclick: () => { v.escalasMaximas = 1; desenhar(); } }),
      ]),
      quantidade('Malas de porão por pessoa', v.malas, mudar((n) => { v.malas = Math.min(3, n); })),
      el('button', {
        class: 'botao-docs',
        onclick: () => {
          if (!aeroporto(v.para)) { aviso('Escolha o destino para verificar os documentos.'); return; }
          v.docs = verificacaoDoVoo([]);
          desenhar();
        },
      }, 'Verificar documentos de viagem'),
      v.docs ? blocoDocumentos(v.docs, 'Só o destino, por agora: as escalas verificam-se quando escolher um voo. Tabela de demonstração, não é o Timatic.') : null,
      el('button', { class: 'botao-principal', disabled: v.aProcurar || null, onclick: () => void pesquisarVoos() },
        v.aProcurar ? [roda(), 'A pesquisar…'] : 'Pesquisar voos'),
      v.erro ? el('p', { class: 'erro-form', role: 'status', texto: v.erro }) : null,
    ]),
  ];
}

async function pesquisarVoos() {
  const v = estado.voo;
  if (v.aProcurar) return;
  const erro = validarPesquisa(pesquisaDoEstado(), hojeNaDemo());
  if (erro) { v.erro = erro; desenhar(); aviso(erro); return; }
  v.erro = null;
  v.aProcurar = true;
  desenhar();
  /* A mesma espera deliberada do concierge: o estado "a pesquisar" tem de
     existir no ecrã antes de existir um fornecedor que demore a sério. */
  await pausa(420);
  v.ofertas = ofertasDeVoo(pesquisaDoEstado());
  v.aProcurar = false;
  v.fase = 'resultados';
  desenhar();
}

const diaDaPesquisa = (data) => formatDay(`${data}T12:00:00+00:00`);

function vooResultados() {
  const v = estado.voo;
  const q = pesquisaDoEstado();
  const classe = CLASSES.find((c) => c.id === q.classe);
  return [
    cabecalho(`${aeroporto(q.de).city} → ${aeroporto(q.para).city}`, `${v.ofertas.length} ${v.ofertas.length === 1 ? 'opção' : 'opções'}`),
    el('p', { class: 'meta-pesquisa', texto: `${diaDaPesquisa(q.data)} · ${rotuloDePassageiros(q.passageiros)} · ${classe ? classe.rotulo : ''}` }),
    el('p', { class: 'aviso-ilustrativo', texto: AVISO_DE_RESULTADOS }),
    ...(v.ofertas.length
      ? v.ofertas.map(cartaoOferta)
      : [el('div', { class: 'cartao' }, [
          el('h3', { texto: 'Sem voos com estes filtros' }),
          el('p', { class: 'suave', texto: q.escalasMaximas === 0 ? 'Não há voo direto nesta rota da demonstração. Experimente "Até 1 escala".' : 'Experimente outras datas ou outros aeroportos.' }),
        ])]),
  ];
}

function cartaoOferta(o) {
  const primeira = o.pernas[0];
  const ultima = o.pernas[o.pernas.length - 1];
  const diaSeguinte = localDayKey(ultima.chegada) !== localDayKey(primeira.partida);
  return el('button', { class: 'oferta', onclick: () => { estado.voo.escolhida = o; estado.voo.fase = 'resumo'; desenhar(); } }, [
    el('span', { class: 'oferta-horas' }, [
      el('span', {}, [el('strong', { texto: formatTime(primeira.partida) }), el('small', { texto: primeira.de })]),
      el('span', { class: 'oferta-meio', texto: o.escalas.length ? `1 escala · ${o.escalas.join(', ')}` : 'Direto' }),
      el('span', {}, [el('strong', { texto: formatTime(ultima.chegada) + (diaSeguinte ? ' +1' : '') }), el('small', { texto: ultima.para })]),
    ]),
    el('span', { class: 'oferta-rodape' }, [
      el('span', { texto: `${rotuloDeDuracao(o.duracaoMin)} · ${o.companhia}` }),
      el('span', { class: 'oferta-preco' }, [el('small', { texto: 'a partir de ' }), euros(o.precoPorLugar)]),
    ]),
    o.lugaresRestantes ? el('span', { class: 'oferta-lugares', texto: `${o.lugaresRestantes} lugares a este preço` }) : null,
  ]);
}

function linhaTotal(rotulo, valor, texto = null, forte = false) {
  return el('div', { class: 'linha-total' + (forte ? ' forte' : '') }, [el('span', { texto: rotulo }), el('span', { texto: texto ?? euros(valor) })]);
}

function vooResumo() {
  const v = estado.voo;
  const q = pesquisaDoEstado();
  const o = v.escolhida;
  const total = totalDaOferta(o, q);
  const ver = verificacaoDoVoo(o.escalas);
  return [
    cabecalho('A sua reserva', `${aeroporto(q.de).city} → ${aeroporto(q.para).city}`),
    seccao('Voos'),
    el('div', { class: 'pilha' }, o.pernas.map((p) => el('div', { class: 'cartao' }, [
      el('div', { class: 'linha' }, [el('h4', { texto: `${p.de} → ${p.para}` }), el('span', { class: 'marca', texto: p.numero })]),
      el('p', { class: 'suave', texto: `${formatDay(p.partida)} · ${formatTime(p.partida)} → ${formatTime(p.chegada)} · horas locais de cada aeroporto` }),
    ]))),
    blocoDocumentos(ver),
    seccao('Total'),
    el('div', { class: 'cartao' }, [
      linhaTotal(`Bilhetes · ${rotuloDePassageiros(q.passageiros)}`, total.bilhetes),
      q.passageiros.bebes ? linhaTotal('Bebés ao colo', total.bebes) : null,
      total.malas ? linhaTotal(`Malas de porão · ${q.malas} por pessoa`, total.malas) : linhaTotal('Malas de porão', 0, q.malas ? 'incluídas' : 'nenhuma'),
      linhaTotal('Total', total.total, null, true),
      el('p', { class: 'aviso-ilustrativo', texto: 'Preço ilustrativo. Em produção vem do fornecedor, no momento, e pode mudar até à confirmação.' }),
    ]),
    ver.estado === 'impeditivo'
      ? el('button', {
          class: 'botao-escalar',
          onclick: () => abrirConcierge(`Quero voar de ${q.de} para ${q.para} a ${q.data}, mas a verificação de documentos encontrou um impedimento.`),
        }, ['Pedir à NHCS para rever os documentos', seta()])
      : el('button', { class: 'botao-principal', onclick: () => { v.fase = 'pagamento'; desenhar(); } }, 'Continuar para pagamento'),
  ];
}

function vooPagamento() {
  const v = estado.voo;
  const total = totalDaOferta(v.escolhida, pesquisaDoEstado());
  return [
    cabecalho('Pagamento', 'Selecione o método'),
    el('div', { class: 'pilha', role: 'radiogroup', 'aria-label': 'Método de pagamento' }, MEIOS_DE_PAGAMENTO_DEMO.map((m) => el('button', {
      class: 'meio' + (v.meio === m.id ? ' escolhido' : ''), role: 'radio', 'aria-checked': String(v.meio === m.id),
      onclick: () => { v.meio = m.id; desenhar(); },
    }, [el('span', { class: 'meio-marca', 'aria-hidden': 'true', texto: v.meio === m.id ? '●' : '○' }), el('span', { texto: m.rotulo })]))),
    el('p', { class: 'suave', texto: 'A app nunca vê o número do cartão: guarda só o que o fornecedor de pagamentos devolve — a marca, os últimos quatro dígitos e uma referência.' }),
    el('div', { class: 'cartao' }, [linhaTotal('A pagar', total.total, null, true)]),
    el('button', { class: 'botao-principal', disabled: v.aConfirmar || null, onclick: () => void confirmarReserva() },
      v.aConfirmar ? [roda(), 'A confirmar…'] : 'Confirmar pagamento (simulado)'),
    el('p', { class: 'aviso-ilustrativo', texto: 'Demonstração: nenhum pagamento é feito e nenhuma reserva é criada.' }),
  ];
}

async function confirmarReserva() {
  const v = estado.voo;
  if (v.aConfirmar) return;
  v.aConfirmar = true;
  desenhar();
  try {
    const meio = MEIOS_DE_PAGAMENTO_DEMO.find((m) => m.id === v.meio);
    v.recibo = await servicoDeReserva.confirmar(v.escolhida, pesquisaDoEstado(), meio);
    estado.faturasNovas.push(v.recibo.fatura);
    v.fase = 'recibo';
    aviso('Reserva simulada. Nada foi cobrado.');
  } catch (erro) {
    aviso(erro instanceof Error ? erro.message : 'Não foi possível confirmar a reserva.');
  } finally {
    v.aConfirmar = false;
    desenhar();
  }
}

function vooRecibo() {
  const r = estado.voo.recibo;
  const passo = (n, titulo, detalhe, classe) => el('li', { class: 'passo-recibo ' + classe }, [
    el('b', { 'aria-hidden': 'true', texto: String(n) }),
    el('span', {}, [el('strong', { texto: titulo }), el('span', { texto: detalhe })]),
  ]);
  return [
    cabecalho('Reserva enviada', 'Obrigado.'),
    el('div', { class: 'cartao recibo-reserva' }, [
      el('p', { class: 'rotulo', texto: 'Referência' }),
      el('code', { texto: r.referencia }),
      el('p', { class: 'aviso-ilustrativo', texto: r.mensagem }),
    ]),
    seccao('O que acontece a seguir'),
    el('ol', { class: 'passos-recibo' }, [
      passo(1, 'Pagamento confirmado', r.cobrado ? 'Cobrado.' : 'Simulado — nada foi cobrado.', 'feito'),
      passo(2, 'Processo aberto na TIDE', `${r.processoTide === 'simulado' ? 'Simulado. ' : ''}Em produção é automático: ninguém da NHCS volta a escrever a reserva.`, 'simulado'),
      passo(3, 'Fatura emitida pela TIDE', 'Por emitir.', 'pendente'),
      passo(4, 'Fatura guardada na app', 'Aparece em Viagens, nas reservas desta sessão.', 'pendente'),
    ]),
    el('button', { class: 'botao-contorno', onclick: () => irPara('journeys') }, 'Ver em Viagens'),
    el('button', { class: 'botao-contorno', onclick: () => { estado.voo = novaPesquisa(); desenhar(); } }, 'Nova pesquisa'),
  ];
}

/* --------------------------------------------------------------- Viagens */

function ecraViagensDraft() {
  if (!estado.todas.length) return [cabecalho('As suas viagens', 'A carregar…'), ...semViagem()];

  if (estado.vistaViagens === 'viagem') {
    const v = viagemPorId(estado.viagemAberta);
    if (v) return ecraUmaViagem(v);
    estado.vistaViagens = 'listas';
  }

  const { proxima, futuras, passadas } = viagensClassificadas();

  if (estado.vistaViagens === 'futuras' || estado.vistaViagens === 'passadas') {
    const lista = estado.vistaViagens === 'futuras' ? futuras : passadas;
    return [
      voltar('Viagens', () => { estado.vistaViagens = 'listas'; desenhar(); }),
      cabecalho('As suas viagens', estado.vistaViagens === 'futuras' ? 'As próximas' : 'As que já fez'),
      lista.length
        ? el('div', { class: 'pilha' }, lista.map((v) => {
            const tv = getJourneyTiming(v, relogio());
            return fila(v.destination, `${tv.datesLabel} · ${tv.relativeLabel}`, () => abrirViagem(v.id));
          }))
        : el('p', { class: 'suave', texto: 'Nenhuma, por agora.' }),
    ];
  }

  const tp = proxima ? getJourneyTiming(proxima, relogio()) : null;
  return [
    cabecalho('As suas viagens', proxima ? proxima.destination : 'Sem viagem marcada'),
    proxima
      ? el('button', { class: 'heroi heroi-lista', 'aria-label': `Abrir a viagem a ${proxima.destination}`, onclick: () => abrirViagem(proxima.id) }, [
          el('span', { class: 'marca-heroi', texto: tp.phase === 'travelling' ? 'EM CURSO' : 'A PRÓXIMA' }),
          el('p', { class: 'eyebrow', texto: tp.relativeLabel }),
          el('h3', { texto: proxima.destination }),
          el('p', { class: 'meta', texto: tp.datesLabel }),
        ])
      : convitePlanear(),
    el('div', { class: 'pilha' }, [
      fila('As próximas', `${futuras.length} ${futuras.length === 1 ? 'viagem' : 'viagens'}`, () => { estado.vistaViagens = 'futuras'; desenhar(); }),
      fila('As que já fez', `${passadas.length} ${passadas.length === 1 ? 'viagem' : 'viagens'}`, () => { estado.vistaViagens = 'passadas'; desenhar(); }),
    ]),
    ...reservasDaSessao(),
  ];
}

/** O que a pesquisa de voos deixou — a fatura "por emitir" que a TIDE emitiria. */
function reservasDaSessao() {
  if (!estado.faturasNovas.length) return [];
  return [
    seccao('Reservas desta sessão'),
    el('div', { class: 'lista-doc' }, estado.faturasNovas.map((f) => el('div', { class: 'doc doc-pendente' }, [
      el('span', { class: 'icone', 'aria-hidden': 'true', texto: '€' }),
      el('span', { class: 'nome' }, [f.titulo, el('p', { class: 'estado-doc', texto: `${f.referencia} · fatura por emitir pela ${f.emitidoPor}` })]),
      el('span', { class: 'demo', texto: 'DEMO' }),
    ]))),
  ];
}

function ecraUmaViagem(v) {
  const { proxima, futuras } = viagensClassificadas();
  const tipo = proxima && v.id === proxima.id ? 'proxima' : futuras.some((f) => f.id === v.id) ? 'futura' : 'passada';
  const paraViagem = voltar(v.destination, () => { estado.subViagem = null; desenhar(); });

  switch (estado.subViagem) {
    case 'itinerario': return [paraViagem, ...ecraItinerario(v, tipo)];
    case 'documentos': return [paraViagem, ...ecraDocumentos(v)];
    case 'clima': return [paraViagem, ...ecraClima(v)];
    case 'voo': return [paraViagem, ...ecraEstadoDoVoo(v)];
    case 'tradutor': return [paraViagem, ...ecraTradutor()];
    case 'emergencia': return [paraViagem, ...ecraEmergencia(v)];
    default: break;
  }

  const tv = getJourneyTiming(v, relogio());
  const opcoes = [
    ['itinerario', 'O meu itinerário', 'Todos os serviços, por dia, à hora local'],
    ['documentos', 'Os meus documentos', 'Vouchers e documentos fiscais'],
  ];
  if (tipo !== 'passada') opcoes.push(['clima', 'Meteorologia', 'A previsão no destino']);
  if (tipo === 'proxima') {
    opcoes.push(
      ['voo', 'Estado do voo', 'Horários, terminal e porta'],
      ['tradutor', 'Tradutor', 'Escrever ou falar'],
      ['emergencia', 'Contactos de emergência', 'No destino'],
    );
  }
  const titulo = { proxima: 'A próxima viagem', futura: 'Viagem futura', passada: 'Viagem passada' }[tipo];
  return [
    voltar('Viagens', () => { estado.vistaViagens = 'listas'; estado.subViagem = null; desenhar(); }),
    cabecalho(titulo, v.destination),
    el('p', { class: 'meta-pesquisa', texto: `${tv.datesLabel} · ${tv.relativeLabel}` }),
    el('div', { class: 'pilha' }, opcoes.map(([id, rotulo, detalhe]) => fila(rotulo, detalhe, () => { estado.subViagem = id; desenhar(); }))),
  ];
}

function ecraDocumentos(v) {
  const daProxima = estado.viagem && v.id === estado.viagem.id;
  const grupos = agruparPorCategoria(daProxima ? DOCUMENTOS_DE_SERVICO_DEMO : []);
  const linha = (d) => el('div', { class: 'doc' + (d.estado === 'por-emitir' ? ' doc-pendente' : '') }, [
    el('span', { class: 'icone', 'aria-hidden': 'true', texto: d.tipo === 'fiscal' ? '€' : '▤' }),
    el('span', { class: 'nome' }, [
      d.titulo,
      el('p', { class: 'estado-doc', texto: d.estado === 'por-emitir' ? `Por emitir · ${d.emitidoPor}` : `${d.referencia} · ${d.emitidoPor}` }),
    ]),
    el('span', { class: 'demo', texto: d.tipo === 'fiscal' ? 'FISCAL' : 'VOUCHER' }),
  ]);
  return [
    cabecalho('Os meus documentos', v.destination),
    el('p', { class: 'suave', texto: 'Demonstração: localizadores ilustrativos e nenhum ficheiro real. As faturas são emitidas pela TIDE e aparecem aqui quando existem.' }),
    ...grupos.map((g, i) => el('div', { class: 'grupo-doc' }, [
      el('h3', { texto: `${String(i + 1).padStart(2, '0')}. ${g.rotulo}` }),
      g.vouchers.length || g.fiscais.length
        ? el('div', { class: 'lista-doc' }, [...g.vouchers.map(linha), ...g.fiscais.map(linha)])
        : el('p', { class: 'suave', texto: 'Sem documentos nesta categoria.' }),
    ])),
    daProxima
      ? el('button', { class: 'botao-contorno', onclick: () => { estado.carteiraAberta = true; estado.subViagem = 'itinerario'; desenhar(); } }, 'Passaportes e seguro — carteira de embarque')
      : null,
  ];
}

function ecraClima(v) {
  const p = v.id === SIMULACAO_EM_VIAGEM.journeyId ? PREVISAO_DEMO : null;
  return [
    cabecalho('Meteorologia', p ? p.cidade : v.destination),
    p
      ? el('div', { class: 'previsao' }, p.dias.map((d) => el('div', { class: 'previsao-dia' }, [
          el('strong', { texto: d.dia }), el('span', { texto: `${d.maxima}° / ${d.minima}°` }), el('small', { texto: d.resumo }),
        ])))
      : el('p', { class: 'suave', texto: 'A previsão aparece nos cinco dias antes da partida.' }),
    el('p', { class: 'aviso-ilustrativo', texto: `Simulado. Fornecedor previsto: ${PREVISAO_DEMO.fornecedorPrevisto}.` }),
  ];
}

function ecraEstadoDoVoo(v) {
  const e = ESTADO_DO_VOO_DEMO;
  const par = (termo, valor) => [el('dt', { texto: termo }), el('dd', { texto: valor })];
  return [
    cabecalho('Estado do voo', `${v.flightNumber} · ${routeLabel(v)}`),
    el('div', { class: 'cartao' }, [
      el('div', { class: 'linha' }, [el('h3', { texto: e.estado }), el('span', { class: 'marca', texto: `+${e.atrasoMinutos} MIN` })]),
      el('dl', { class: 'dados-voo' }, [
        ...par('Partida prevista', `${formatDay(v.departureAt)}, ${formatTime(v.departureAt)} (hora de Lisboa)`),
        ...par('Atraso estimado', `${e.atrasoMinutos} minutos`),
        ...par('Terminal', e.terminal),
        ...par('Porta', e.porta),
      ]),
    ]),
    el('p', { class: 'aviso-ilustrativo', texto: `Simulado. Fornecedor previsto: ${e.fornecedorPrevisto} — serviço pago, com contrato.` }),
  ];
}

function ecraTradutor() {
  const tr = estado.traducao;
  const campo = el('input', { id: 'campo-traduzir', type: 'text', placeholder: 'Escreva em português…', value: tr.texto });
  campo.addEventListener('input', () => { tr.texto = campo.value; });
  campo.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') traduzir(); });
  return [
    cabecalho('Tradutor', 'Português → inglês'),
    el('div', { class: 'campo' }, [el('label', { for: 'campo-traduzir', texto: 'Escrever ou falar' }), campo]),
    el('button', { class: 'botao-principal', onclick: traduzir }, 'Traduzir'),
    tr.resultado
      ? el('div', { class: 'cartao', 'aria-live': 'polite' }, [el('p', { class: 'rotulo', texto: 'Inglês' }), el('p', { class: 'traduzido', texto: tr.resultado })])
      : null,
    seccao('Frases'),
    el('div', { class: 'frases' }, FRASES_DEMO.map((f) => el('button', { class: 'frase', texto: f.pt, onclick: () => { tr.texto = f.pt; traduzir(); } }))),
    el('p', { class: 'aviso-ilustrativo', texto: 'Simulado: só as frases desta lista. Em produção, uma API de tradução — texto e voz — com custo por uso.' }),
  ];
}

function traduzir() {
  const tr = estado.traducao;
  tr.resultado = traduzirFrase(tr.texto, FRASES_DEMO);
  desenhar();
}

function ecraEmergencia(v) {
  const destino = aeroporto(v.route[v.route.length - 1].code);
  const c = destino ? CONTACTOS_DE_EMERGENCIA[destino.countryCode] : null;
  return [
    cabecalho('Contactos de emergência', c ? c.pais : v.destination),
    c
      ? el('div', { class: 'pilha' }, c.contactos.map((x) => fila(x.nome, x.numero ?? 'Por configurar pela NHCS')))
      : el('p', { class: 'suave', texto: 'Sem contactos para este destino nesta demonstração.' }),
    c ? el('p', { class: 'aviso-ilustrativo', texto: c.source }) : null,
  ];
}

/* ------------------------------------------------------------------ Chat */

function ecraChat() {
  return [
    cabecalho('Chat', 'Fale connosco'),
    el('div', { class: 'pilha pilha-plano' }, [
      WHATSAPP_NHCS
        ? el('a', { class: 'plano', href: `https://wa.me/${WHATSAPP_NHCS}`, target: '_blank', rel: 'noopener' }, [
            el('span', {}, [el('strong', { texto: 'WhatsApp' }), el('p', { class: 'suave', texto: 'Conversa direta com a equipa NHCS.' })]), seta(),
          ])
        : el('div', { class: 'plano plano-inativo' }, [
            el('span', {}, [
              el('strong', { texto: 'WhatsApp' }),
              el('p', { class: 'suave', texto: 'Por configurar: falta o número de WhatsApp da NHCS. Com ele, este botão abre a conversa com a equipa.' }),
            ]),
          ]),
      porta('Concierge IA', 'Para planear e pedir a qualquer hora. Fora de horas é por aqui que a NHCS recebe o pedido.', () => abrirConcierge()),
    ]),
    ...mensagensDaNHCS(),
  ];
}

/* ------------------------------------------------------------------ Menu ≡ */

function abrirMenu() {
  estado.menuAberto = true;
  estado.menuSeccao = null;
  aviso('');
  desenhar();
}

function ecraMenu() {
  const L = estado.lingua;
  if (estado.menuSeccao) {
    return [voltar(t('menu.titulo', L), () => { estado.menuSeccao = null; desenhar(); }), ...seccaoDoMenu(estado.menuSeccao)];
  }
  const itens = ['pessoal', 'familia', 'pagamentos', 'legal', 'notificacoes'];
  return [
    voltar('Fechar', () => { estado.menuAberto = false; desenhar(); }),
    cabecalho(t('menu.titulo', L), estado.sessao ? estado.sessao.firstName : '', 'Menu'),
    el('div', { class: 'pilha' }, itens.map((id) => fila(t(`menu.${id}`, L), null, () => { estado.menuSeccao = id; desenhar(); }))),
    el('div', { class: 'cartao-acess' }, [
      el('p', { class: 'rotulo', texto: 'Acessibilidade' }),
      el('h3', { texto: semMovimento() ? 'Movimento reduzido ativo' : 'Movimento reduzido segue a definição do dispositivo' }),
      el('p', { class: 'suave', texto: 'Informação crítica nunca depende de animação; os controlos mantêm alvos de toque amplos.' }),
    ]),
    el('button', { class: 'botao-contorno', onclick: sair }, t('menu.sair', L)),
  ];
}

function seccaoDoMenu(id) {
  if (id === 'pessoal') {
    return [
      cabecalho('Os meus dados', 'Rodrigo Figueiredo'),
      el('div', { class: 'pilha' }, [
        fila('Email', 'cliente@exemplo.pt'),
        fila('Nacionalidade', 'Portuguesa · cidadão da UE'),
        estado.viagem
          ? fila('Documento de identidade', 'Passaporte · na carteira de embarque', () => abrirViagem(estado.viagem.id, 'itinerario', { carteira: true }))
          : fila('Documento de identidade', 'Passaporte · na carteira de embarque'),
        fila('Preferências de viagem', 'Quiet luxury · 5 estrelas · transfers privados'),
      ]),
      el('p', { class: 'aviso-ilustrativo', texto: 'Dados de demonstração. Em produção o perfil vive no backend da NHCS — encriptado, com regras de retenção — e não na TIDE.' }),
    ];
  }
  if (id === 'familia') {
    const titulares = [...new Set(estado.documentos.filter((d) => d.kind === 'passport').map((d) => d.holder))];
    return [
      cabecalho('A minha família', 'Viajantes'),
      el('div', { class: 'pilha' }, titulares.map((nome, i) => fila(nome, i === 0 ? 'Titular da conta' : 'Viajante · vê as viagens partilhadas'))),
      el('p', { class: 'aviso-ilustrativo', texto: 'Quem vê o quê numa viagem de família é uma decisão da NHCS ainda por tomar (questão 5 das bloqueadoras).' }),
    ];
  }
  if (id === 'pagamentos') {
    return [
      cabecalho('Meios de pagamento', 'Guardados'),
      el('div', { class: 'pilha' }, MEIOS_DE_PAGAMENTO_DEMO.map((m) => fila(m.rotulo, m.tipo === 'cartao' ? 'Guardado pelo fornecedor de pagamentos' : 'Sem dados guardados'))),
      el('p', { class: 'aviso-ilustrativo', texto: 'A app nunca guarda números de cartão — só a referência que o fornecedor de pagamentos devolve. Guardar o número põe a NHCS no âmbito do PCI DSS.' }),
    ];
  }
  if (id === 'legal') {
    return [
      cabecalho('Informação legal', 'Termos e privacidade'),
      el('div', { class: 'pilha' }, [
        fila('Termos de utilização', 'Por publicar'),
        fila('Política de privacidade', 'A NHCS é a responsável pelo tratamento'),
        fila('Política de acesso à app', 'A que segue a quem pede acesso sem ser cliente'),
        fila('Subcontratantes', 'TIDE, pagamentos, alojamento — por confirmar'),
      ]),
    ];
  }
  return [cabecalho('Notificações', 'O que lhe vamos enviar'), politicaDeNotificacoes()];
}

function sair() {
  sessaoService.signOut();
  estado.sessao = null;
  estado.menuAberto = false;
  estado.menuSeccao = null;
  estado.separador = 'home';
  estado.entradaModo = 'entrar';
  desenhar();
}

/* ------------------------------------------------------ A porta: pedir acesso */

async function pedirAcesso(email) {
  const a = estado.acesso;
  if (a.aEnviar) return;
  a.email = email;
  a.aEnviar = true;
  a.erro = null;
  desenhar({ manterCampos: {} });
  try {
    a.recibo = await servicoDeAcesso.pedir(email);
  } catch (erro) {
    a.erro = erro instanceof Error ? erro.message : 'Não foi possível enviar o pedido.';
  } finally {
    a.aEnviar = false;
    desenhar({ manterCampos: {} });
  }
}

function ecraPedirAcesso(linguas) {
  const L = estado.lingua;
  const a = estado.acesso;
  const email = el('input', {
    id: 'campo-acesso', type: 'email', autocomplete: 'email', inputmode: 'email',
    placeholder: 'nome@exemplo.pt', value: a.email ?? '', disabled: a.aEnviar || null,
  });
  const forma = el('form', {
    class: 'entrada-campos',
    onsubmit: (ev) => { ev.preventDefault(); void pedirAcesso(email.value); },
  }, [
    el('label', { for: 'campo-acesso', texto: t('entrada.email', L) }), email,
    el('button', { class: 'entrar', type: 'submit', disabled: a.aEnviar || null, texto: a.aEnviar ? '…' : t('entrada.pedirAcesso.enviar', L) }),
    el('p', { class: 'entrada-erro', role: 'status', 'aria-live': 'polite', texto: a.erro ?? '' }),
  ]);

  const recibo = a.recibo
    ? el('div', { class: 'acesso-recibo', role: 'status' }, [
        el('p', { texto: a.recibo.mensagem }),
        el('code', { texto: a.recibo.referencia }),
        el('div', { class: 'acesso-demo' }, [
          el('p', { class: 'rotulo', texto: 'Só na demonstração · o que seguiria por email' }),
          el('p', { texto: a.recibo.ramoDemo === 'cliente'
            ? 'Este email é de um cliente: seguiria o link para o formulário de registo.'
            : 'Este email não é de um cliente: seguiria a política de acesso à app.' }),
          el('p', { class: 'suave', texto: 'Em produção o ecrã não diz isto — senão bastava escrever emails num formulário para saber quem é cliente da NHCS.' }),
        ]),
      ])
    : null;

  return [el('section', { class: 'entrada' }, [
    linguas,
    el('div', { class: 'entrada-texto' }, [
      el('p', { class: 'entrada-marca', texto: 'NHCS' }),
      el('h2', { texto: t('entrada.pedirAcesso', L) }),
      el('p', { class: 'entrada-sub', texto: t('entrada.pedirAcesso.texto', L) }),
    ]),
    recibo ?? forma,
    el('button', {
      class: 'pedir-acesso', type: 'button',
      onclick: () => { estado.entradaModo = 'entrar'; estado.acesso = { aEnviar: false, recibo: null, erro: null }; desenhar(); },
    }, t('entrada.voltar', L)),
    el('p', { class: 'entrada-nota' }, [
      'Demonstração. Experimente ', el('code', { texto: 'cliente@exemplo.pt' }), ' (cliente) e qualquer outro email (não cliente).',
    ]),
  ])];
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

/**
 * Os quatro botões fixos. Tocar num deles leva ao topo dessa secção — é o que
 * se espera de uma barra fixa, e é o que o Draft1 desenha.
 */
function irPara(separador) {
  estado.separador = separador;
  estado.menuAberto = false;
  if (separador === 'search') { estado.modoPesquisa = null; estado.categoria = null; }
  if (separador === 'journeys') { estado.vistaViagens = 'listas'; estado.subViagem = null; }
  aviso('');
  desenhar();
}

function abrirConcierge(pedido) {
  sequencia += 1;
  estado.separador = 'search';
  estado.modoPesquisa = 'concierge';
  estado.menuAberto = false;
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


/* ------------------------------------------------------------------ a porta
 *
 * A mesma razão do `components/SignInScreen.tsx` da app, e o mesmo desenho:
 * marca, título, dois campos, um botão, e o erro num sítio de altura fixa para
 * o botão não saltar debaixo do dedo.
 *
 * O movimento também é o mesmo: duas fases (texto, depois campos) para o olho
 * pousar no nome antes de lhe pedirem alguma coisa, e um tremor curto no erro
 * porque a mensagem aparece fora do sítio para onde a pessoa está a olhar. Tudo
 * desligado com `prefers-reduced-motion`, e a mensagem é anunciada por
 * `aria-live` — que é como quem não vê o tremor fica a saber na mesma.
 */

function mensagemDeErro(erro) {
  if (erro instanceof SignInError) {
    if (erro.reason === 'invalid-credentials') return 'Email ou palavra-passe incorretos.';
    if (erro.reason === 'rate-limited') return 'Demasiadas tentativas. Aguarde um momento antes de tentar de novo.';
    if (erro.reason === 'unreachable') return 'Não foi possível contactar a NHCS. Verifique a ligação e tente de novo.';
  }
  return 'Não foi possível entrar. Tente de novo.';
}

async function entrar(email, palavra) {
  if (estado.aEntrar) return;
  estado.aEntrar = true;
  estado.erroEntrada = null;
  desenhar({ manterCampos: { email, palavra } });
  try {
    estado.sessao = await sessaoService.signIn(email, palavra);
    estado.aEntrar = false;
    desenhar();
    void carregarViagem();
  } catch (e) {
    estado.aEntrar = false;
    estado.erroEntrada = mensagemDeErro(e);
    desenhar({ manterCampos: { email, palavra }, tremer: true });
  }
}

function ecraEntrada(campos = {}) {
  const L = estado.lingua;
  /* "Use native language" — o seletor de língua do Draft1, no canto do ecrã
     de entrada. Esta primeira fatia traduz a entrada, os quatro botões e o
     menu; o resto da app continua em português. */
  const linguas = el('div', { class: 'linguas', role: 'group', 'aria-label': 'Língua' }, LINGUAS.map((x) => el('button', {
    class: 'lingua', type: 'button', 'aria-pressed': String(L === x.id), texto: x.rotulo,
    onclick: () => { estado.lingua = x.id; desenhar({ manterCampos: campos }); },
  })));
  if (estado.entradaModo === 'pedir') return ecraPedirAcesso(linguas);

  const email = el('input', {
    id: 'campo-email', type: 'email', autocomplete: 'email', inputmode: 'email',
    placeholder: 'nome@exemplo.pt', value: campos.email ?? '', disabled: estado.aEntrar || null,
  });
  const palavra = el('input', {
    id: 'campo-palavra', type: 'password', autocomplete: 'current-password',
    placeholder: '••••••••', value: campos.palavra ?? '', disabled: estado.aEntrar || null,
  });

  const botao = el('button', {
    class: 'entrar', type: 'submit', disabled: estado.aEntrar || null,
    texto: estado.aEntrar ? '…' : t('entrada.entrar', L),
  });

  const forma = el('form', {
    class: 'entrada-campos',
    onsubmit: (ev) => { ev.preventDefault(); void entrar(email.value, palavra.value); },
  }, [
    el('label', { for: 'campo-email', texto: t('entrada.email', L) }), email,
    el('label', { for: 'campo-palavra', texto: t('entrada.password', L) }), palavra,
    botao,
    el('p', { class: 'entrada-erro', role: 'status', 'aria-live': 'polite', texto: estado.erroEntrada ?? '' }),
  ]);

  const texto = el('div', { class: 'entrada-texto' }, [
    el('p', { class: 'entrada-marca', texto: 'NHCS' }),
    el('h2', { texto: t('entrada.titulo', L) }),
    el('p', { class: 'entrada-sub', texto: 'Entre com o email que usa com a NH Concierge Services.' }),
  ]);

  if (!semMovimento()) {
    revelar(texto, 0);
    revelar(forma, 90);
  }

  return [el('section', { class: 'entrada' }, [
    linguas,
    texto,
    forma,
    /* O segundo botão do Draft1. Ver `src/acesso.js` para o porquê de o ecrã
       responder sempre o mesmo, seja quem for que pede. */
    el('button', {
      class: 'pedir-acesso', type: 'button',
      onclick: () => { estado.entradaModo = 'pedir'; estado.acesso = { aEnviar: false, recibo: null, erro: null }; desenhar(); },
    }, t('entrada.pedirAcesso', L)),
    el('p', { class: 'entrada-nota' }, [
      'Demonstração. Nenhum dado real de cliente passa por aqui. Entre com ',
      el('code', { texto: 'cliente@exemplo.pt' }), ' e ', el('code', { texto: 'demo-nhcs' }), '.',
    ]),
  ])];
}

/* Os quatro botões fixos do Draft1, pela ordem dele: Home, Search, Journeys,
   Chat. Eram cinco — Início, Viagens, Concierge, Planear, Perfil. O Concierge
   e o Planear passaram a ser portas da Pesquisa; o Perfil passou para o ≡. */
const SEPARADORES = [
  { id: 'home', chave: 'nav.home', icone: '⌂', ecra: ecraInicio },
  { id: 'search', chave: 'nav.search', icone: '⌕', ecra: ecraPesquisa },
  { id: 'journeys', chave: 'nav.journeys', icone: '◌', ecra: ecraViagensDraft },
  { id: 'chat', chave: 'nav.chat', icone: '✉', ecra: ecraChat },
];

function desenharNav() {
  nav.textContent = '';
  for (const separador of SEPARADORES) {
    const activo = separador.id === estado.separador && !estado.menuAberto;
    const rotulo = t(separador.chave, estado.lingua);
    nav.append(el('button', {
      role: 'tab',
      'aria-selected': String(activo),
      'aria-label': rotulo,
      onclick: () => irPara(separador.id),
    }, [
      el('span', { class: 'icone', 'aria-hidden': 'true', texto: separador.icone }),
      el('span', { 'aria-hidden': 'true', texto: rotulo }),
    ]));
  }
}

let anterior = null;

function desenhar({ manterFoco = false, manterCampos = null, tremer = false } = {}) {
  /* A porta primeiro. Sem sessão não há separadores, não há nav e não há
     viagem — e o `carregarViagem()` só arranca depois de alguém entrar, para a
     demonstração não pedir dados a ninguém antes de saber quem é. */
  if (!estado.sessao) {
    ecra.classList.remove('escuro');
    vista.textContent = '';
    vista.append(...ecraEntrada(manterCampos ?? {}));
    nav.textContent = '';
    nav.hidden = true;
    if (tremer && !semMovimento()) {
      const forma = vista.querySelector('.entrada-campos');
      if (forma) {
        forma.animate(
          [{ transform: 'none' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-6px)' },
           { transform: 'translateX(6px)' }, { transform: 'none' }],
          /* 4 x 55 ms, como as quatro Animated.timing do SignInScreen. */
          { duration: 220, easing: 'cubic-bezier(.37, 0, .63, 1)' },
        );
      }
    }
    const primeiro = vista.querySelector(manterCampos ? '.entrada-erro' : '#campo-email');
    if (!manterCampos && primeiro && primeiro.focus) primeiro.focus();
    return;
  }
  nav.hidden = false;

  const separador = SEPARADORES.find((s) => s.id === estado.separador) || SEPARADORES[0];
  const escuro = !estado.menuAberto && estado.separador === 'search' && estado.modoPesquisa === 'concierge';
  ecra.classList.toggle('escuro', escuro);

  const posicao = vista.scrollTop;
  /* O foco volta ao campo onde se estava a escrever: o do concierge (sem id)
     ou os da pesquisa de voos (com id). Sem isto, cada letra redesenhava o
     ecrã e o cursor ia parar ao início da página. */
  const activoAntes = manterFoco ? document.activeElement : null;
  const focoEraCampo = !!activoAntes && (activoAntes.tagName === 'TEXTAREA' || activoAntes.tagName === 'INPUT');
  const idDoFoco = focoEraCampo && activoAntes.id ? activoAntes.id : null;
  const cursor = focoEraCampo ? activoAntes.selectionStart : null;

  vista.textContent = '';
  vista.append(...(estado.menuAberto ? ecraMenu() : separador.ecra()).filter(Boolean));
  desenharNav();
  if (vista.querySelector('.itinerario')) ligarJato();
  /* O Início também tem herói. O ouvinte de scroll é o mesmo — está preso ao
     `.vista`, que não é recriado — mas a primeira medição tem de acontecer a
     cada desenho, senão o herói novo fica sem posição até alguém tocar. */
  medirParallax();
  ligarScrollGlobal();

  if (manterFoco) {
    vista.scrollTop = posicao;
    const campo = idDoFoco ? document.getElementById(idDoFoco) : vista.querySelector('textarea');
    if (focoEraCampo && campo) {
      campo.focus();
      try { if (cursor !== null && campo.setSelectionRange) campo.setSelectionRange(cursor, cursor); } catch { /* `type=email` não tem cursor */ }
    }
  } else {
    vista.scrollTop = 0;
    /* Transição de ecrã: 180 ms de opacity, 260 ms de deslocação — os mesmos
       valores do ScreenTransition da app. Só quando o separador muda.

       Este comentário estava certo e o código não: era uma animação só, de 260
       ms, a mover as duas propriedades juntas. Ninguém repara na diferença de
       80 ms num ecrã, repara-se em ver os dois lado a lado — e é exactamente
       para isso que a demonstração existe. */
    if (anterior !== chaveDoEcra() && !semMovimento()) {
      vista.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 180, easing: 'cubic-bezier(.16, 1, .3, 1)' });
      vista.animate([{ transform: 'translateY(10px)' }, { transform: 'none' }],
        { duration: 260, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    }
  }
  anterior = chaveDoEcra();
}

/** Que ecrã está à vista — para a transição correr ao mudar de ecrã, e não a cada tecla. */
function chaveDoEcra() {
  return [estado.separador, estado.menuAberto, estado.menuSeccao, estado.modoPesquisa, estado.categoria,
    estado.voo && estado.voo.fase, estado.vistaViagens, estado.viagemAberta, estado.subViagem].join('|');
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

function fracaoDaViagemAgora() {
  const agora = relogio().getTime();
  const viagem = estado.viagemDoJato || estado.viagem;
  const pontos = eventProgress(viagem);
  let ultima = 0;
  for (const [i, evento] of viagem.timeline.entries()) {
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
  conduzirJatoPorScroll(lista, alvo);
}

/**
 * O ouvinte de scroll para o que não depende do itinerário — parallax e
 * espinha. É registado uma vez, como o do jato, e pela mesma razão: `desenhar()`
 * corre a cada toque e a cada tecla, e um ouvinte por desenho acumula.
 */
let ouvinteScrollLigado = false;
function ligarScrollGlobal() {
  if (ouvinteScrollLigado) return;
  ouvinteScrollLigado = true;
  vista.addEventListener('scroll', () => { medirParallax(); medirEspinha(); }, { passive: true });
}

function conduzirJatoPorScroll(lista, alvo) {
  /* O ouvinte é registado uma vez e não a cada desenho. `desenhar()` corre em
     cada toque no separador e em cada tecla escrita no concierge; um
     `addEventListener` por desenho acumula centenas de closures presas ao mesmo
     elemento, e o sintoma é a página ficar lenta depois de se usar um bocado —
     que é precisamente o tipo de fuga que ninguém liga a um jato. */
  if (!ouvinteVooLigado) {
    ouvinteVooLigado = true;
    /* Mede no próprio evento, sem `requestAnimationFrame`. O rAF é a maneira
       habitual de estrangular um handler de scroll, mas não dispara em
       separadores escondidos — e foi exactamente assim que a verificação desta
       animação me deu resultados vazios durante meia hora. Uma leitura de
       rectângulo e uma escrita de custom property por evento é barato; o
       trabalho pesado é composto na GPU a partir de `--voo`. */
    vista.addEventListener('scroll', () => {
      const l = vista.querySelector('.itinerario');
      const a = vista.querySelector('.rota-jato');
      if (l && a) medirCom(l, a);
      medirParallax();
      medirEspinha();
    }, { passive: true });
  }

  medirCom(lista, alvo);
  medirParallax();
  medirEspinha();
}

let ouvinteVooLigado = false;

/**
 * A espinha do itinerário preenche-se com o progresso do scroll.
 *
 * A linha vertical que liga os momentos já existia, cinzenta e inteira. Agora
 * tem um traço verde por cima que cresce à medida que se desce — o mesmo
 * progresso que move o jato, dito de outra maneira e no sítio onde se está a
 * ler. Duas leituras do mesmo facto, e nenhuma delas necessária: as horas
 * continuam todas em texto.
 */
function medirEspinha() {
  const lista = vista.querySelector('.itinerario');
  if (!lista) return;
  const caixa = lista.getBoundingClientRect();
  const alturaEcra = vista.clientHeight || 1;
  /* Cheia quando o fundo da lista chega a meio do ecrã. Preencher só ao sair
     por cima deixaria a espinha eternamente incompleta em listas curtas. */
  const percorrido = (alturaEcra * 0.55 - caixa.top) / Math.max(1, caixa.height);
  lista.style.setProperty('--espinha', (Math.min(1, Math.max(0, percorrido)) * 100).toFixed(1) + '%');
}

/**
 * `--voo`, entre 0 e 1, a partir de onde a lista está no ecrã.
 *
 * 0 quando o topo da lista chega ao fundo do ecrã, 1 quando o fundo da lista
 * chega ao topo — a mesma janela que o `animation-range: entry/exit` do CSS
 * define, para as duas versões coincidirem.
 */
/**
 * Parallax do herói.
 *
 * A imagem desloca-se a uma fracção do scroll — no máximo 12% da altura, que é
 * o limite da tabela de movimento. Abaixo disso não se nota; acima, a fotografia
 * passa a competir com o texto que está por cima dela.
 *
 * É `translate3d` num pseudo-elemento com `will-change`, portanto composto na
 * GPU e sem tocar no layout.
 */
function medirParallax() {
  if (semMovimento()) return;
  const topo = vista.scrollTop;
  for (const heroi of vista.querySelectorAll('.heroi')) {
    const caixa = heroi.getBoundingClientRect();
    const alturaEcra = vista.clientHeight || 1;
    /* -1 quando o herói está todo abaixo do ecrã, +1 quando já saiu por cima. */
    const rel = Math.max(-1, Math.min(1, (alturaEcra / 2 - (caixa.top + caixa.height / 2)) / alturaEcra));
    heroi.style.setProperty('--parallax', (rel * 12).toFixed(2) + '%');
  }
  void topo;
}

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
  /* Os dois momentos em que o Início do Draft1 muda a sério: a bagagem no
     tapete depois de aterrar, e o transfer à espera. */
  { rotulo: 'Aterrou em Malé', data: '2026-10-11T07:30:00+05:00' },
  { rotulo: 'Antes do hidroavião', data: '2026-10-11T09:25:00+05:00' },
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
/* `carregarViagem()` não arranca aqui. Arranca no `entrar()`, depois de haver
   sessão — porque pedir a viagem antes de saber de quem ela é seria a
   demonstração a fazer o contrário do que o produto tem de fazer. */
