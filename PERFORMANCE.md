# Why this site scores 58 on desktop and 66–71 on mobile

Seven runs per profile, on the GitHub runner. Latest:
[CI #23](https://github.com/eimaieros/portfolio/actions/runs/33556805963),
1 September 2026.

| | Desktop | Mobile |
|---|---:|---:|
| **Performance** | **59** | **65** |
| Accessibility | **100** | **100** |
| Best practices | **100** | **100** |
| SEO | 100 | 100 |
| First contentful paint | 0.7 s | 2.4 s |
| Largest contentful paint | 0.7 s | 2.7 s |
| Cumulative layout shift | 0.074 | 0.006 |
| Total blocking time | 2,050 ms | 1,670 ms |

Before the mobile work this page scored 40 with a 7.1 s LCP. Showing the real
hero without a loader on touch devices, drawing decorative WebGL only during
interaction, and capping its touch resolution and frame rate is what moved it.
That is a large, real win, and the reports for every stage are linked below —
including the run that failed.

## What the numbers do in CI, and why they differ

Medians of the same page, on the same runner, with nothing between the readings
that touches the render path:

| Samples | Desktop | Mobile |
|---|---:|---:|
| 3 | 54 | 68 |
| 7 | 58 | 71 |
| 7 | 58 | 66 |

**Desktop repeats exactly at seven samples**, so it keeps a hard floor of 0.55
in `lighthouserc.json` — three points under the median, rising when the median
rises, and never lowered to make a run green.

**Mobile does not repeat**: two seven-run medians five points apart. Fifteen
runs would cost twenty minutes a push and narrow that interval rather than close
it. So `lighthouserc.mobile.json` makes performance a **warning**. The number is
still measured seven times and still printed into every run summary; it just
stops failing a build it cannot reliably judge.

That is the honest version of a floor which would otherwise be lowered every few
pushes. A check that goes red at random gets ignored, and an ignored check is
worse than an absent one because it still looks like coverage. The day seven
runs land within two points of each other, it goes back to being an error.

**What still hard-fails on mobile** is what measured stably across every run:
accessibility 96, SEO 100, layout shift 0.002–0.006. None of them near their
limits, which is the point — they fail only when something real breaks.

The same error existed one metric down and had to go too: mobile FCP was
asserted at 1.5 s from a run that measured 1.02 s, and the next run measured
2.4 s and failed on it. A ceiling set from one lucky reading is the performance
floor's mistake in miniature. The paint bounds now sit far enough out to catch a
regression rather than an afternoon.

### The floors have moved down once, and the reason matters

0.58 → 0.55 and 0.75 → 0.68, when the sample count went from three to seven. The
page did not change; the estimate of it did, and three samples of a metric that
spread 38 to 60 inside a single audit is a biased estimator.

A floor moves down for that reason and no other. Not because a run was
inconvenient. The test for telling those apart is whether the page changed or
the measurement did — worth applying honestly, because the second is easy to
dress up as the first.

### The path was not monotonic

Audit run
[33354855915](https://github.com/eimaieros/portfolio/actions/runs/33354855915)
held desktop at 59 and scored 35–36 on mobile: every trace waited 2.45–2.51 s
for first paint and blocked for 12.76–14.84 s. The 0.38 ratchet in force at the
time failed correctly and was not lowered. The next run reached 44–46 by
stopping idle touch rendering; the pass after that removed the touch loader.
That failed run is kept on purpose — it is the evidence that changed the code.

## The same page, measured in a browser

The investigation below was run on the live site in Chrome, on a machine with
32 cores and an AMD Radeon 610M — much faster than the CI runner, which is why
its blocking time is 4242 ms rather than 8370. `tools/medir-arranque.js`
reproduces every figure.

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

**Typeface loading no longer decides mobile first paint.** The third-party
libraries are deferred and the large inline module yields a rendering
opportunity after `DOMContentLoaded`, once those scripts have executed. On a
coarse pointer the loader is not rendered at all: the real hero and native
scrolling are available for that first paint, then the page enhances. Desktop
keeps the entrance, with a 1.5 s ceiling on font loading.

**A touch screen at rest no longer drives the GPU continuously.** Coarse-pointer
devices render the decorative layer at at most 15 fps while scrolling or being
touched, cap its pixel ratio at 1, and keep the last canvas frame after 1.2 s of
inactivity. The effect resumes on the next interaction. Desktop pointer motion
keeps the 30 fps path.

**The WebGL support check no longer creates a WebGL context.** `getContext()`
is an allocation, not a boolean feature query: the WebGL specification creates
a context and drawing buffer when it succeeds. The old check did that on a
detached canvas, discarded it, and then asked Three.js for the real context.
The page now uses constructor presence only as a cheap hint and treats the one
real `WebGLRenderer` construction as the capability test, inside `try/catch`.
This removes one full context allocation and its context-limit pressure. The
static audit fails if a throwaway `getContext('webgl')` probe returns.

## What is left, honestly costed

### 0. framebudget — done

`framebudget` is published from the repository next to this one, its README
describes it as measuring real frame timing and dropping animation quality
before anyone perceives a stutter, and it is item **04** in the work list on
this page. Until the end of 27 August it was not loaded here: nine mentions of
the word in `site/index.html`, every one a link, a case-study title or a
comment.

What stood in for it was a single line — when the stage scrolled into view, the
background's pixel ratio dropped from 1.5 to 1. A reasonable guess driven by
scroll position, which does not know whether the machine is coping. That gap
between guessing and measuring is the entire premise of the library.

The tier now sets the ceiling: 1.5 at `full`, 1 at `reduced`, 0.75 at
`minimal`. The library is fed from the GSAP ticker the site already runs rather
than starting a second `requestAnimationFrame` loop, which is what its own
README recommends. While the tier is still null — module not loaded yet, import
failed, `prefers-reduced-motion` — the old scroll heuristic applies, so none of
those paths can break the page.

It imports the vendored copy at `/framebudget/src/index.js`, the same build the
demo runs, which step 7 of `verificar.sh` diffs against `../framebudget` on
every push. It cannot quietly drift onto a stale copy.

### 1. Defer the fluid simulation — implemented

The ping-pong fluid layer reacts to the cursor. Its shader costs 49.6 ms to
compile and it is doing nothing until the pointer moves. It now starts on first
pointer movement. Until then `hasFluid=0`, so the background takes its neutral
branch and the render targets, simulation scene and shader do not exist.

The initializer is one-shot and failure-safe: unsupported allocation restores
the neutral branch and cannot repeatedly retry in the animation loop. The old
Lighthouse floors remained unchanged. The next run exposed a larger,
independent paint problem instead of justifying an invented gain.

### 2. Compile the background shader without blocking — up to 228 ms, medium risk

`KHR_parallel_shader_compile` lets the driver link off-thread; you poll
`COMPLETION_STATUS_KHR` and draw when it is ready. Three.js r128 does not use
it. Doing it by hand means holding the first frames back until the program is
linked, which is a visible behaviour change on the first thing anyone sees.

### 3. Rewrite the background in raw WebGL — about 26 ms

Kept on the list only so that nobody proposes it again. It removes the Three.js
parse and keeps the context creation and the shader compile, which are the
actual costs. The previous version of this page recommended it as the big win.

### 3b. Break the initializer into more than one task — likely the largest win left

Measured on the published site, 3 September 2026, with a `PerformanceObserver`
on `longtask` and `buffered: true`, so the tasks from the load itself are
included rather than only those after the observer was attached:

| task | duration |
|---|---:|
| module initialization | **479 ms** |
| immediately before it | 113 ms |
| two later | 75 ms, 64 ms |
| total | 731 ms across four tasks |

Total blocking time is the sum of each task's duration *above* 50 ms — here
about 531 ms. Almost all of it is one task. Everything the module does runs
inside a single `DOMContentLoaded → rAF → setTimeout` callback: the guards, then
every `safe()` subsystem in sequence, with no yield between them. The browser
cannot respond to anything for 479 ms because there is no gap to respond in.

Splitting that one task into five of roughly 95 ms would take its contribution
from 429 ms to about 225 ms, without making the page do a single thing less. The
work is not the yielding — it is that the `safe()` calls share `const` bindings
declared in module order, so deferring a subsystem means deciding what it
depends on. That is a real refactor of the initialization, not a sprinkling of
`await`, and it should be done with the Lighthouse floors watching.

**Caveat on the reading, because it changes what it is worth.** The tab was
hidden when the page loaded and was made visible afterwards, so the whole module
started around 9 s in rather than immediately — `requestAnimationFrame` does not
fire in a background tab, and the initializer is behind one. The *shape* (one
dominant task) is trustworthy; the absolute 479 ms is from a warm shader cache
and a delayed start, and should be re-measured on a normal foreground load
before anyone quotes it.

### 3c. Speed index is 7.5 s on desktop and 2.7 s on mobile — untested cause

Every CI run since the reporter started printing it: desktop speed index sits
between 7.4 s and 7.9 s while FCP and LCP are 0.6–0.8 s. The content paints
almost immediately and then the page keeps changing for another seven seconds.
Speed index is 10% of the performance score, so this is not a rounding error.

Mobile, the same page, reads 2.5–2.7 s. On touch the site shows the real hero
without a loader and draws decorative WebGL only during interaction, which makes
the difference *suggestive* — but the two profiles use different viewports and
different CPU throttling, so speed index is not comparable across them. It is a
hint, not a measurement, and it is written here as a hint.

Two candidates, and nothing here separates them:

1. **The desktop loader.** It counts up and fills a dot grid for several
   seconds. Visual completeness cannot arrive until it is gone.
2. **The background.** A shader that never stops moving never reaches a stable
   frame, and speed index measures stability.

If it is the second, there is nothing to do that is not "delete the design".
If it is the first, the loader's duration is a dial.

**The experiment that would tell them apart**, and it has not been run: take a
desktop Lighthouse run with Chrome's `--force-prefers-reduced-motion`. This page
honours that flag in five places, so the decorative motion stops while the loader
still runs. If speed index drops to the low seconds, the background was the cost;
if it stays at seven, the loader was. One run, one flag, and the answer replaces
this section.

Nobody should touch either of them before that run. This file has a section
titled "The previous version of this page was wrong" for acting on exactly this
kind of plausible story.

### 4. Ship a Three.js subset

Would save most of the 26 ms, and needs a bundler. The site's stated design is
one HTML file with no build step beyond a path-rewriting shell script. Rejected
on those grounds — and now also because there is nothing worth buying.

### 5. `defer` on the library scripts — implemented after the trace disproved us

This used to say that scripts at the end of `<body>` could not delay paint
because the HTML above them had already parsed. Run 33354855915 showed the
distinction that sentence ignored: parsed is not painted. Under the mobile
profile the browser reached the synchronous scripts before its first rendering
opportunity, and the preloader then waited for typefaces until its 2.6 s cap.

`defer` does not make Three.js cheaper and is not described as doing so. The
libraries execute in order before `DOMContentLoaded`; the large initializer
then yields one rendering opportunity before starting. Touch CSS exposes the
real page rather than the loader for that paint. Desktop still waits for its
fonts, but never for more than 1.5 seconds.

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
