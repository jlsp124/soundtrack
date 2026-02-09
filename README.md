# My Personal Soundtrack Website

Static GitHub Pages site built with:
- `index.html`
- `styles.css`
- `script.js`
- GSAP + ScrollTrigger (CDN with fallback)
- Lenis smooth scroll (CDN with fallback)

## Run locally

1. Open the repo folder in VS Code.
2. Run Live Server on `index.html`.
3. Open desktop Chrome and test normal scroll input.
4. Confirm scrolling down moves the story horizontally.

## How horizontal mode works

The page uses a horizontal track (`#horizontalTrack`) inside a shell (`#horizontalShell`).

Primary mode (GSAP available):
- `ScrollTrigger` pins `#horizontalShell`.
- The track translates on X from `0` to `-(scrollWidth - innerWidth)`.
- Snap points are based on real panel offsets.

Fallback mode (GSAP blocked/unavailable, motion ON):
- Native horizontal engine is used.
- `maxX = max(0, track.scrollWidth - innerWidth)`.
- `shell.style.height = innerHeight + maxX`.
- On vertical scroll, JS sets `track.style.transform = translate3d(-scrollY, 0, 0)` (clamped to `maxX`).

Reduced mode (motion OFF or auto + prefers-reduced-motion):
- Panels stack vertically.
- Heavy transforms and parallax are disabled.

## Motion override

Motion can be controlled in three ways:

1. Query param (highest priority):
- `?motion=on`
- `?motion=off`
- `?motion=auto`

2. Body attribute in `index.html`:
- `<body data-motion="on">`
- `<body data-motion="off">`
- `<body data-motion="auto">`

3. Saved preference:
- Query param value is persisted in `localStorage` key `soundtrack.motion`.

Default in this repo is:
- `<body data-motion="on">`

## CDN reliability strategy

`index.html` uses a sequential loader before loading `script.js`:

- GSAP:
  - jsDelivr first
  - cdnjs fallback
- ScrollTrigger:
  - jsDelivr first
  - cdnjs fallback
- Lenis:
  - jsDelivr first
  - unpkg fallback

`script.js` is loaded only after these attempts complete.
If GSAP/ScrollTrigger still fail, native horizontal fallback mode is used automatically.

## Where to tweak feel/parallax

File: `script.js`

1. Horizontal smoothness and snap:
- `initGsapHorizontal()` -> `scrub` in master `ScrollTrigger`
- `snap.duration` range

2. Parallax intensity:
- `mediaLayers` animation (`xPercent`, `scale`)
- `parallaxItems` animation (`xPercent`, `yPercent`)
- `paperCards` drift (`yPercent`)
- `updateNativeParallax()` values for native fallback mode

3. Lenis feel:
- `initLenis()` -> `duration`, `lerp`, `wheelMultiplier`

## Reduced-motion behavior

When reduced mode is active:
- Lenis is disabled.
- GSAP horizontal engine is not used.
- Layout switches to vertical stack via `.reduced-motion` styles.
- Navigation and progress bar continue working.