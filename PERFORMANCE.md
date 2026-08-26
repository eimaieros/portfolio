# Why this site scores 57, and what 90 would cost

Measured 26 August 2026, desktop, on the live site and reproduced in CI.

| | |
|---|---|
| Performance | **57** |
| Accessibility | 96 |
| Best practices | 100 |
| SEO | 100 |
| First contentful paint | 0.7 s |
| Largest contentful paint | 0.7 s |
| Cumulative layout shift | 0.089 |
| Total blocking time | the problem |

The loading half is genuinely fast. Paint lands in seven hundred milliseconds
and nothing moves after it. What costs the score is the main thread being busy
afterwards, and the reason is not subtle.

## Where the JavaScript goes

| File | Minified | Share |
|---|---:|---:|
| `three.min.js` r128 | 589 KB | **82%** |
| `gsap.min.js` | 71 KB | 10% |
| `ScrollTrigger.min.js` | 42 KB | 6% |
| `lenis.min.js` | 13 KB | 2% |
| | **715 KB** | |

Plus 102 KB of inline site code, which is the part I wrote and the smallest
part of the problem.

Five-sixths of the JavaScript on this site is a 3D engine. Parsing, compiling
and executing 589 KB is most of the blocking time, and it happens on every
visit before anything is interactive.

## What Three.js is used for

Two things:

1. **The background.** A full-screen fragment shader with a ping-pong fluid
   simulation — two render targets, an orthographic camera, two full-screen
   quads. Above the fold, visible immediately.
2. **The stage.** 84 instanced meshes plus 84 wireframe clones, assembling in
   three scroll-driven phases. Far below the fold.

The second genuinely wants a 3D engine. The first does not: it is two quads and
two shaders, which is a couple of hundred lines of raw WebGL and no dependency
at all.

## The three routes to 90, honestly costed

### 1. Raw WebGL for the background, lazy Three.js for the stage

Rewrite the background against `WebGLRenderingContext` directly — quads,
framebuffers, a half-float feature test that already exists in the current
code — and load Three.js only when the stage section approaches.

That takes 589 KB off the critical path entirely, which is the only change on
this list big enough to move the score by thirty points.

Cost: a few hundred lines, and it has to be right, because the background is
the first thing anyone sees. The existing code already handles context loss and
half-float fallback, so the hard parts are understood rather than unknown.

**This is the one worth doing.**

### 2. Ship a Three.js subset

The site uses maybe fifteen exports out of several hundred. A tree-shaken
bundle would be around 150 KB instead of 589.

Cost: a bundler. The site's stated design is one HTML file with no build step
beyond a path-rewriting shell script, and adding webpack to save 400 KB trades
away the thing the README is actually about. Rejected on those grounds, not on
technical ones.

### 3. Defer the library scripts

The obvious first idea, and worth writing down as rejected so nobody spends an
afternoon on it. The four `<script>` tags sit at the very end of `<body>`, so
everything above them has already parsed and painted — that is why paint is at
0.7 s. Adding `defer` reorders execution slightly and moves no work off the main
thread, so it does not touch total blocking time. It would be churn on a live
work sample in exchange for nothing measurable.

## How this is tracked

`lighthouserc.json` asserts a floor just under the current score. It is a
ratchet: when the number goes up the floor goes up with it, and it never goes
down to make a badge green. Paint and layout shift are asserted at values the
site already meets, so a better performance score cannot be bought by making
the loading worse.

Every CI run uploads the full Lighthouse JSON as an artifact, so the
`mainthread-work-breakdown` and `bootup-time` audits are there to read without
asking PageSpeed Insights — whose free quota ran out halfway through writing
this page, which is exactly why the reports are kept.
