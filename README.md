# Jelly Orbit

Jelly Orbit is a small, original browser logic game from the 012S Jelly series. Choose a Jelly colour, let it travel the soft outer orbit, and clear only the matching pixels currently exposed to the outside.

## Gameplay

Read the outer layer of the Pixel Art, choose a Jelly, and spend one Energy per matching exposed Pixel. Hidden pixels stay protected until an outside flood fill reaches them. Jelly Energy that remains after a turn waits in the four-slot Jelly Pool, so the order of your colours matters.

## Core Systems

- Outside flood-fill exposure detection
- Deterministic clockwise attack order
- Jelly Energy and partial turns
- Four-slot Jelly Pool
- Meaningful-move deadlock detection
- Pure turn resolver and deterministic DFS solver
- 15 hand-authored original Pixel Art levels
- Local progress at `jellyOrbitProgress`

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

The production Vite build uses `/012s-jelly-orbit/` as its GitHub Pages base when the GitHub Actions environment is detected. Local development uses `/`.

## Deployment

`.github/workflows/deploy.yml` runs tests, typecheck, build, and deploys `dist/` to GitHub Pages only after all checks pass.

Expected URL:

<https://alberthuang-012s.github.io/012s-jelly-orbit/>
