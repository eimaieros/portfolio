/**
 * Onde vai o tempo de arranque deste site. Cola isto na consola, no site a sério.
 *
 * PORQUE É QUE ISTO EXISTE.
 *
 * O PERFORMANCE.md afirmou durante meses que o custo era o parse dos 589 KB do
 * Three.js. Nunca ninguém o cronometrou. São 26 ms num total de 4242 ms de
 * blocking time — e a correcção que essa afirmação recomendava (reescrever o
 * fundo em WebGL cru) teria removido esses 26 ms e deixado intactos os 228 ms
 * do shader, que é onde o tempo estava.
 *
 * Não foi má fé. Foi uma história plausível sobre um número grande e visível,
 * sem instrumento por trás. Este é o instrumento.
 *
 *   1. Abre https://rodrigofigueiredo.dev  numa JANELA NOVA
 *   2. Cola isto na consola
 *   3. Espera pela tabela
 *
 * LÊ ISTO ANTES DE ACREDITARES NO QUE SAIR.
 *
 * "Janela nova" não é cerimónia. Correr isto duas vezes na mesma sessão dá
 * números do GPU três a cinco vezes diferentes — na segunda medição o primeiro
 * contexto passou de 165 ms para 50 ms e o shader do fundo de 228 ms para
 * 33 ms, sem que nada tivesse mudado no site. O que mudou foi o cache de
 * shaders do driver e o processo do GPU, que ficaram quentes com a primeira
 * medição. Esta ferramenta aquece aquilo que está a medir.
 *
 * A leitura fria é a que interessa: é a que um visitante novo paga e a que o
 * Lighthouse vê. A quente serve para uma coisa só — saber quanto é cache.
 *
 * O que se mantém entre execuções é a razão, e é essa que sustenta o
 * PERFORMANCE.md: o parse das bibliotecas fica nas dezenas de milissegundos
 * (26,1 e depois 25,7 para o Three.js) enquanto o blocking time fica nos
 * milhares (4242 e depois 7688). Tudo nesta página se mexe; aquilo não.
 */
(async () => {
  const ms = (f) => { const a = performance.now(); const r = f(); return [Math.round((performance.now() - a) * 10) / 10, r]; };
  const out = {};

  /* ── 1. o que a navegação já registou ──────────────────────────────────── */
  const nav = performance.getEntriesByType('navigation')[0];
  const scripts = performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'script');
  out.navegacao = {
    htmlPronto: Math.round(nav.responseEnd),
    ultimoScriptChegou: scripts.length ? Math.round(Math.max(...scripts.map((s) => s.responseEnd))) : null,
    domInteractive: Math.round(nav.domInteractive),
    load: Math.round(nav.loadEventEnd),
  };

  /* ── 2. total blocking time, das tarefas longas que o browser guardou ──── */
  out.totalBlockingTime = await new Promise((res) => {
    const t = [];
    const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) t.push(e.duration); });
    try { po.observe({ type: 'longtask', buffered: true }); } catch { return res('longtask nao suportado'); }
    setTimeout(() => { po.disconnect(); res(Math.round(t.reduce((s, d) => s + Math.max(0, d - 50), 0))); }, 500);
  });

  /* ── 3. quanto custa MESMO avaliar cada biblioteca ─────────────────────────
     Num iframe limpo, do zero, três vezes, e fica-se com a mediana. A primeira
     amostra costuma ser a pior e não é a representativa. */
  const avaliar = async (url, vezes = 3) => {
    const src = await fetch(url).then((r) => r.text());
    const am = [];
    for (let i = 0; i < vezes; i++) {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.appendChild(f);
      const s = f.contentDocument.createElement('script');
      s.textContent = src;
      am.push(ms(() => f.contentDocument.body.appendChild(s))[0]);
      f.remove();
    }
    am.sort((a, b) => a - b);
    return { kb: Math.round(new Blob([src]).size / 102.4) / 10, mediana: am[Math.floor(vezes / 2)], amostras: am };
  };
  const cdn = 'https://cdnjs.cloudflare.com/ajax/libs/';
  out.avaliarBibliotecas = {
    three: await avaliar(cdn + 'three.js/r128/three.min.js'),
    gsap: await avaliar(cdn + 'gsap/3.12.5/gsap.min.js'),
    scrollTrigger: await avaliar(cdn + 'gsap/3.12.5/ScrollTrigger.min.js'),
  };

  /* ── 4. o custo do GPU: contexto e compilação ──────────────────────────── */
  const ctx = (o) => { const c = document.createElement('canvas'); c.width = 1842; c.height = 847; return ms(() => c.getContext('webgl', o)); };
  const [tA, glA] = ctx({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  const [tB] = ctx({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const compilar = (gl, fonte) => ms(() => {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'); gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, fonte); gl.compileShader(fs);
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    gl.useProgram(pr); return gl.getProgramParameter(pr, gl.LINK_STATUS);
  })[0];
  out.gpu = {
    primeiroContexto: tA,
    segundoContexto: tB,
    // o piso: um shader que só escreve branco. Tudo acima disto é o shader a
    // fazer trabalho; isto é o preço fixo de existir um programa.
    shaderVazio: compilar(glA, 'precision highp float;void main(){gl_FragColor=vec4(1.);}'),
    placa: (() => { const e = glA.getExtension('WEBGL_debug_renderer_info'); return e ? glA.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'oculto'; })(),
  };

  /* ── 5. os shaders a sério, lidos da própria página ────────────────────── */
  if (typeof THREE !== 'undefined') {
    const html = await fetch(location.origin + '/').then((r) => r.text());
    const fontes = [...html.matchAll(/fragmentShader\s*:\s*`([\s\S]*?)`/g)].map((m) => m[1]);
    const cv = document.createElement('canvas'); cv.width = 1842; cv.height = 847;
    const R2 = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: false });
    R2.setSize(1842, 847, false);
    const cena = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    cena.add(quad);
    out.shadersDoSite = fontes.map((fs) => {
      quad.material = new THREE.ShaderMaterial({
        uniforms: { prev: { value: null }, mouse: { value: new THREE.Vector2() }, vel: { value: new THREE.Vector2() },
                    px: { value: 1 / 320 }, t: { value: 0 }, res: { value: new THREE.Vector2(1842, 847) },
                    m: { value: new THREE.Vector2() }, s: { value: 0 }, v: { value: 0 }, fluid: { value: null },
                    accCol: { value: new THREE.Color(1, .239, .121) } },
        vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: fs });
      // render + finish, senão mede-se o pedido e não o trabalho: o driver
      // adia a ligação do programa até haver um desenho que precise dele.
      return { chars: fs.length, compilarLigarDesenhar: ms(() => { R2.render(cena, cam); R2.getContext().finish(); })[0] };
    });
    R2.dispose();
  }

  /* ── 6. e os frames, em repouso ────────────────────────────────────────── */
  out.frames = await new Promise((res) => {
    const dt = []; let ant = performance.now(), n = 0;
    const passo = (t) => { dt.push(t - ant); ant = t;
      if (++n < 120) requestAnimationFrame(passo);
      else { const o = dt.sort((a, b) => a - b), p = (q) => Math.round(o[Math.floor(o.length * q)] * 10) / 10;
        res({ fpsMediano: Math.round(1000 / p(.5)), p50: p(.5), p95: p(.95), acimaDe50ms: dt.filter((x) => x > 50).length }); } };
    requestAnimationFrame(passo);
  });

  console.log(JSON.stringify(out, null, 1));
  return out;
})();
