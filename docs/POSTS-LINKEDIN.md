# Os posts do LinkedIn, como deviam estar

> **Há dois ficheiros com este nome.** Este é o texto dos posts **publicados**,
> com os números que eles afirmam. O outro — `docs/linkedin/POSTS-LINKEDIN.md` —
> é o plano dos cinco posts e o estado de cada um. Desde 10 de setembro de 2026
> o `tools/numeros-publicos.py` lê os dois: procura `POSTS-LINKEDIN*.md` em
> `docs/` inteiro em vez de um caminho fixo, porque durante semanas leu só este
> e os seis números do outro não eram comparados com nada.

Este ficheiro existe por um motivo: **o `tools/numeros-publicos.py` procurava-o
e ele não existia.** O guarda que devia manter os posts honestos nunca teve nada
para ler, e por isso ninguém deu por os números terem envelhecido — o post do
framebudget dava um tamanho e uma contagem de testes de agosto, e o do glaze
idem, quando os reais são 11.7 KB / 58 e 17.2 KB / 91.

Os posts estavam certos no dia em que foram publicados. As bibliotecas cresceram
e o LinkedIn não. É o mesmo defeito de sempre, e agora tem guarda: os números
abaixo são comparados com os READMEs dos repositórios em cada corrida.

**Estado: corrigido no LinkedIn a 9 de setembro de 2026.** Os dois posts foram
editados no próprio LinkedIn e aparecem agora com a etiqueta "Editado". O que
está aqui e o que está publicado dizem o mesmo. Antes de publicar o próximo
post, escrevê-lo aqui primeiro e deixar o guarda correr.

---

## framebudget — publicado a 2 de setembro de 2026

**Linha corrigida a 09/09/2026.** É a última antes dos links, a que dá o tamanho
e a contagem de testes. Dizia um tamanho de agosto e uma contagem de testes de
agosto.

> (a frase antiga não é reproduzida aqui de propósito — o guarda deste
> repositório lê este ficheiro à procura exactamente desse padrão, e uma citação
> do erro faria o guarda apanhar-se a si próprio)

Passou a:

> 11.7 KB minified, 3.9 KB gzipped, zero dependencies, 58 tests (node:test), MIT.

O resto do post não muda. Para referência, o texto completo tal como está
publicado, já com a linha corrigida:

Every performance tool we have measures loading. Then it stops.

LCP, CLS, TTFB, INP — all of them tell you about the first two seconds. What happens over the next ninety, while someone actually scrolls through your site, is measured by nothing at all.

That is exactly where heavily animated sites fall apart, and it is why most award-winning sites score around 40 on Lighthouse.

So I built framebudget. It samples real frame timing in production, detects long tasks, and turns the animation down before the user feels the stutter — then climbs back when there is headroom.

One decision it is built on: it works in percentiles, not averages. Fifty-nine frames at 16ms and one at 400ms averages to 19ms, which looks healthy. Nobody perceives an average. They perceive the 400ms frame and call it stuttering. Smoothness lives in the tail.

The harder part was making adaptive quality stop oscillating — drop, improve, raise, degrade, drop again. Asymmetric thresholds, a dwell time, and a regret counter that makes a tier costlier to re-enter after it has already failed. The constructor refuses parameters that would guarantee a flicker.

11.7 KB minified, 3.9 KB gzipped, zero dependencies, 58 tests (node:test), MIT.

Every decision in it came out of a bug I shipped first. The library is that experience written down in a form other people can use.

---

## glaze — publicado a 6 de setembro de 2026

**Duas alterações, ambas feitas a 09/09/2026.**

**Primeira.** A última linha antes dos links, a do tamanho e dos testes, trazia
os valores de agosto. Passou a:

> 17.2 KB minified, 6.9 KB gzipped, zero dependencies, 91 tests, MIT.

**Segunda, e esta é diferente.** A frase que começa "Six times it was reported
as doing nothing while…" trazia lá um número de testes. Passou a:

> Six times it was reported as doing nothing while the whole suite passed.

**Não se trocou o número antigo por 91.** Aquela frase conta o que aconteceu num
momento concreto, e nessa altura a contagem era mesmo a que lá estava. Pôr 91
tornava-a menos verdadeira, não mais. Tirar o número resolve as duas coisas de
uma vez: a frase continua exacta e deixa de ser uma alegação que envelhece — que
é a razão pela qual este ficheiro existe.

Texto completo, já corrigido:

Scroll-driven shader effects are everywhere in award-winning design and almost nowhere in production. Not because they are hard to write.

Because every implementation I could find starts by removing your content.

The usual shape: hide the image, mount a canvas, upload the texture, draw. Between step one and step four the visitor sees a hole. On a fast laptop that gap is invisible; on a mid-range phone with a cold cache it is hundreds of milliseconds of missing content, and if the decode fails it is permanent.

glaze inverts it. The texture is uploaded first, and the element is hidden only once there is something to put in its place. No WebGPU, no adapter, a device lost mid-session, an image that will not decode, prefers-reduced-motion — every failure path ends with the original page, untouched.

That is not defensive politeness. Safari only enabled WebGPU by default in version 26, which on iOS means iOS 26 or nothing.

The part I did not expect to learn: my tests could not tell me whether any of it was visible. Six times it was reported as doing nothing while the whole suite passed. Twice the code was right and the demo was hiding it — its own stylesheet set scroll-behavior: smooth, which quartered the scroll velocity the shaders read, and its own imagery was a soft gradient, where displacing pixels returns the same gradient.

So I stopped reading code and started reading the pixels the GPU had actually written. That found a race making three GPU devices where every draw failed validation silently, and a decode() that never settles in a background tab — which no try/catch can catch, because a promise that never settles is not an error.

The suite now carries floors measured in pixels and in degrees of hue, plus a browser page that renders each effect and prints PASS or FAIL. Correctness tests cannot separate "running" from "running and invisible".

17.2 KB minified, 6.9 KB gzipped, zero dependencies, 91 tests, MIT.

---

## Regra

Um post publicado é um documento como outro qualquer: envelhece, e ninguém o
relê. Antes de publicar o próximo, escrevê-lo aqui primeiro e deixar o guarda
correr. Depois de publicar, este ficheiro é a cópia de referência — se um
número mudar num repositório, é aqui que aparece a vermelho.
