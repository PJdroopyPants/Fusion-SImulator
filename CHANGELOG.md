# Changelog

## 1.1.0 (2026-07-02)

Donation-hardening release, in four reviewed batches.

**Science credibility**
- Energy gain Q is now consistent everywhere: the badge, the power-balance panel, and the CSV can no longer imply three different values at ignition (Q is capped at fusion power over the heating actually delivered; the "≈ ∞" presentation keys strictly on the ignition state).
- New "Breakeven" reactor state for Q between 1 and 5; "Burning Plasma" is reserved for the alpha-dominated Q of 5 and up, matching field usage. Lamp, coach, tips, and the instructor key moved together.
- Lawson map machine markers repositioned so each implied gain matches reality (JET 1997 at Q 0.67 below the breakeven curve; ITER and SPARC labeled with their target and projected gains; EAST labeled as a long-pulse, no-tritium machine), each with a caption.
- Guided-story step 5 no longer states the "Q above 1 means more out than in" misconception.
- The D-T mix penalty now follows the real n_D times n_T product scaling (a 60/40 blend gives 96% of the even-mix rate, not half).

**Booth lifecycle**
- Nothing is earned until a visitor actually drives: the boot preset, the kiosk demo, and the idle watchdog never complete missions, set records, or accrue wall dose.
- Full per-visitor reset (missions, records, quiz score, wall dose, charts) via a two-tap "New run" button, the 3-minute idle watchdog, and the kiosk demo takeover.
- The kiosk auto-demo yields to a visitor for 90 seconds after any deliberate touch (doubled while a card or story is open), warns with a countdown chip before resuming, and starts each visitor from a clean slate.
- Constraint missions are judged on settled dial values and must be held for a few seconds, so exact-boundary stalls and ramp-through freebies are both gone.

**Engagement layer**
- Stage HUD: the operator coach is pinned under the reactor with a state-tinted edge, next to a progress-to-ignition bar with Q = 1, Burning, and Ignition markers.
- Kiosk attract narration in large type, synced to the demo cycle, with a pulsing invite.
- Mission ladder rebuilt: ten missions in three tiers (Operator, Engineer, Chief) with hold-to-complete bars, per-mission debrief lines, and hand-tuned capstones (Solo Ignition, Hold the Burn exploiting real burn hysteresis, Grid Master). Chief completions and the 10-of-10 finish get bigger celebrations.
- 60-second Power Challenge: a no-presets sprint scored on the highest net power held at 55%+ stability, with a best-of-today initials board.
- Takeaway funnel: a one-per-run "get your card" invite after genuine achievement; the card button is now "Your run card (QR)".

**Packaging and accessibility**
- PNG icon set (Android, iOS home screen, maskable) plus a social link-preview card and og:/twitter: metadata.
- Cache-first service worker: the hosted exhibit works offline once visited.
- Doubled predict-then-test quiz bank (12 questions); CSV history now includes Q, triple product, and reactor state per sample; real-world units gained fuel-mass-per-hour with a coal comparison.
- Mobile header collapses into a menu so the reactor is visible sooner on phones; contrast tokens fixed in the dark and light themes; 44 px touch targets; canvas pixel budget for high-DPI displays; ARIA pass (lamps, presets, missions, steppers, sliders) plus an on-demand "Describe state" announcement (D key).

## 1.0.0 (2026-06-28)

First donation-ready release: burn-through dynamics, software-rendered 3D tokamak with WebGL plasma core, Lawson operating-point map, guided story and tour, missions, predict-then-test quiz, kiosk Present mode, CSV export, takeaway card with QR, four themes, optional sound, facilitator guide, and classroom worksheet with instructor key.
