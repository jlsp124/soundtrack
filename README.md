# My Personal Soundtrack Project - V2

Cinematic single-page website for CLE 10 using vanilla HTML/CSS/JS with GSAP ScrollTrigger horizontal storytelling.

## Project structure

```text
/site
  index.html
  styles.css
  script.js
  README.md
  /assets
    README_ASSETS.txt
    ...image files
```

## Run locally

1. Open the folder in VS Code.
2. Start Live Server on `site/index.html`.
3. Test desktop + mobile breakpoints.
4. Test with reduced motion enabled in OS/browser settings.

## Deploy to GitHub Pages

### Option A (recommended for `/site` folder): GitHub Actions

Create `.github/workflows/pages.yml`:

```yaml
name: Deploy static site

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then set `Settings > Pages > Source` to `GitHub Actions`.

### Option B

If you want branch deployment without Actions, move `site/*` to repo root or `/docs`.

## Where to put images

Put all images inside `site/assets/`.

Reference list and recommended sizes are documented in:
- `site/assets/README_ASSETS.txt`

## Horizontal scrolling setup (how it works)

- `script.js` pins `#horizontalShell`.
- `#horizontalTrack` translates on X while user scrolls down.
- Each panel is `100vw`; selected hero panels use `120vw` (`.panel-wide`).
- ScrollTrigger `snap` is enabled with custom points for gentle panel-to-panel snapping.
- Lenis smooth scrolling runs only when:
  - browser supports it,
  - reduced motion is not active,
  - `body[data-lenis]` is not set to `off`.

## Tuning guide

### Panel widths

File: `site/styles.css`

- Base panel width:
  - `.panel { width: 100vw; flex: 0 0 100vw; }`
- Wide hero panels:
  - `.panel-wide { width: 120vw; flex: 0 0 120vw; }`

Change these values to alter reveal pacing.

### Scroll length and smoothness

File: `site/script.js`

- Total horizontal distance:
  - `getDistance()`
- Scrub feel:
  - `scrub: 0.88` in the master ScrollTrigger
- Snap behavior:
  - `snap.duration` and `snapTo` in the master ScrollTrigger

### Lenis toggle

File: `site/index.html`

- Current:
  - `<body data-lenis="on">`
- Disable Lenis:
  - set `data-lenis="off"`

## Accessibility

- `prefers-reduced-motion` is supported.
- In reduced motion mode:
  - heavy animations are disabled,
  - horizontal layout falls back to vertical stacked panels,
  - Spotify panels remain usable.

## Included required embeds

- Good Morning clean (non-explicit) embed at panel P3.
- Take Five embed at panel P10.
- Mobile mode uses collapsible "Listen on Spotify" buttons.
