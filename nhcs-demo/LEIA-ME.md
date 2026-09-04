# Não editar esta pasta

É uma cópia gerada de `Documents/NHCS/App/demo`, feita por
`tools/sincronizar-nhcs.sh`. Existe porque o Cloudflare só clona este
repositório quando constrói o site.

Dentro dela, `src/*.js` é ainda mais gerado do que o resto: é o TypeScript da
app (`app/src/journey.ts`, `mock.ts`, `services/concierge-service.ts`) com os
tipos retirados, para o browser correr o mesmo código que o telemóvel corre.

Para mudar alguma coisa:

- comportamento, textos, datas → muda o TypeScript da app e corre
  `node tools/gerar-demo.mjs` lá;
- desenho da página → muda `demo/estilo.css` ou `demo/vista.js` lá;

e depois volta a correr `./tools/sincronizar-nhcs.sh` aqui.

O `verificar.sh` compara as duas cópias e recusa publicar se divergirem.
