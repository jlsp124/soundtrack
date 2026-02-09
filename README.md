# My Personal Soundtrack Website

Static GitHub Pages site built with:
- `index.html`
- `styles.css`
- `script.js`
- GSAP + ScrollTrigger (CDN)
- Lenis smooth scrolling (CDN)

## Run locally

1. Open the repo folder in VS Code.
2. Run Live Server on `index.html`.
3. Test desktop and mobile breakpoints.
4. Test reduced-motion mode in OS/browser accessibility settings.

## How horizontal scroll works

- `#horizontalShell` is pinned by ScrollTrigger.
- `#horizontalTrack` is translated on the X axis.
- User scrolls down normally; content moves horizontally through panels.
- Scroll distance is computed from:
  - `track.scrollWidth - window.innerWidth`
- Panel snap is gentle and based on real panel offsets.

## How Lenis is integrated

- Lenis runs only when:
  - reduced motion is not active,
  - `body[data-lenis]` is not `off`,
  - Lenis/GSAP/ScrollTrigger are available.
- Lenis and ScrollTrigger are synced via `lenis.on('scroll', ScrollTrigger.update)` and GSAP ticker.
- If Lenis fails or is unavailable, scrolling falls back to native browser scroll.

### Disable Lenis

Set this in `index.html`:

```html
<body data-lenis="off">
```

## Tuning scrub and snap

File: `script.js`

Inside `initHorizontal()` master ScrollTrigger:
- `scrub: 0.85` controls smoothing feel.
- `snap.duration` controls snap speed.
- `snapTo` uses `snapPoints()` (panel offsets) for panel-by-panel snapping.

## Reduced-motion behavior

- On `prefers-reduced-motion: reduce`:
  - Lenis is disabled.
  - heavy transforms/animations are disabled.
  - horizontal track falls back to vertical stacked panels.
  - navigation still jumps to each section.

## Assets

Required assets and recommended dimensions are listed in:
- `assets/README_ASSETS.txt`

Keep filenames exact for GitHub Pages compatibility.
