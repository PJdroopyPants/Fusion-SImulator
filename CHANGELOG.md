# Changelog

All notable changes to the Fusion Power Generator Simulator. The version shown here is also
surfaced in the in-app **About** panel. This project follows a simple, human-readable changelog.

## [1.0.0] - 2026-06-28 - Donation-ready release

The first release prepared for donation to a campus STEM-outreach program. It folds the original
enhancement roadmap (now essentially delivered) and a form-and-function review into a single living
roadmap, and clears the blockers a campus reviewer checks first.

### Added
- **MIT `LICENSE`** so the in-app "free to run and share" promise is legally real, plus a README License section.
- **Branding config** (`BRAND` at the top of `script.js`): a host program sets its name, attribution, and an
  optional link in one place; it flows to the topbar, the About panel, and the takeaway card.
- **`APP_VERSION`** constant, surfaced in the About panel.
- **Booth facilitator guide** (`Fusion-Facilitator-Guide.html`) and **curriculum metadata** (grade band, time,
  NGSS alignment) on the student worksheet and instructor key.
- **Keyboard control of the 3D reactor** (focusable canvas; arrow keys orbit, `+`/`-` zoom, `R` resets).
- **Modal focus management** for the Tour, Guided story, Takeaway card, and About dialogs (focus in, Tab-trap,
  Escape to close, focus restored).
- **Global keyboard focus ring** across all interactive controls.
- **Screen-reader support**: sliders announce values with units; the reactor state is announced on change
  through a dedicated polite region (replacing an over-eager live region).
- **Guided-story spotlight**: each step highlights the control it names.
- **Missions discoverability**: a "challenges" chip in the status strip jumps to the missions panel, plus a
  starting hint per challenge.

### Changed
- **Cold-open** opens on a clean net-positive operating point (Cruise) so the first impression is a working
  reactor, not a red sub-breakeven number; the Startup preset remains for the "Q > 1 is not net power" lesson.
- **Hero status numbers** (state / net electric / Q) enlarged for booth and projector legibility.
- **Annunciator lamps** redesigned with LED indicators and a brighter off-state.
- **Volumetric plasma** supersamples on high-DPI tablets for a sharper core.
- **Mobile**: vertical swipes on the reactor scroll the page (no more scroll-trap); horizontal swipes orbit.
- **Copy consistency**: standardized the practical operating window (10–20 keV) and the neutron energy
  (14.1 MeV) across the app and chart; clarified the magnetic-field and radioactive-waste wording.

### Fixed
- Guided-story step 1 now applies a genuinely cold plasma, so "too cold to fuse" matches the screen.
- Instructor key's Cruise energy gain corrected to the model's actual value (~15–20).
- README no longer claims the tour auto-runs on first visit.
