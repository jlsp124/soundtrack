# My Personal Soundtrack Project (CLE 10)

Single-page, horizontal-scrolling narrative website built with vanilla HTML/CSS/JS + GSAP ScrollTrigger.

## Project structure

```text
/site
  index.html
  styles.css
  script.js
  README.md
  /assets
```

## Local run (VSCode Live Server)

1. Open this folder in VSCode.
2. Right-click `site/index.html`.
3. Click `Open with Live Server`.
4. Test both desktop and mobile viewport sizes.

## Deploy to GitHub Pages (no build step)

GitHub Pages branch settings only allow `/` or `/docs`, so for this `/site` structure use GitHub Actions:

1. Push this project to GitHub.
2. In your repo, create `.github/workflows/pages.yml` with this content:

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

3. Go to `Settings > Pages` and set source to `GitHub Actions`.
4. Push to `main` and wait for deployment.

## Asset checklist (exact filenames)

Place these in `site/assets/`:

### Backgrounds
- `gm_hero.webp` (recommended 2200x1400)
- `gm_support_01.webp` (recommended 1800x1200)
- `gm_support_02.webp` (recommended 1800x1200)
- `tf_hero.webp` (recommended 2200x1400)
- `tf_support_01.webp` (recommended 1800x1200)
- `tf_support_02.webp` (recommended 1800x1200)

### Covers
- `cover_graduation.webp` (recommended 1200x1200)
- `cover_timeout.webp` (recommended 1200x1200)

### Textures
- `tex_grain.png` (recommended tile 512x512 or 1024x1024)
- `tex_paper.jpg` (recommended 1800x1200)
- `tex_dust.png` (optional, recommended 1920x1080)

### UI / motifs
- `ui_burger.svg`
- `ui_close.svg`
- `ui_wave.svg`
- `motif_slash.svg`
- `motif_5beats.svg`
- `motif_line.svg`

## Adjust section widths and ScrollTrigger values

### Section widths
- File: `site/styles.css`
- Main width rule:
  - `.panel { width: 100vw; flex: 0 0 100vw; }`
- To make scenes longer/shorter horizontally, adjust panel width to values like `110vw` or `90vw` for selected panels.

### Horizontal scroll distance
- File: `site/script.js`
- In `initHorizontal()`, distance is computed by:
  - `const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);`
- If you increase panel widths, this auto-updates the full scroll distance.

### Scroll feel and timing
- File: `site/script.js`
- Master horizontal scrub:
  - `scrub: 0.95` (lower = snappier, higher = smoother/slower)
- Per-section animation timing:
  - `start` / `end` values in each `ScrollTrigger` (for example `start: "left 74%"`).
- Beat reveal timing (`#beatFive`) is in the Take Five section trigger; move that `start` value earlier/later to control reveal moment.

## Accessibility and fallback

- `prefers-reduced-motion: reduce` is supported.
- In reduced motion, the site switches to a vertical stacked layout and disables heavy transforms.
- Navigation still jumps to sections in fallback mode.

