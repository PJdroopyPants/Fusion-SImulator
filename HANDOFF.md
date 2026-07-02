# Handoff guide

For the program receiving this exhibit. Everything a student org needs to run, rebrand,
maintain, and extend the simulator. The README covers what the app does; this file covers
how to own it.

## What you are receiving

A zero-dependency, single-folder web app. There is no build step, no package manager, and
no framework: `index.html` + `script.js` + `styles.css` run as-is in any modern browser,
from a folder or from any static web host. Everything else in the folder is documentation,
printable handouts, or packaging (icons, manifest, service worker).

## Rebrand checklist (do this first)

1. **`script.js`, the `BRAND` block at the top**: set `program` (your program's name),
   `madeBy`, and optionally `url`. This rewrites the topbar eyebrow, the About panel, the
   takeaway card, and the exported PNG automatically.
2. **`LICENSE`**: replace "Tokamak Learning Lab" with the actual copyright holder.
3. **Hosting**: put the folder on your own static host (GitHub Pages under your org works:
   Settings > Pages > deploy from branch). Prefer an all-lowercase repository name; project
   URLs on github.io are case-sensitive, and a wrongly cased URL typed from a printed card
   will 404.
4. **`script.js`, `TAKEAWAY_URL` and `TAKEAWAY_QR`**: point them at your new URL. The QR is
   a baked matrix; regenerate it with any QR tool at error-correction level M and paste the
   rows in the same format (the comment above `TAKEAWAY_QR` explains this). Then scan the
   on-screen QR with a phone to confirm before printing anything.
5. **`index.html` head**: update `og:url` and `og:image` to your host, and the
   `meta name="author"`.
6. **Search the four HTML docs** (worksheet, instructor key, facilitator guide, README) for
   "Tokamak Learning Lab" and replace with your program name.
7. **The instructor key is served publicly** if you deploy the whole folder. Either remove
   `Fusion-Lab-Instructor-Key.html` from the deployed copy and share it with instructors
   directly, or accept that a determined student can find it. If you remove it (or any file),
   also remove it from the `ASSETS` list in `sw.js`: the service worker installs all-or-nothing,
   and a single missing file silently disables offline support and stops updates from reaching
   returning visitors.

## Map of script.js

The file is organized top to bottom in sections, each introduced by a banner comment.
Search for these markers rather than line numbers:

| Search for | What lives there |
| --- | --- |
| `const BRAND` | Branding block and `APP_VERSION` |
| `presetValues` | The five preset operating points (carefully tuned; see release checklist) |
| `burn-through dynamics` | The core temperature state, alpha self-heating, input smoothing |
| `function calculateModel` | The physics model: confinement, triple product, Q, power balance, limits |
| `function updateReadouts` | DOM updates per tick, the phi bar, the takeaway CTA |
| `getCoachMessage` | The contextual coach's message ladder |
| `REACTOR 3D ENGINE` | The software 3D renderer (geometry, camera, painter's pass, bloom) |
| `renderPlasmaGL` | The raymarched WebGL plasma core with 2D fallback |
| `drawLawson` | The Lawson operating-point map, including the real-machine markers |
| `Missions / challenges` | The 10-mission ladder, hold logic, settled-dial gating |
| `Power Challenge` | The 60-second sprint, scoring, best-of-day board (localStorage) |
| `TIPS` | Every tooltip's text |
| `tickKiosk` | Present-mode attract demo, visitor ownership, countdown chip |
| `function resetRun` | The per-visitor reset (invoked by New run, the idle watchdog, kiosk takeover) |
| `const STORY` | Guided-story steps |
| `PREDICT_Q` | The predict-then-test quiz bank |
| `function exportRun` | The CSV export |
| `openTakeaway` | The takeaway card and PNG renderer |
| `dialogOpen` | The shared modal helper (focus trap, Escape, restore) |
| `modelTick` / `startLoops` | The heartbeat: model at ~3 Hz, rendering per animation frame |

## Performance notes

- Firefox is forced onto a "lite" rendering path at boot (1x canvas scale, no shadow blur,
  fewer particles) because Gecko's 2D canvas is far slower on this workload; ~25 fps there
  is expected and accepted. Chromium-family browsers run the full path.
- A continuous FPS guard also trips lite mode on any slow machine after a few seconds.
- All canvases are capped at a total-pixel budget, so 4K projectors and high-DPI laptops do
  not overwhelm the software renderer.

## Releasing a change

1. Edit, then bump `APP_VERSION` in `script.js` AND `CACHE_VERSION` in `sw.js` (they must
   move together, or returning visitors will keep the old cached files), and add a line to
   `CHANGELOG.md`.
2. Run the release checklist below.
3. Deploy (push to the Pages branch). The service worker picks up new files on the next
   visit after the version bump.

## Release checklist

The presets and missions are tuned against the model. After ANY change to
`calculateModel`, `advanceDynamics`, or `presetValues`, verify:

- [ ] Startup settles at state "Breakeven", Q ~1.5-1.6, net ~-250 to -270 MW
- [ ] Cruise settles at state "Net Power", Q ~20, net ~+300 MW
- [ ] High Gain settles at state "Ignition" (Q badge reads ~infinity), net ~+615 MW
- [ ] Stress settles at state "Disruption Risk"
- [ ] Shutdown settles at state "Quench", fusion ~0
- [ ] High Gain alone does NOT complete Ignition, Solo Ignition, Hold the Burn, or
      Grid Master (they need a deliberate extra move)
- [ ] Hold the Burn: from High Gain, drag Plasma temperature to 10; completes in ~15 s.
      From a fresh Startup, dragging to 10 must NOT complete it (Q stalls near 7)
- [ ] The 60s Challenge: max-everything must NOT out-score a controlled ~800 MW run
      (the stability gate should read "unstable! not scoring")
- [ ] The instructor key's numbers (preset table, mission table) still match
- [ ] Test in Chrome AND Firefox; check the phone layout at ~375 px wide

## History and conventions

- Copy contains no em dashes anywhere, deliberately; keep it that way.
- Code comments carry short tags (C1, B5, P1, A11y...) from earlier planning documents that
  no longer exist. Treat them as section markers, nothing more.
- v1.0.0 was the original donation build; v1.1.0 added the science-label corrections, the
  booth lifecycle (per-visitor reset, kiosk courtesy), the engagement layer (mission tiers,
  Power Challenge, stage HUD), and this packaging pass. `CHANGELOG.md` has details.
