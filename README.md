# Jelly Orbit · 水母的海洋小旅行

A five-stage, mobile-first playable rebuild. Send jellyfish around a moving track, reveal matching colors, and collect ocean pixel art.

## Gameplay

- Tap the front jellyfish in any of three queues. Up to three travel together, with slightly staggered launches.
- Each swimmer fires inward along its current side. The first solid cube blocks everything behind it; a matching hit spends one bubble.
- Empty swimmers leave immediately. Those with bubbles remaining return after one lap to a five-slot waiting bay and can be launched again.
- Each traveling swimmer reserves one waiting slot, shown by a return arrow. A full bay still lets its own swimmers relaunch.
- Clear every cube to win. Loss is checked only after all swimmers settle, when no waiting swimmer can hit anything and no new queue can be opened.
- Undo restores the complete state before the last launch, including other swimmers in flight. Hints suggest locally useful colors; they do not guarantee optimal play.
- Pause, replay, 2× speed, optional sound, and help are included. Dialogs and hidden browser tabs pause simulation.

The first two stages introduce the loop. Later stages place inner colors ahead of some outer-layer ammo, creating queue and waiting-slot decisions.

## Core Systems

- `src/game/tide.ts`: immutable deterministic simulation, inward rays, launch/dock rules, five new stages and local hints.
- `src/game/tide.test.ts`: capacity, ammo conservation, simultaneous hits, deadlock timing, and verified sequential/interleaved winning routes for all five stages.
- `src/App.tsx`: interface, clock, undo snapshots, local completion storage and synthesized audio.
- `src/styles.css`: responsive ocean layout, hit feedback and reduced-motion support.
- Existing artwork from `reference/jellyfish-3d` is reused.

The previous turn-based engine, solver, levels and tests remain as reference. They are not used by the new app; the realtime rules are verified separately.

Completed stages are stored under `jellyOrbitTideV2`, without changing previous-version progress. Reloading restarts the current stage and keeps unlocks. Audio starts muted. Google Fonts is optional, with system-font fallback.

This first prototype contains five stages. Difficulty and pacing still need real-player playtesting before expanding the catalog. Accounts, monetization and daily challenges are outside this version.

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
