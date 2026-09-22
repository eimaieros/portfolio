/* GERADO — NÃO EDITAR.
 * Origem: app/src/carteira.ts
 * Gerado por tools/gerar-demo.mjs a partir do TypeScript da app, com os tipos
 * retirados. Para mudar o comportamento, muda o TypeScript e volta a correr:
 *     node tools/gerar-demo.mjs
 */
/**
 * "My Documents" do Draft1: vouchers e documentos fiscais, por categoria.
 *
 * A carteira que existe (`services/document-repository.ts`) é sobre poder
 * embarcar: passaportes, vistos, validades, o que falta entregar. O Draft1 pede
 * outra coisa ao lado dessa — os documentos **de cada serviço reservado**,
 * separados em seis categorias (voos, transfers, hotéis, atividades, outros,
 * concierge) e em dois tipos: o voucher, que se mostra a quem presta o serviço,
 * e o documento fiscal, que é a fatura que a TIDE emite.
 *
 * Os documentos de identidade não entram aqui: pertencem ao viajante e não a um
 * serviço, e o Draft1 põe-nos em "My Personal Information".
 */

/** As seis, pela ordem e com a numeração do Draft1 ("01. Flights Tkt", …). */
export const CATEGORIAS                                                    = [
  { id: 'voos', rotulo: 'Bilhetes de avião' },
  { id: 'transfers', rotulo: 'Transfers' },
  { id: 'hoteis', rotulo: 'Hotéis' },
  { id: 'atividades', rotulo: 'Atividades' },
  { id: 'outros', rotulo: 'Outros' },
  { id: 'concierge', rotulo: 'Serviços de concierge' },
];

/** As seis categorias, sempre as seis e pela mesma ordem, cada uma com os seus documentos. */
export function agruparPorCategoria(documentos                      )                    {
  return CATEGORIAS.map(({ id, rotulo }) => ({
    id,
    rotulo,
    vouchers: documentos.filter((d) => d.categoria === id && d.tipo === 'voucher'),
    fiscais: documentos.filter((d) => d.categoria === id && d.tipo === 'fiscal'),
  }));
}

/** Documentos de serviço da viagem das Maldivas. Localizadores ilustrativos. */
export const DOCUMENTOS_DE_SERVICO_DEMO                       = [
  { id: 'v-voo', categoria: 'voos', tipo: 'voucher', titulo: 'Bilhete eletrónico · EK091', referencia: 'XVFGTR', emitidoPor: 'Emirates', estado: 'disponivel' },
  { id: 'v-hidro', categoria: 'transfers', tipo: 'voucher', titulo: 'Hidroavião privado', referencia: 'ABCDEF', emitidoPor: 'Resort', estado: 'disponivel' },
  { id: 'v-hotel', categoria: 'hoteis', tipo: 'voucher', titulo: 'Voucher de hotel · 9 noites', referencia: '123ACB456DEF', emitidoPor: 'NHCS', estado: 'disponivel' },
  { id: 'v-spa', categoria: 'atividades', tipo: 'voucher', titulo: 'Spa · Ocean Ritual', referencia: 'BGVFCDX', emitidoPor: 'Resort', estado: 'disponivel' },
  { id: 'v-seguro', categoria: 'outros', tipo: 'voucher', titulo: 'Seguro de viagem', referencia: 'SEG-0192', emitidoPor: 'Seguradora', estado: 'disponivel' },
  { id: 'v-lounge', categoria: 'concierge', tipo: 'voucher', titulo: 'Lounge VIP e assistência à chegada', referencia: 'NHCS-VIP-01', emitidoPor: 'NHCS', estado: 'disponivel' },
  { id: 'f-voo', categoria: 'voos', tipo: 'fiscal', titulo: 'Fatura · voos', referencia: 'FT 2026/1184', emitidoPor: 'TIDE', estado: 'disponivel' },
  { id: 'f-hotel', categoria: 'hoteis', tipo: 'fiscal', titulo: 'Fatura · alojamento', referencia: '—', emitidoPor: 'TIDE', estado: 'por-emitir' },
];
