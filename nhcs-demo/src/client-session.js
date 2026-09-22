/* GERADO — NÃO EDITAR.
 * Origem: app/src/services/client-session.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * A sessão do cliente — e a fronteira que a app nunca pode atravessar.
 *
 * PORQUE E QUE ISTO EXISTE
 *
 * A 7 de setembro de 2026 a Qite respondeu à pergunta que o pedido de
 * informação de 5 de setembro tinha marcado como "o item a responder primeiro",
 * porque decidia o modelo de autenticação da app inteira: como é que um cliente
 * final — não um operador — se autentica na TIDE.
 *
 * A resposta é que não se autentica. Palavras deles: *"both the Public and
 * Private API use the same authentication: you generate a Tenant API Key and
 * exchange it for a Bearer service token, which gives you access to both APIs"*.
 *
 * Há **uma** credencial, ao nível do tenant, e serve para tudo — incluindo as
 * rotas `/api/web/client/*` que a app queria usar. O `client` no caminho
 * descreve a forma dos dados, não quem os pede.
 *
 * Isso faz da Tenant API Key uma chave-mestra sobre os dados de todos os
 * clientes da NHCS. Quem a tiver lê a agenda, os documentos e as mensagens de
 * toda a gente. E uma app instalada num telemóvel é um ficheiro que qualquer
 * pessoa pode abrir: `.apk` e `.ipa` desmontam-se, o tráfego intercepta-se, as
 * strings extraem-se. Não existe forma de guardar um segredo partilhado dentro
 * de uma app distribuída.
 *
 * Portanto:
 *
 *   - a app **nunca** fala com a TIDE;
 *   - a app **nunca** tem uma Tenant API Key, um service token da TIDE, nem
 *     credenciais de operador;
 *   - a app autentica-se **na NHCS** e recebe um token curto que só serve para
 *     falar com a NHCS;
 *   - é o backend da NHCS que guarda a chave-mestra e que decide que viagem é
 *     que aquele cliente pode ver — a TIDE não faz essa verificação por nós,
 *     porque do ponto de vista dela só existe a NHCS.
 *
 * Ver `_projeto-claude/08c-descoberta-tide-2026-09-09.md`.
 *
 * ESTE FICHEIRO NÃO FALA COM NADA
 *
 * Não há aqui cliente HTTP nem host nenhum. Há o **contrato** da sessão: o que a
 * app pede, o que recebe, e o que é que ela tem o direito de ter em memória. O
 * mock por trás permite desenvolver os ecrãs de sessão sem backend, como o resto
 * das camadas deste projecto.
 *
 * O que impede este ficheiro de ser só boas intenções é o
 * `tools/fronteira-tide.mjs`, que corre no `pnpm verify` e falha se alguma coisa
 * na árvore da app parecer um host da TIDE ou uma credencial de tenant.
 */

/**
 * O que a app tem, depois de o cliente entrar.
 *
 * Repare-se no que **não** está aqui: nada da TIDE. Nem chave, nem service
 * token, nem `entryId` em bruto. O `journeyIds` é a lista que o backend decidiu
 * que este cliente pode ver, já traduzida para o vocabulário da app.
 */

/** Porque é que uma tentativa de entrar falhou. */

export class SignInError extends Error {
  /**
   * Campo declarado e atribuído à mão, e não `constructor(readonly reason)`.
   *
   * O `pnpm test` corre com `node --experimental-strip-types`, que apaga tipos
   * e não transforma código. Uma parameter property precisa de emissão para
   * existir em runtime, e o Node recusa o ficheiro inteiro com
   * `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Vale para tudo o que precise de emitir:
   * `enum`, `namespace`, parameter properties.
   */
           reason               ;

  constructor(reason               ) {
    super(reason);
    this.name = 'SignInError';
    this.reason = reason;
  }
}

/**
 * Uma sessão está viva enquanto o token não expirou.
 *
 * O relógio entra como argumento em vez de ser lido de dentro. Uma função que
 * chama `Date.now()` por dentro não se consegue testar à volta da meia-noite de
 * um token, e "expira daqui a uma hora" é exactamente o género de regra que
 * ninguém testa e que parte em produção.
 */
export function isLive(session               , now      )          {
  const t = Date.parse(session.expiresAt);
  if (Number.isNaN(t)) {
    throw new Error(
      `expiresAt não é uma marca temporal válida: ${session.expiresAt}`,
    );
  }
  return t > now.getTime();
}

/**
 * Quanto tempo falta, em segundos. Negativo se já expirou.
 *
 * Serve para a app renovar antes de partir a meio de um ecrã, em vez de esperar
 * por um 401 no pior momento possível — que numa app de viagens é o cliente a
 * abrir os documentos no balcão do check-in.
 */
export function secondsLeft(session               , now      )         {
  return Math.round((Date.parse(session.expiresAt) - now.getTime()) / 1000);
}

/**
 * Uma sessão só serve para as viagens que o backend lhe deu.
 *
 * A app pergunta isto antes de ir buscar uma viagem, para não pedir o que sabe
 * que não pode ter. **Isto não é a autorização** — a autorização é do backend,
 * que a repete sempre e não confia em nada que venha do telemóvel. É higiene de
 * interface: não mostrar um ecrã que vai dar erro.
 */
export function canSee(session               , journeyId        )          {
  return session.journeyIds.includes(journeyId);
}

/**
 * Palavras que nunca podem aparecer numa sessão desta app.
 *
 * Exportado para o teste e para o `tools/fronteira-tide.mjs` usarem a mesma
 * lista. Duas listas iguais em sítios diferentes divergem — é o defeito que
 * este projecto já corrigiu com os números dos testes.
 */
export const PALAVRAS_PROIBIDAS = [
  'tenantApiKey',
  'tenant_api_key',
  'serviceToken',
  'operatorPassword',
  'tidesoftware.be',
  '/api/web/client/',
  '/api/account/signin',
]         ;

/**
 * Recusa uma sessão que traga qualquer coisa da TIDE agarrada.
 *
 * Chamada no `signIn` do mock e pensada para ser chamada também pelo cliente
 * HTTP a sério no dia em que existir. Se um dia o backend começar a devolver o
 * service token "por conveniência", isto parte de imediato em vez de o token
 * ficar guardado no telemóvel de toda a gente durante meses.
 */
export function assertSemCredenciaisTide(session         )       {
  const texto = JSON.stringify(session ?? {});
  for (const palavra of PALAVRAS_PROIBIDAS) {
    if (texto.includes(palavra)) {
      throw new Error(
        `A sessão do cliente traz "${palavra}". Credenciais e rotas da TIDE ` +
          `não podem chegar à app — ver src/services/client-session.ts.`,
      );
    }
  }
}

/** Credenciais do cliente de demonstração. Não abrem nada em lado nenhum. */
const DEMO_EMAIL = 'cliente@exemplo.pt';
const DEMO_PASSWORD = 'demo-nhcs';

export function createMockClientSessionService(
  options              = {},
)                       {
  const latencyMs = options.latencyMs ?? 380;
  const ttl = options.tokenTtlSeconds ?? 3600;
  const now = options.now ?? (() => new Date());

  let sessao                       = null;
  let tentativasFalhadas = 0;

  return {
    async signIn(email, password) {
      if (latencyMs > 0) {
        await new Promise((r) => setTimeout(r, latencyMs));
      }

      /* Cinco tentativas. A app conta as suas para não martelar o backend; o
         backend conta as dele e é o dele que vale. Contar só de um lado é contar
         só para quem usa a app como ela foi feita. */
      if (tentativasFalhadas >= 5) {
        throw new SignInError('rate-limited');
      }

      const ok =
        email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

      if (!ok) {
        tentativasFalhadas += 1;
        /* Uma só razão para email errado e para password errada. Distinguir os
           dois diz a quem tenta que aquele email existe, e isso é meia
           credencial oferecida de graça. */
        throw new SignInError('invalid-credentials');
      }

      tentativasFalhadas = 0;
      const nova                = {
        clientId: 'nhcs-cliente-demo',
        firstName: 'Rodrigo',
        accessToken: 'demo-nao-serve-para-nada',
        expiresAt: new Date(now().getTime() + ttl * 1000).toISOString(),
        /* Eram `['maldives-2026']`, um id que nenhuma viagem tem: a viagem do
           mock chama-se `nhcs-demo-maldivas`. Ninguém deu por isso porque o
           `canSee` ainda não era usado por nenhum ecrã — passou a ser, no
           separador Journeys, e com o id antigo a lista ficava vazia. */
        journeyIds: ['nhcs-demo-maldivas', 'nhcs-demo-nova-iorque', 'nhcs-demo-dubai'],
      };
      assertSemCredenciaisTide(nova);
      sessao = nova;
      return nova;
    },

    current() {
      if (!sessao) return null;
      /* Uma sessão expirada é o mesmo que não haver sessão. Devolvê-la e deixar
         os ecrãs descobrirem sozinhos no primeiro 401 é como se perde o cliente
         a meio de um ecrã. */
      if (!isLive(sessao, now())) {
        sessao = null;
        return null;
      }
      return sessao;
    },

    signOut() {
      sessao = null;
    },
  };
}
