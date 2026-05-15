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

| Action | Input |
|--------|-------|
| Flap   | Click / Tap / Spacebar |
| Start  | Click "Start Game" button |
| Restart | Click "Play Again" after game over |

## Deploy to Vercel

1. Push this repo to GitHub:

   ```bash
   git init
   git add -A
   git commit -m "Initial commit: Flappy Bird Pro"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/flappy-bird-pro.git
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Vite — no extra config needed.
4. Click **Deploy**.

Or deploy from the CLI:

```bash
npx vercel --prod
```

## Stack

- **Phaser 3** — game engine (Arcade physics, sprite management)
- **Vite 8** — bundler with instant HMR
- **Tailwind CSS v4** — utility-first CSS for UI overlays
- **No external assets** — everything is drawn with Canvas graphics

## License

MIT
