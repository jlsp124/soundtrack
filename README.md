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
- If GSAP initializes but `distanceX` is effectively zero, the app automatically falls back to native mode.

Fallback mode (GSAP blocked/unavailable, motion ON):
- Native horizontal engine is used.
- `maxX = max(0, track.scrollWidth - innerWidth)`.
- `body.style.height = innerHeight + maxX`.
- `#horizontalShell` is fixed to the viewport.
- On vertical scroll, JS sets `track.style.transform = translate3d(-scrollY, 0, 0)` (clamped to `maxX`) with rAF interpolation for smoother feel.

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

Behavior rules:
- Motion is enabled by default (`on`) even if the browser reports reduced-motion.
- Heavy animation is disabled only when:
  - `motion=off`, or
  - `motion=auto` and `prefers-reduced-motion` is true.

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

## Debug mode

Use `?debug=1` to display a live debug overlay showing:
- active engine (`gsap`, `native`, `reduced`)
- motion mode (`on/off/auto`)
- `prefers-reduced-motion` state
- computed `distanceX`
- library availability flags (`GSAP / ScrollTrigger / Lenis`)

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
- native interpolation smoothing inside `initNativeHorizontal()` render loop

3. Lenis feel:
- `initLenis()` -> `duration`, `lerp`, `wheelMultiplier`

## Reduced-motion behavior

When reduced mode is active:
- Lenis is disabled.
- GSAP horizontal engine is not used.
- Layout switches to vertical stack via `.reduced-motion` styles.
- Navigation and progress bar continue working.

## Deploy comments worker (no account required for commenters)

The site now includes a comments panel that reads from a Cloudflare Worker API.
Commenters do not need GitHub accounts.

### 1. Create D1 database

```bash
cd comments-worker
wrangler d1 create soundtrack-comments
```

Copy the returned `database_id` into `comments-worker/wrangler.toml`.

### 2. Apply schema

```bash
wrangler d1 execute soundtrack-comments --file=./schema.sql
```

### 3. Create KV namespace for rate limiting

```bash
wrangler kv namespace create RATE_LIMIT
```

Copy the returned namespace `id` into `comments-worker/wrangler.toml`.

### 4. Verify allowed origins

`comments-worker/wrangler.toml` includes:

- `https://jlsp124.github.io`
- `http://127.0.0.1:5500`

Adjust `ALLOWED_ORIGINS` if needed.

### 5. Deploy worker

```bash
wrangler deploy
```

### 6. Connect the static site to the worker

In `index.html`, set:

```html
<meta name="comments-api" content="https://YOUR-WORKER.your-subdomain.workers.dev" />
```

If this meta tag is left as `___FILL_ME___`, the comments panel stays disabled and shows `Comments not configured.`
