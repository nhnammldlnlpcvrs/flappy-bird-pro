# Flappy Bird Pro

A production-ready Flappy Bird clone built with **Phaser 3**, **Vite**, and **Tailwind CSS v4**.

All assets are generated programmatically — no external images needed.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # preview production build locally
```

## Controls

| Action  | Input                        |
| ------- | ---------------------------- |
| Flap    | Click / Tap / Spacebar       |
| Start   | Click "Start Game" button    |
| Restart | Click "Play Again" after game over |

## Deployment

### Vercel (recommended)

**Option A — Git-based (automatic deploys)**

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Vite — no extra config needed (the `vercel.json` ensures SPA rewrites work).
4. Every push to `main` triggers a new deployment automatically.

**Option B — Vercel CLI (manual deploys)**

```bash
# Install the CLI
npm i -g vercel

# Deploy
vercel          # preview deploy
vercel --prod   # production deploy

# Or use the npm script
npm run deploy
```

### GitHub Actions CI

On every push to `main`, the workflow in `.github/workflows/deploy.yml` runs `npm ci` and `npm run build` to catch build errors before they reach production.

## Stack

- **Phaser 3** — game engine (Arcade physics, sprite management)
- **Vite 8** — bundler with instant HMR
- **Tailwind CSS v4** — utility-first CSS for UI overlays
- **No external assets** — everything is drawn with Canvas graphics

## Project Structure

```
├── .github/workflows/deploy.yml   # CI workflow
├── index.html                     # Game UI overlays
├── package.json
├── vercel.json                    # Vercel config (SPA rewrites)
├── vite.config.js                 # Vite + Tailwind plugin
├── public/assets/                 # Empty — no external images
└── src/
    ├── main.js                    # Phaser init, UI wiring
    ├── style.css                  # Tailwind v4 + custom styles
    └── game/
        └── GameScene.js           # Bird, pipes, collisions, scoring
```
