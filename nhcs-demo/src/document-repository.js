import { documents as seed } from './mock.js';
import { parseMoment } from './journey.js';

const PRECISA_DE_ACCAO                            = ['missing', 'expired', 'insufficient'];

const EXIGE_MARGEM                          = ['passport', 'visa'];

const AVISO_ANTECIPADO_DIAS = 30;

const DIA_MS = 86_400_000;

export function documentStatus(document                , journey         )                 {
  if (!document.provided) return 'missing';
  if (!document.expiresAt) return 'ok';

  const caduca = parseMoment(document.expiresAt).epochMs;
  const regresso = parseMoment(journey.returnAt).epochMs;

  if (caduca < regresso) return 'expired';

  const exigido = EXIGE_MARGEM.includes(document.kind)
    ? journey.entryRequirements.passportValidityDaysAfterReturn * DIA_MS
    : 0;

  if (caduca < regresso + exigido) return 'insufficient';
  if (caduca < regresso + exigido + AVISO_ANTECIPADO_DIAS * DIA_MS) return 'expiring';

  return 'ok';
}

export function sortForAttention(list                  , journey         )                   {
  const rank = (d                ) => {
    const status = documentStatus(d, journey);
    if (PRECISA_DE_ACCAO.includes(status)) return 0;
    if (status === 'expiring') return 1;
    return 2;
  };
  return [...list].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    const ca = a.expiresAt ? parseMoment(a.expiresAt).epochMs : Number.POSITIVE_INFINITY;
    const cb = b.expiresAt ? parseMoment(b.expiresAt).epochMs : Number.POSITIVE_INFINITY;
    return ca - cb;
  });
}

export function walletReadiness(list                  , journey         )                  {
  let needsAction = 0;
  let warnings = 0;

  for (const document of list) {
    const status = documentStatus(document, journey);
    if (PRECISA_DE_ACCAO.includes(status)) needsAction += 1;
    else if (status === 'expiring') warnings += 1;
  }

  const headline =
    needsAction > 0
      ? needsAction === 1
        ? '1 documento precisa de atenção'
        : `${needsAction} documentos precisam de atenção`
      : warnings > 0
        ? warnings === 1
          ? '1 documento perto do limite'
          : `${warnings} documentos perto do limite`
        : '';

  return { needsAction, warnings, total: list.length, headline };
}

export function documentLabel(document                , journey         )         {
  const status = documentStatus(document, journey);
  const dias = journey.entryRequirements.passportValidityDaysAfterReturn;

  switch (status) {
    case 'missing':
      return 'Por entregar';
    case 'expired':
      return 'Caduca antes do regresso';
    case 'insufficient':
      return `Válido durante a viagem, mas o destino exige ${dias} dias de validade depois do regresso`;
    case 'expiring':
      return 'Cumpre por pouco — vale a pena renovar';
    case 'ok':
      return document.expiresAt ? 'Válido para esta viagem' : 'Sem data de validade';
  }
}

export function createMockDocumentRepository(options              = {})                     {
  const latencyMs = options.latencyMs ?? 260;

  const estado                   = seed.map((d) => ({ ...d }));

  return {
    async list() {
      await new Promise      ((resolve) => setTimeout(resolve, latencyMs));
      if (options.failWith) throw new Error(options.failWith);
      return estado.map((d) => ({ ...d }));
    },
  };
}

export const documentRepository = createMockDocumentRepository();
