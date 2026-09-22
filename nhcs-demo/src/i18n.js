export const LINGUAS                                        = [
  { id: 'pt', rotulo: 'PT' },
  { id: 'en', rotulo: 'EN' },
];

const PT = {
  'entrada.titulo': 'Vamos começar a sua viagem',
  'entrada.entrar': 'Entrar',
  'entrada.pedirAcesso': 'Pedir acesso',
  'entrada.email': 'Email',
  'entrada.password': 'Palavra-passe',
  'entrada.voltar': 'Voltar',
  'entrada.pedirAcesso.texto': 'Diga-nos o email com que fala com a NHCS. A resposta segue por email.',
  'entrada.pedirAcesso.enviar': 'Enviar pedido',
  'nav.home': 'Início',
  'nav.search': 'Pesquisa',
  'nav.journeys': 'Viagens',
  'nav.chat': 'Chat',
  'menu.titulo': 'Menu',
  'menu.pessoal': 'Os meus dados',
  'menu.familia': 'A minha família',
  'menu.pagamentos': 'Meios de pagamento',
  'menu.legal': 'Informação legal',
  'menu.notificacoes': 'Notificações',
  'menu.sair': 'Terminar sessão',
}         ;

const EN                        = {
  'entrada.titulo': "Let's start your journey",
  'entrada.entrar': 'Log in',
  'entrada.pedirAcesso': 'Request access',
  'entrada.email': 'Email',
  'entrada.password': 'Password',
  'entrada.voltar': 'Back',
  'entrada.pedirAcesso.texto': 'Tell us the email you use with NHCS. We will reply by email.',
  'entrada.pedirAcesso.enviar': 'Send request',
  'nav.home': 'Home',
  'nav.search': 'Search',
  'nav.journeys': 'Journeys',
  'nav.chat': 'Chat',
  'menu.titulo': 'Menu',
  'menu.pessoal': 'My personal information',
  'menu.familia': 'My family',
  'menu.pagamentos': 'Payment methods',
  'menu.legal': 'Legal information',
  'menu.notificacoes': 'Notifications',
  'menu.sair': 'Sign out',
};

export const DICIONARIOS                                        = { pt: PT, en: EN };

export function t(chave       , lingua         = 'pt')         {
  return DICIONARIOS[lingua][chave] ?? DICIONARIOS.pt[chave];
}
