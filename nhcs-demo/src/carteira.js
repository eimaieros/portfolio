export const CATEGORIAS                                                    = [
  { id: 'voos', rotulo: 'Bilhetes de avião' },
  { id: 'transfers', rotulo: 'Transfers' },
  { id: 'hoteis', rotulo: 'Hotéis' },
  { id: 'atividades', rotulo: 'Atividades' },
  { id: 'outros', rotulo: 'Outros' },
  { id: 'concierge', rotulo: 'Serviços de concierge' },
];

export function agruparPorCategoria(documentos                      )                    {
  return CATEGORIAS.map(({ id, rotulo }) => ({
    id,
    rotulo,
    vouchers: documentos.filter((d) => d.categoria === id && d.tipo === 'voucher'),
    fiscais: documentos.filter((d) => d.categoria === id && d.tipo === 'fiscal'),
  }));
}

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
