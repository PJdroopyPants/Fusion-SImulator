# Fusion Power Generator Simulator

An interactive, physically grounded teaching model of a tokamak-style fusion power plant. Drive a magnetic-confinement reactor toward ignition, watch a real burning plasma respond, and follow the energy from fusion all the way to the grid.

It is self-contained and dependency-free: open `index.html` in any modern browser and it runs. No build step, no install, no internet connection required. That makes it easy to run unattended at an outreach booth or hand to a student to keep.

## Who it is for

Built for STEM outreach across a wide range, from curious high schoolers and families at an open house to undergraduate engineering students. Plain-language explanations and "everyday terms" readouts serve newcomers, while the underlying physics, the operating-point map, and the data export give undergraduates real depth to dig into.

## Quick start

1. Open `index.html` in a recent version of Chrome, Edge, Firefox, or Safari.
2. That is it. Everything runs locally.

For a kiosk or projector, press **Present** (top right) for a fullscreen exhibit mode that enlarges the reactor and headline numbers, hides the denser panels, and idles into an automatic demo when untouched. The simulator also works if served over a simple local web server, which lets browser settings such as theme persistence stick between visits, but that is optional.

## Driving the reactor

Six setpoints and four toggles control the machine, or jump to a preset to see a complete operating point at once.

Setpoints: plasma temperature (the heating drive), magnetic field, fuel injection, D-T balance, blanket coolant, and turbine load.

Toggles: neutral beam heating, pellet pacing, divertor sweep, and emergency quench.

Presets: **Startup** (just past breakeven, still net-negative), **Cruise** (a strong burning plasma), **High Gain** (a clean, self-sustaining ignition), **Stress** (pushes into a disruption), and **Shutdown**.

A note on temperature: it is now a heating drive rather than a fixed dial. See burn-through dynamics below.

## The physics it models

The model is simplified but physically motivated, and calibrated for intuition rather than engineering accuracy.

- **Burn-through dynamics.** The actual core temperature is a real state that evolves over time. Alpha particles from each fusion reaction stay in the plasma and heat it, so once you cross the ignition threshold the temperature climbs on its own and the plant becomes self-sustaining. The temperature slider sets the external heating; alpha self-heating can push the real core hotter than the slider. Push too hard and rising pressure trips a disruption; starve the plasma and the burn collapses. Ignition is something you trigger and then manage.
- **Fusion triple product** n times T times tau_E, shown as the live figure of merit, against the D-T ignition target of about 3 x 10^21 keV s m^-3.
- **Lawson operating-point map**, a log plot of confinement parameter n times tau_E versus temperature, with the ignition and breakeven (Q = 1) curves, your live operating point and its trail, and labeled reference points for real machines (ITER, SPARC, JET, EAST).
- **Energy gain Q**, kept consistent with the heating and fusion power shown on the power-balance panel. Q = 1 is scientific breakeven, a burning plasma is roughly Q above 5, and Q running to infinity is ignition.
- **Power balance**: external heating in versus fusion power out, split into alpha self-heating (stays in the plasma) and neutron power (deposited in the blanket).
- **Plant telemetry**: confinement time tau_E, beta-limit driven disruption risk, wall heat load, coolant outlet temperature, and tritium breeding ratio.
- **First wall and materials**: an integrated neutron dose that accrues over a run, with a wall-life indicator. Surviving the neutron and heat flux is one of fusion's defining materials challenges.
- **A contextual coach** that reads the current state and explains why the reactor is behaving as it is.

## The reactor visualization

The central stage is a dependency-free, software-rendered 3D tokamak (perspective camera, depth-sorted painter's pass, atmospheric fog, multi-pass bloom). It shows a temperature-colored plasma with a hot burning core, toroidal-field coils weaving correctly through the plasma, poloidal-field coils, a central solenoid, vacuum-vessel ribs, helical field lines at a q ≈ 4 safety factor, streaming ions, in-core fusion flashes with the alpha particles they release, neutrons firing out to the blanket, and a divertor whose strike point sweeps when enabled. The reactor sits centered as the focus of the stage; the rest of the power plant lives in its own Balance of Plant panel below, described under Data visualizations.

The plasma core is rendered as a true volumetric glow using a raymarched WebGL shader (written in raw WebGL, no libraries) composited at the correct depth so the coils still pass in front of and behind it. If WebGL is unavailable on a given machine, it automatically falls back to the original software-rendered plasma, so it cannot break.

Extra views and aids on the stage:

- **Cutaway** opens a labeled poloidal cross-section showing the nested shells, from the plasma core out through the separatrix, scrape-off layer, breeding blanket, vacuum vessel, and TF coil.
- **Scale** drops in a human figure and a size bar so visitors grasp that the machine is building-sized.
- A **disruption event** makes instability visceral: the stage flashes and shakes when pressure outruns the magnetic field.

Navigate by dragging to orbit, scrolling to zoom, shift-drag or right-drag to pan, and double-click or press R to reset. An orientation gizmo and ISO/TOP/FRONT/SIDE view buttons sit in the corner, with a camera control cluster beside them. The view auto-rotates when idle, and everything responds live to the setpoints.

## Modes and features

- **Guided story** walks a learner from cold gas to ignition one concept at a time, with a live "goal met" check at each step.
- **Guided tour** spotlights the key controls; start it any time from the **Tour** button.
- **Missions** are seven challenges, from First Light to Ignition, each forcing a deliberate tradeoff.
- **Real-world units** re-expresses the readouts in everyday terms: temperature in millions of degrees and multiples of the Sun's core, net power in homes powered.
- **Themes**: a control-room dark theme, a light theme for bright rooms and projectors, a high-contrast theme, and a colorblind-safe palette.
- **Sound** (off by default) adds a reactor hum that tracks fusion power, with chimes on ignition and mission completion and an alarm on disruption.
- **Export run (CSV)** downloads the current setpoints, key outputs, and the recent history as a lab worksheet.
- **Takeaway card** generates a shareable summary of the visitor's run, their best energy gain, peak net power, hottest plasma, and missions completed, alongside a QR code to run the simulator themselves. It downloads as a PNG for a booth handout or a phone photo. The QR is baked in and points to the project repository; a host can repoint it by regenerating the code for their own URL (see the note above `TAKEAWAY_QR` in `script.js`).
- **Present** is the fullscreen kiosk mode described in Quick start.

## Data visualizations

Live, software-drawn panels accompany the reactor: the Lawson operating-point map with real-machine references, the power balance, output over time, D-T reactivity versus temperature, an energy-flow diagram from fusion to the grid, the D-T fuel cycle, the reactor cross-section, and a Balance of Plant flow that traces the reactor's heat to the grid one component at a time (blanket, steam generator, turbine, condenser, cooling tower, grid) with a live value for each. Its blanket and turbine stages are clickable and open the matching lesson.

## Accessibility

The simulator honors the operating system's reduced-motion setting (it stills animation and freezes flicker), ships high-contrast and colorblind-safe themes, supports keyboard reset and touch gestures, and uses ARIA live regions for the key readouts.

## For educators

- The first-wall and materials readout connects the prettiest failure mode in the sim to the real plasma-materials research that university fusion programs pursue.
- The CSV export pairs naturally with a hands-on lab: derive the operating point, hit the missions, export the run, and write it up.
- Presentation mode plus the offline, single-folder design make it a turnkey booth exhibit on any laptop.

## Files

- `index.html` is the structure and content.
- `styles.css` is the visual theme, including the light, high-contrast, and colorblind variants.
- `script.js` holds the physics model, the burn-through dynamics, the software 3D renderer, the WebGL plasma shader, and the data visualizations. A host program can rebrand the exhibit by editing the `BRAND` block at the top (program name, attribution, and an optional link flow to the topbar, the About panel, and the takeaway card).
- `Fusion-Lab-Worksheet.html` is the one-page student lab handout; `Fusion-Lab-Instructor-Key.html` is the matching instructor answer key (marked "do not distribute"). Both carry grade-band, time, and standards metadata.
- `Fusion-Facilitator-Guide.html` is a one-page booth run-of-show for the volunteer staffing the exhibit.

## Disclaimer

This is a teaching model, not a scientific reactor code. The numbers are illustrative and calibrated for intuition, not engineering accuracy.

## License

Released under the MIT License (see `LICENSE`): free to run, share, modify, and adapt, including for a host program's own branding, with attribution preserved. The paired worksheet and instructor key may be reproduced for classroom and outreach use. Update the copyright holder in `LICENSE` to the donating party if it is not the Tokamak Learning Lab.

## Credits

A self-contained educational tool built to help students see, drive, and understand magnetic-confinement fusion.
