/* GERADO — NÃO EDITAR.
 * Origem: app/src/services/document-repository.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */

import { documents as seed } from './mock.js';
import { parseMoment } from './journey.js';

/**
 * A carteira de viagem.
 *
 * PORQUE É QUE ISTO EXISTE
 *
 * A especificação de produto pede uma "Documents wallet" desde a V1 (§4). O
 * que existia era isto, dentro de `App.tsx`:
 *
 *     ['Bilhete de avião', 'Voucher de hotel', 'Transfer privado', 'Seguro de viagem'].map(...)
 *
 * Quatro strings. Sem dono, sem validade, sem forma de estar em falta. O
 * itinerário, as mensagens e a viagem passaram todos a ter tipo, repositório e
 * testes; a carteira ficou para trás, e é o único ecrã onde um erro tem
 * consequência física: quem chega ao aeroporto com o passaporte a caducar não
 * embarca, e não há concierge que resolva isso à porta do avião.
 *
 * A TIDE tem o backend: a colecção Postman mostra documentos na API de cliente
 * (`/api/web/client/*`). A forma da resposta continua por saber — é o que o
 * `PEDIDO-DE-INFORMACAO-TIDE.md` foi pedir. Por isso o modelo aqui é o da app e
 * a tradução faz-se no backend NHCS, exactamente como no `JourneyRepository` e
 * no `MessageRepository`.
 */

/**
 * O estado de um documento perante uma viagem concreta.
 *
 * Não é uma propriedade do documento: o mesmo passaporte está `ok` para uma
 * viagem em Novembro e `insufficient` para a mesma viagem em Março. Por isso é
 * uma função de dois argumentos e não um campo guardado.
 */

/** Estados que obrigam alguém a fazer alguma coisa antes da partida. */
const PRECISA_DE_ACCAO                            = ['missing', 'expired', 'insufficient'];

/**
 * Os documentos a que a margem do destino se aplica.
 *
 * São os de identidade. Uma fronteira exige validade extra num passaporte;
 * não exige nada de um voucher de hotel.
 */
const EXIGE_MARGEM                          = ['passport', 'visa'];

/** A janela de aviso antecipado, em dias, depois de cumprida a exigência. */
const AVISO_ANTECIPADO_DIAS = 30;

const DIA_MS = 86_400_000;

/**
 * Em que estado está este documento para esta viagem.
 *
 * A ordem das perguntas importa. "Está em falta" vem antes de "está caducado"
 * porque um documento que não existe não tem validade nenhuma para comparar, e
 * uma data em falta lida como zero punha tudo a caducado.
 */
export function documentStatus(document                , journey         )                 {
  if (!document.provided) return 'missing';
  if (!document.expiresAt) return 'ok';

  const caduca = parseMoment(document.expiresAt).epochMs;
  const regresso = parseMoment(journey.returnAt).epochMs;

  if (caduca < regresso) return 'expired';

  /* A margem exigida pelo destino só se aplica a documentos de identidade.
     Aplicá-la a tudo dizia que um seguro que acaba uma semana depois do
     regresso estava insuficiente, e não está: cobriu a viagem inteira, que é
     para o que serve. A primeira versão desta função não fazia esta distinção
     e marcava o seguro de demonstração como problema. */
  const exigido = EXIGE_MARGEM.includes(document.kind)
    ? journey.entryRequirements.passportValidityDaysAfterReturn * DIA_MS
    : 0;

  if (caduca < regresso + exigido) return 'insufficient';
  if (caduca < regresso + exigido + AVISO_ANTECIPADO_DIAS * DIA_MS) return 'expiring';

  return 'ok';
}

/**
 * Ordena pelo que precisa de acção, não por tipo nem por nome.
 *
 * Mesmo princípio do `sortForReading` das mensagens: uma lista por ordem
 * alfabética põe o seguro de viagem por cima do passaporte em falta, e só um
 * dos dois impede alguém de embarcar. Dentro de cada grupo, o que caduca
 * primeiro aparece primeiro; os que não caducam ficam no fim.
 */
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

/**
 * O resumo que aparece no Início.
 *
 * Existe para o cliente não ter de abrir a carteira para saber se há problema.
 * Devolve `headline` vazio quando está tudo bem: um ecrã que diz "0 problemas"
 * é ruído, e ruído treina as pessoas a ignorar o sítio onde um dia haverá um
 * problema a sério.
 */
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

/**
 * O que dizer sobre um documento, em português, sem jargão de estado.
 *
 * O `insufficient` é o único que precisa de explicar a aritmética, porque é o
 * único contra-intuitivo: o passaporte está válido, a viagem cabe lá dentro, e
 * mesmo assim não serve. Sem a explicação, o cliente acha que a app se enganou.
 */
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
  /* Cópia própria, pela mesma razão das mensagens: o mock é partilhado por
     todos os testes e nenhum deles deve conseguir estragar o do lado. */
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
