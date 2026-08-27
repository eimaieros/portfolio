# Why this site scores 57

Measured 27 August 2026, on the live site, in Chrome, on a machine with 32
cores and an AMD Radeon 610M. Method and raw numbers below — every figure here
came from a measurement run that day, and `tools/medir-arranque.js` reproduces
all of them.

| | |
|---|---|
| Performance | **57** |
| Accessibility | 96 |
| Best practices | 100 |
| SEO | 100 |
| First contentful paint | 0.7 s |
| Largest contentful paint | 0.7 s |
| Cumulative layout shift | 0.089 |
| Total blocking time | **4242 ms** — the problem |

Total blocking time is the noisy one: two runs on the same machine, same day,
gave 4242 ms and 7688 ms. Treat it as thousands of milliseconds rather than as
a figure with four significant digits.

---

## The previous version of this page was wrong

It said this:

> Parsing, compiling and executing 589 KB is most of the blocking time, and it
> happens on every visit before anything is interactive.

and concluded that the fix was to rewrite the background in raw WebGL so
Three.js could be loaded lazily, calling that "the only change on this list big
enough to move the score by thirty points."

Three.js takes **26 milliseconds** to parse, compile and execute. Out of 4242.

Two separate runs, hours apart, measured 26.1 ms and 25.7 ms. Total blocking
time across those same two runs was 4242 ms and 7688 ms. Almost everything about
this page moves between runs; that ratio does not.

The 589 KB was real — it is the minified size, and it is 82% of the JavaScript
on the page. Everything about that sentence was true except the part that
mattered, which was the causal claim. Nobody had timed it. It is a plausible
story about a big number, and a plausible story about a big number is exactly
what this repository keeps having to apologise for.

Worse than being wrong, it was *actionable*. The recommended fix was a few
hundred lines of hand-written WebGL on the one page that is a work sample. Had
it been done, it would have removed 26 ms and left the 228 ms shader compile
exactly where it was — because a raw WebGL background compiles the same shader.

## Where the time actually goes

Two things, and neither is JavaScript parsing.

**First, a caveat that the measurements themselves forced.** Running the tool
twice in the same browser session gave GPU numbers three to five times apart —
a first WebGL context at 165 ms and then at 50 ms, the background shader at
228 ms and then at 33 ms. Nothing changed except that the driver's shader cache
and the GPU process had gone warm. So the GPU figures below are given as
*cold → warm*, and the cold one is the one that matters: it is what a first-time
visitor pays, and what Lighthouse measures.

Writing a single number here would have been tidier and would have been the
same mistake this page exists to correct.

### WebGL context creation — 165 ms cold, ~50 ms warm, per context

Measured in a clean tab with `canvas.getContext('webgl')` and nothing else on
the page. This is driver and ANGLE initialisation; it is not something you can
make cheaper by shipping less JavaScript.

The site created **two** of them at load: one for the background, one for the
stage. The stage starts 5.8 viewports down the page.

### Shader compilation — 228 ms cold for the background, ~33 ms warm

Compile, link, and first draw, timed with a `finish()` so the GPU has actually
finished rather than merely accepted the request. For reference, a fragment
shader that does nothing but write white costs **27.8 ms cold** to compile and
link on this machine — that is the fixed price of a program existing, before it
does any work of its own.

The fluid simulation shader measured 50 ms and 79 ms across the two runs, which
is a useful reminder of how noisy this is at the small end.

The background fragment shader is 3031 characters of contour field, fluid
sampling, vignette and film grain. It costs what it costs, and it would cost
the same written by hand against the raw API.

### And what does *not* cost anything

Measured, because guessing is how this page went wrong the first time:

| | |
|---|---:|
| three.min.js — parse, compile, execute (589 KB) | **26 ms** |
| gsap.min.js (70 KB) | 5—6 ms |
| ScrollTrigger.min.js (42 KB) | 1.1 ms |
| Two 320×320 half-float render targets | 0.3 ms |
| Stage: 84 instanced meshes + 84 wireframe clones | 2.2 ms |
| Ground plane `EdgesGeometry` | 22.7 ms |
| Mosaic: drawing all 144 tiles | 1.3 ms |
| `ScrollTrigger.refresh()` across all 59 triggers | 1.4 ms |
| Full document layout (609 DOM nodes) | < 1 ms |

The DOM is small, the geometry is cheap, the mosaic is free. The library sizes
are the most visible number on the page and the least important one.

### The frame rate is fine

63 fps median at rest, p95 at 33.8 ms, one frame over 50 ms in 120. The long
tasks that trail through the load are transient — image decode, font swap,
scroll setup — not a permanently janky render loop. Worth writing down, because
the long-task timeline *looks* like a broken loop until you measure the frames.

---

## What was changed

**The stage's WebGL context is no longer created at load.** It is created when
the stage comes within 2.5 viewports, which on this page means after about
three screens of scrolling. Visits that never reach it never pay for it.

Two margins rather than one, on purpose: the render margin stays at 200 px, and
the *preparation* margin is 2.5 viewports. Creating the context costs 156 ms and
a scroll does not have 156 ms to spare — trading half a second of startup for a
stutter at the exact moment someone arrives at the stage would be moving the
problem, not fixing it.

Expected effect on TBT: −156 ms on this hardware. Under Lighthouse's mobile
profile, which applies a 4× CPU slowdown, proportionally more.

## What is left, honestly costed

### 0. This site does not use framebudget

Worth saying first because it is the most awkward item on the list.
`framebudget` is published from the repository next to this one, its README
describes it as measuring real frame timing in production and dropping
animation quality before anyone perceives a stutter, and it is item **04** in
the work list on this very page.

It is not loaded here. Nine mentions of the word in `site/index.html`, and every
one of them is a link, a case-study title or a comment.

What the site does instead is a hand-rolled version of the same idea, at line
2882: when the stage becomes visible, the background's pixel ratio drops from
1.5 to 1. One binary switch, triggered by scroll position rather than by
measured frame cost — which is precisely the thing the library exists to replace,
because scroll position does not know whether the machine is coping.

Not done yet, and the reason is the same discipline as the rest of this page:
wiring in an adaptive quality system changes what the page renders, and I have
no way to look at the result before it is live. Shipping an unverifiable
rendering change to a work sample, immediately after writing a document about
having twice acted on an unverified claim, would be the joke writing itself.

It needs one session with the site open in a browser. The design is not in
doubt — replace the binary pixel-ratio switch with the library's tier signal
and let `PIECES`, the fluid simulation and the pixel ratio follow it.

### 1. Defer the fluid simulation — about 50 ms, low risk

The ping-pong fluid layer reacts to the cursor. Its shader costs 49.6 ms to
compile and it is doing nothing until the pointer moves. Starting it on first
pointer movement, with the background sampling a neutral texture until then, is
a contained change. It is not done yet because the background shader samples the
fluid target every frame and the fallback path needs writing carefully.

### 2. Compile the background shader without blocking — up to 228 ms, medium risk

`KHR_parallel_shader_compile` lets the driver link off-thread; you poll
`COMPLETION_STATUS_KHR` and draw when it is ready. Three.js r128 does not use
it. Doing it by hand means holding the first frames back until the program is
linked, which is a visible behaviour change on the first thing anyone sees.

### 3. Rewrite the background in raw WebGL — about 26 ms

Kept on the list only so that nobody proposes it again. It removes the Three.js
parse and keeps the context creation and the shader compile, which are the
actual costs. The previous version of this page recommended it as the big win.

### 4. Ship a Three.js subset

Would save most of the 26 ms, and needs a bundler. The site's stated design is
one HTML file with no build step beyond a path-rewriting shell script. Rejected
on those grounds — and now also because there is nothing worth buying.

### 5. `defer` on the library scripts — nothing

Rejected before and still rejected. The four `<script>` tags sit at the end of
`<body>`, so everything above them has already parsed and painted, which is why
paint lands at 0.7 s. `defer` moves no work off the main thread.

---

## How this is tracked

`lighthouserc.json` asserts a floor just under the current score, as a ratchet:
when the number goes up the floor goes up with it, and it never goes down to
make a badge green. Paint and layout shift are asserted at values the site
already meets, so a better performance score cannot be bought by making the
loading worse.

Every CI run now prints both scores — desktop and mobile — into the job log and
the run summary, via `tools/resumo-lighthouse.mjs`. Before that, a green run
said "All results processed!" and no number at all, which is how a score is
allowed to drift for months.

`tools/medir-arranque.js` reproduces every measurement on this page. Paste it
into the console on the live site. If a number here is ever questioned, the
answer should be a re-run and not an argument.
