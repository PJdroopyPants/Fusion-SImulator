# Fusion Power Generator Simulator

A self-contained, interactive teaching model of a tokamak-style fusion power plant. Open `index.html` in any modern browser to run it. There is no build step and there are no dependencies.

## What you can do

Drive the reactor with six setpoints (plasma temperature, magnetic field, fuel injection, D-T balance, blanket coolant, turbine load) and four auxiliary toggles (neutral beam, pellet pacing, divertor sweep, emergency quench), or jump to a preset: Startup, Cruise, High Gain, Stress, Shutdown.

## What it teaches

The model is simplified but physically motivated, aimed at undergraduate and STEM learners:

- Fusion triple product `n·T·tau_E` shown as a live figure of merit, with the canonical D-T ignition target of about 3x10^21 keV·s·m^-3.
- Lawson operating-point map, a log plot of the confinement parameter `n·tau_E` versus temperature, with the ignition and breakeven (Q = 1) curves and your live operating point plus a trail. Watch the point climb toward ignition as you tune the machine.
- Energy gain Q derived consistently from the triple product via `Q = 5·phi/(1 - phi)`, where `phi` is the fraction of the ignition threshold reached and the 5 reflects alphas carrying about 20% of fusion energy. Q = 1 is breakeven and Q running to infinity is ignition.
- Power balance, external heating in versus fusion power out, split into alpha self-heating (stays in the plasma) and neutron power (deposited in the blanket).
- Confinement time `tau_E`, beta-limit driven disruption risk, wall heat load, coolant outlet temperature, and tritium breeding ratio.
- A contextual coach that reads the current state and explains why the reactor is behaving as it is.
- Expandable concept panels for the plasma, magnets, blanket, divertor, and turbine, plus a glossary of key terms.

## The reactor visualization

The central canvas shows a tilted top-down tokamak: a temperature-colored plasma torus, projected toroidal-field coils caging the donut, nested magnetic flux surfaces in the core, a central solenoid, an attached divertor at the bottom whose strike point sweeps when enabled, and a coolant loop routed to the turbine.

## Files

- `index.html` is the structure and content.
- `styles.css` is the dark control-room visual theme.
- `script.js` holds the physics model, the animated reactor render, and the data visualizations.

This is a teaching model, not a scientific reactor code. Numbers are illustrative and calibrated for intuition, not engineering accuracy.
