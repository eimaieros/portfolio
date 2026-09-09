export class SignInError extends Error {

           reason               ;

  constructor(reason               ) {
    super(reason);
    this.name = 'SignInError';
    this.reason = reason;
  }
}

export function isLive(session               , now      )          {
  const t = Date.parse(session.expiresAt);
  if (Number.isNaN(t)) {
    throw new Error(
      `expiresAt não é uma marca temporal válida: ${session.expiresAt}`,
    );
  }
  return t > now.getTime();
}

export function secondsLeft(session               , now      )         {
  return Math.round((Date.parse(session.expiresAt) - now.getTime()) / 1000);
}

export function canSee(session               , journeyId        )          {
  return session.journeyIds.includes(journeyId);
}

export const PALAVRAS_PROIBIDAS = [
  'tenantApiKey',
  'tenant_api_key',
  'serviceToken',
  'operatorPassword',
  'tidesoftware.be',
  '/api/web/client/',
  '/api/account/signin',
]         ;

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

      if (tentativasFalhadas >= 5) {
        throw new SignInError('rate-limited');
      }

      const ok =
        email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

      if (!ok) {
        tentativasFalhadas += 1;

        throw new SignInError('invalid-credentials');
      }

      tentativasFalhadas = 0;
      const nova                = {
        clientId: 'nhcs-cliente-demo',
        firstName: 'Rodrigo',
        accessToken: 'demo-nao-serve-para-nada',
        expiresAt: new Date(now().getTime() + ttl * 1000).toISOString(),
        journeyIds: ['maldives-2026'],
      };
      assertSemCredenciaisTide(nova);
      sessao = nova;
      return nova;
    },

    current() {
      if (!sessao) return null;

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
