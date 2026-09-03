# Portfolio — Rodrigo Figueiredo

Personal portfolio for a fullstack web developer. One HTML file, no framework,
no bundler, no dependencies to install. The only build step is a shell script
that rewrites asset paths for the published layout.

[![CI](https://github.com/eimaieros/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/eimaieros/portfolio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Live:** <https://rodrigofigueiredo.dev>

---

## Why it's built this way

A portfolio for a web developer is the work sample. If the site is slow or badly
made, it contradicts the CV — so every decision here had to survive that test.

**No framework.** The site is a single `index.html` with inline CSS and JS. React
would add a build step, a dependency tree and ~40 KB of runtime to render text
that never changes. The three libraries that *are* loaded — Three.js, GSAP,
Lenis — earn their place because hand-rolling a WebGL renderer, a scroll
choreographer and inertial scrolling is not a good use of anyone's time.

**Motion with a budget.** Capped device pixel ratio, transform-only animation,
geometry allocated once and interpolated rather than rebuilt, and full
`prefers-reduced-motion` support.

**Where that lands, measured rather than claimed.** Seven runs each: desktop
median **58**, mobile **66–71**. Accessibility 96, best practices 96, SEO 100.

Desktop repeats exactly at seven samples and holds a hard floor in CI. Mobile
does not — two seven-run medians five points apart — so its performance score
is a warning there rather than a gate, still measured and still printed into
every run summary. A check that goes red at random gets ignored, and an ignored
check is worse than an absent one. [PERFORMANCE.md](PERFORMANCE.md) has the
readings.

This paragraph said "the target here is ≥ 90" for as long as the site existed,
and the first thing that happened when Lighthouse was actually put in CI was
that the claim failed.

Blocking time is where this page is slow, and it is also the number this
repository has been worst at reporting. This paragraph said 1.0 s desktop and
1.05 s mobile while [PERFORMANCE.md](PERFORMANCE.md)'s own table two clicks away
said 2,050 ms and 1,670 ms. Three consecutive CI runs, September 3 2026, on a
page that did not change between them — one commit touched a CI reporting
script, the next touched a markdown file:

| run | desktop TBT | mobile TBT | desktop perf |
|---|---:|---:|---:|
| #27 | 1,410 ms | 1,680 ms | 57 |
| #28 | 2,040 ms | 1,730 ms | 57 |
| #29 | 2,470 ms | — | 57 |

Seven samples each. The same page, seventy-five percent apart. The performance
score sat at 57 through all of it, which is why the score is the ratchet and the
blocking time is not: a gate on a number that moves that much would go red at
random, and a check that goes red at random gets ignored. Both numbers are
printed into every run summary so the spread stays visible instead of being
averaged into a sentence.

FCP and LCP are about 0.7 s on desktop. Mobile FCP is 1.02 s, LCP 1.70 s and
CLS 0.006. Before the final audit mobile scored 40, LCP was 7.1 s and TBT was
12.2 s. What cost that score was continuous decorative GPU work and a loader
in front of the real content — not the most visible number in the repository:
589 KB of the 715 KB of JavaScript on this page is Three.js.

That number is real and it is not the cause. Three.js takes **26 ms** to parse,
compile and execute; the blocking time is in the thousands. The cost is on the
GPU, not in the parser: creating a WebGL context is 165 ms cold, and compiling
the background shader is 228 ms. Both would cost exactly the same with the
library removed.

Nobody had timed it. It was a plausible story about a big, visible number, and
it came with a recommendation — rewrite the background by hand against raw
WebGL — that would have removed 26 ms and left the 228 ms untouched.

[PERFORMANCE.md](PERFORMANCE.md) has the measurements, how far they move between
runs and why, and what remains worth doing. `tools/medir-arranque.js`
reproduces all of it in the console.

The fluid simulation is lazy: its shader and ping-pong render targets are
created on first pointer movement, not during startup. The final audit also
removed a dead scene draw and per-frame layout reads. Third-party scripts are
deferred, touch devices show the real hero without a loader, and a touch screen
at rest keeps its last frame instead of driving the GPU forever. Those changes
moved mobile performance from 40 to the mid-60s/low-70s; the repository records both the
failed intermediate run and the final reports rather than inferring a gain.
The support check also no longer creates and discards a WebGL context before
the real renderer; the static audit pins that allocation regression.

**Everything degrades.** No WebGL, no GSAP, no JavaScript at all — the content is
still readable. Each subsystem is wrapped so a failure in one never takes down
the page.

---

## What's inside

| | |
|---|---|
| Background | One fragment shader — contour field that reacts to cursor and scroll, with a ping-pong fluid simulation layered on top |
| Stage | 84 instanced meshes assembling in three phases, scroll-driven |
| Mosaic | A full-bleed image assembling from 144 tiles |
| Type | Scroll-driven sentence, masked line reveals, character scramble |
| Cursor | Custom cursor with contextual labels, and a light source that follows it across the display type |

---

## Running it

```bash
# any static server; the site is site/index.html
python3 -m http.server 5500
# → http://localhost:5500/site/index.html
```

## Building for deployment

```bash
./tools/build.sh      # produces dist/
```

`dist/` is what goes to the server. The build rewrites the asset paths
(`../assets/` → `assets/`), copies the images, and emits host configuration for
both static hosts (`_headers`, `netlify.toml`) and IIS (`web.config`). It fails
if any referenced image is missing.

## Verifying before you ship

```bash
./tools/verificar.sh
```

Runs everything: executes the page in jsdom with and without WebGL, checks for
top-level variables used before declaration, audits weight / accessibility / SEO,
scans for QA code that leaked into the published file, and builds.

---

## Tools

| Script | Purpose |
|---|---|
| `tools/verificar.sh` | all checks, in order — also what CI runs on every push |
| `tools/medir-arranque.js` | paste into the console: where the startup time actually goes |
| `tools/numeros-irmaos.py` | the figures this site quotes about framebudget and glaze match theirs |
| `tools/csp.mjs` | derive the Content-Security-Policy from the built page, hash and all |
| `tools/resumo-lighthouse.mjs` | print both Lighthouse scores into the CI log and run summary |
| `tools/build.sh` | assemble `dist/` |
| `tools/teste-casos.cjs` | open every case study and check it is complete |
| `tools/teste-titulos.js` | no case-study title breaks mid-word, at any window width |
| `tools/sincronizar-framebudget.sh` | refresh the vendored framebudget demo |
| `tools/sincronizar-glaze.sh` | refresh the vendored glaze demo |
| `tools/auditoria.py` | weight, render-blocking resources, a11y, SEO metadata |
| `tools/check-tdz.py` | top-level `const`/`let` used before declaration |
| `tools-harness.js` | run the page in jsdom, with and without WebGL |
| `tools/gerar-visuais.py` | generate the placeholder imagery |
| `tools/gerar-glaze-thumb.py` | render the glaze thumbnail by running the actual shader |
| `tools/gerar-cadence-thumb.py` | render the cadence thumbnail from the scorecard the backend actually returns |
| `tools/importar-capturas.py` | import real screenshots into the asset slots |

See also [PERFORMANCE.md](PERFORMANCE.md) — where the Lighthouse score goes.

### The pipeline runs on every push

Until August 2026 the eight checks above only ran when someone remembered to
type the command, which makes "blocks the build on regression" a promise rather
than a fact. [CI](.github/workflows/ci.yml) runs the same script on every push,
and uploads the built `dist/` as an artifact — so you can download exactly what
Cloudflare would serve and diff it against what is live.

Step 7 compares the vendored library demos against the originals in
`../framebudget` and `../glaze`. It used to skip in CI, because those are
separate repositories and were not checked out.

That hole opened almost immediately. Both libraries were changed, neither
vendored copy was re-synced, and `/framebudget/` and `/glaze/` went live
running the previous week's code — while the guard designed to catch exactly
that reported "nothing to compare" and passed. It only ever ran on one laptop,
on a command nobody had typed since.

CI checks out both siblings now and step 7 does the comparison on every push. A
check that can quietly decline to run is not a check.

A coordinated release has an order: publish `framebudget` and `glaze` first,
then publish this repository. Otherwise the portfolio workflow can start during
the few seconds in which its vendored copy is new but a sibling's `main` is
still old, and correctly report a mismatch that disappears as soon as the
library ref advances. The final audit hit that race once; the second run is the
proof that all three published trees agree.

### Why a jsdom harness for a static page

Because syntax-valid JavaScript is not the same as JavaScript that runs. Three
separate scope bugs shipped here before this existed — a `const` declared inside
a conditional block and called from outside it, which throws only when that path
is taken. The harness executes the whole module in both capability modes and
reports anything that throws. `check-tdz.py` catches the same family statically.

The case studies needed their own test on top of that. They are built in
JavaScript from an object and never exist until someone clicks a work item, so
a mistake there doesn't break the page — it breaks one panel, on the one
interaction nobody re-tests by hand. `teste-casos.cjs` opens all eight and checks
each has a title, body text, and working links.

### The bug no automated test could have caught

Four of the six case-study titles were breaking mid-word — FRAMEB / UDGET,
PERFORM / ANCE, PORTFOL / IO, CONCIER / GE — at 111px display type. Seven
characters fit; most of the titles are nine or eleven. The global
`overflow-wrap: break-word` was doing its job, keeping the text inside the
panel, but at that size the result reads as a mistake rather than a wrap.

It had been live since the case studies existed. `teste-casos.cjs` opens every
one of them and never saw it, because jsdom has no layout engine: it can tell
you the text is there, not how wide it is.

The fix sizes the display type from the longest word in the title, and needs
two upper bounds rather than one — a viewport-relative term for narrow windows,
and a `rem` term because the panel stops growing at a fixed `max-width`, so a
`vw`-only limit reintroduced the break on large monitors.

`teste-titulos.js` now reproduces the CSS arithmetic and checks every title
against the real panel width from 320px to 3840px. It reads the constants and
the titles out of `index.html` rather than keeping its own copies — a test that
stores its own duplicate of the values stops testing the file the moment
someone changes one.

### A verification script that lied

`verificar.sh` once printed **Tudo passa** while its first step was crashing.
The step was written as `node harness.js | tail -1`, and in a pipeline the exit
status belongs to the last command — `tail` always succeeds. So a harness that
couldn't even load its dependency reported success. The check most trusted to
be honest was the one silently failing. It now captures the output and reads
the real exit code.

---

## Notes on the animation code

Two rules were learned the hard way and are worth knowing before editing:

**GSAP and CSS must not write the same property.** The hero name reveal is a CSS
transition on `transform`; the mouse parallax was a GSAP tween on `x`, which
writes the whole `transform`. Moving the mouse during the 1.3 s reveal made GSAP
cache a mid-transition value and pin the name off-screen permanently. The two
systems are now separated: CSS owns the vertical, JS writes a CSS custom
property for the horizontal.

**Anything that animates *text* needs a non-rAF fallback.** `requestAnimationFrame`
is suspended in background tabs, unfocused windows and power-saving modes. A
frozen transform is a visual glitch; a frozen text animation is wrong information
on screen — the headline counters could freeze reading `0.0M`. Both text
animations now have a timer that writes the final value regardless.

---

## Structure

```
site/index.html          the site
assets/                  images (webp)
assets/case/             screenshots for the case study
framebudget-demo/        generated copy of the framebudget demo, served at /framebudget/
glaze-demo/              generated copy of the glaze demo, served at /glaze/
tools/                   build, verification, image generation
wrangler.toml            how the built folder is served
dist/                    generated by the build; never edit by hand, never committed
```

### The two duplicated folders

`framebudget-demo/` and `glaze-demo/` are copies of
[framebudget](https://github.com/eimaieros/framebudget)'s and
[glaze](https://github.com/eimaieros/glaze)'s demos and source. They exist
because Cloudflare clones only this repository when it builds, so a relative
path to a sibling folder resolves to nothing in production.

Duplicated source is exactly what the `dist/` decision above avoids, and the
difference is that these copies are checked: `verificar.sh` diffs each against
its original and refuses to pass if they differ. A copy something compares is a
copy. A copy nothing compares is a second version waiting to drift.

The comparison itself was written twice at first, once per library, and the
first version only diffed `src/` — it let a change to `demo/index.html` through
while reporting the copies identical. It is now one function called with two
arguments, because with two copies of a guard, fixing one and forgetting the
other is the likely outcome.

Regenerate with `./tools/sincronizar-framebudget.sh` or
`./tools/sincronizar-glaze.sh` after any change to the corresponding library.

---

## Licence

Code under MIT (see [`LICENSE`](LICENSE)). The written content, the imagery and
the visual design are not — [`NOTICE.md`](NOTICE.md) sets out exactly which is
which, and why the exceptions live in a separate file rather than at the bottom
of the licence.

---

## Deployment

Pushing to `main` deploys. Cloudflare Workers Builds runs `tools/build.sh`,
which assembles `dist/`, then `wrangler deploy` publishes it as a static-asset
Worker behind `rodrigofigueiredo.dev`.

`dist/` is not in the repository. It is generated, and versioning generated
output alongside its source is how the two end up disagreeing.

### The Content-Security-Policy is computed, not written

The site had no CSP. That header is what turns an injected `<script>` from a
catastrophe into a blocked request — which is the whole reason, and not the one
first written here. The first version of this section claimed a CSP was the one
audit standing between best practices' 96 and 100. That was never measured, and
it is wrong: Lighthouse's `csp-xss` audit carries weight zero. Every CI run now
prints the name of each weighted audit still failing, in all three of
accessibility, best practices and SEO, so the next such sentence has to come
from the run summary.

The site is one 112 KB inline script, so the only policy that both works and
means anything is a hash of that script's bytes. A hash typed into a file is
the defect this repository keeps removing — except that a stale bundle size is
embarrassing and a stale script hash is a white page. So
[`tools/csp.mjs`](tools/csp.mjs) derives it from `dist/index.html` after the
build has rewritten the asset paths, and the build refuses to publish if any
inline script's hash is missing from the policy it just generated.

`style-src` keeps `'unsafe-inline'` and says so: style attributes cannot be
covered by a hash. `script-src` does not, which is the half that matters.

Two things are deliberately not in the policy, and both were found by measuring
the published site rather than reading the build output:

- Cloudflare injects the Web Analytics beacon into the response, after the file
  leaves this repository. The first policy did not allow it, so analytics died
  silently — script blocked, request at zero bytes, nothing in the site's own
  console. `static.cloudflareinsights.com` and `cloudflareinsights.com` are
  allowed now.
- Cloudflare also injects a ~900-byte inline challenge-platform script whose
  content changes every request. There is no hash for that. Allowing it means
  `'unsafe-inline'`, which voids the policy, so it stays blocked and the
  client-side bot detections that depend on it do not run.

The policy is enforcing, and that was checked on the published page rather than
inferred from the build: an injected `<script>` is refused with
`disposition: "enforce"`, the loader completes, `body` unlocks, `__fbEstado()`
returns a live framebudget instance, and the scroll systems build a 22,000 px
document with no violations after startup.

Checking it is the part worth writing down. **The CSP travels with the
document**, so a page served from cache carries the header from the *previous*
deploy — on 3 September 2026 that produced two measurements that contradicted
each other and half an hour spent concluding, wrongly, that Cloudflare was
ignoring `Content-Security-Policy-Report-Only`. It was not; the browser was
answering from cache. `not_found_handling = "single-page-application"` makes the
fix free: any unused path returns the page, so opening
`/verificacao-csp-<something-new>` forces a load no cache can serve.
`tools/build.sh` carries the console snippet. `/csp-modo.txt` reports which
build is published, which is a different fact from which header the browser
received — both are worth having.
