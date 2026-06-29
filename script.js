"use strict";

/* ============================================================
   Fusion Power Generator Simulator
   A simplified but physically motivated teaching model.

   Key physics encoded:
   - Fusion triple product  nT*tauE  (figure of merit)
   - Lawson ignition curve   nT*tauE_ignition(T) ~ 3e21 keV.s/m^3 (min ~14 keV)
   - Energy gain             Q = 5*phi/(1 - phi),  phi = (nT*tauE)/(ignition)
                             (the 5 = 1/f_alpha, alphas carry ~20% of fusion energy)
   - Power chain             external heating -> plasma -> fusion power
                             (alpha 20% stays, neutron 80% -> blanket -> turbine)
   ============================================================ */

const $ = (sel) => document.querySelector(sel);

/* ---------- Branding & version (P1 / P2) ----------
   A host program makes the exhibit its own by editing just this block. The program name appears in the
   topbar, the About panel, and the takeaway card; set `url` to add a link to the program in About. */
const BRAND = {
  program: "Tokamak Learning Lab",   // topbar eyebrow + takeaway-card kicker
  madeBy: "Tokamak Learning Lab",    // About -> "Made by"
  url: ""                            // optional program page; shown as a link in About when set
};
const APP_VERSION = "1.0.0";
function applyBrand() {
  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  setText("brandEyebrow", BRAND.program);
  setText("brandCardKicker", BRAND.program);
  setText("brandMadeBy", BRAND.madeBy);
  setText("appVersion", APP_VERSION);
  const meta = document.querySelector('meta[name="author"]'); if (meta) meta.setAttribute("content", BRAND.madeBy);
  if (BRAND.url) {
    const note = document.querySelector(".about-note");
    if (note) note.innerHTML = ' <a href="' + BRAND.url + '" target="_blank" rel="noopener">' + BRAND.url.replace(/^https?:\/\//, "") + '</a>';
  }
}

const controls = {
  temperature: $("#temperature"),
  magneticField: $("#magneticField"),
  fuelRate: $("#fuelRate"),
  fuelBalance: $("#fuelBalance"),
  coolingFlow: $("#coolingFlow"),
  turbineLoad: $("#turbineLoad"),
  neutralBeam: $("#neutralBeam"),
  pelletPulse: $("#pelletPulse"),
  divertorSweep: $("#divertorSweep"),
  emergencyQuench: $("#emergencyQuench")
};

const outputs = {
  temperatureValue: $("#temperatureValue"),
  magneticFieldValue: $("#magneticFieldValue"),
  fuelRateValue: $("#fuelRateValue"),
  fuelBalanceValue: $("#fuelBalanceValue"),
  coolingFlowValue: $("#coolingFlowValue"),
  turbineLoadValue: $("#turbineLoadValue"),
  reactorState: $("#reactorState"),
  netPowerBadge: $("#netPowerBadge"),
  qBadge: $("#qBadge"),
  fusionPower: $("#fusionPower"),
  qPlasma: $("#qPlasma"),
  electricOutput: $("#electricOutput"),
  tripleProduct: $("#tripleProduct"),
  confinementTime: $("#confinementTime"),
  stability: $("#stability"),
  wallLoad: $("#wallLoad"),
  coolantTemp: $("#coolantTemp"),
  tritiumRatio: $("#tritiumRatio"),
  fusionPowerMeter: $("#fusionPowerMeter"),
  qMeter: $("#qMeter"),
  electricMeter: $("#electricMeter"),
  tripleMeter: $("#tripleMeter"),
  confinementMeter: $("#confinementMeter"),
  stabilityMeter: $("#stabilityMeter"),
  wallLoadBar: $("#wallLoadBar"),
  coolantBar: $("#coolantBar"),
  tritiumBar: $("#tritiumBar"),
  chartPeak: $("#chartPeak"),
  coachText: $("#coachText"),
  lessonTopic: $("#lessonTopic"),
  lessonTitle: $("#lessonTitle"),
  lessonBody: $("#lessonBody"),
  lessonDeeper: $("#lessonDeeper"),
  lessonFormula: $("#lessonFormula"),
  lessonNote: $("#lessonNote"),
  stageTemp: $("#stageTemp"),
  stageField: $("#stageField"),
  stageDensity: $("#stageDensity"),
  pbExt: $("#pbExt"),
  pbAlpha: $("#pbAlpha"),
  pbNeutron: $("#pbNeutron"),
  pbExtVal: $("#pbExtVal"),
  pbFusVal: $("#pbFusVal"),
  qBig: $("#qBig")
};

const reactorCanvas = $("#reactorCanvas");
const reactorCtx = reactorCanvas.getContext("2d");
const historyCanvas = $("#historyCanvas");
const historyCtx = historyCanvas.getContext("2d");
const lawsonCanvas = $("#lawsonCanvas");
const lawsonCtx = lawsonCanvas.getContext("2d");
const reactivityCanvas = $("#reactivityCanvas");
const reactivityCtx = reactivityCanvas ? reactivityCanvas.getContext("2d") : null;
const sankeyCanvas = $("#sankeyCanvas");
const sankeyCtx = sankeyCanvas ? sankeyCanvas.getContext("2d") : null;
const fuelCycleCanvas = $("#fuelCycleCanvas");
const fuelCycleCtx = fuelCycleCanvas ? fuelCycleCanvas.getContext("2d") : null;
const presets = document.querySelectorAll("[data-preset]");
const hotspots = document.querySelectorAll("[data-topic]");
const srStatus = $("#srStatus");   // A11y: polite live region for discrete reactor-state changes

/* ---------- Presets ---------- */
const presetValues = {
  startup: { temperature: 11, magneticField: 5.2, fuelRate: 58, fuelBalance: 50, coolingFlow: 66, turbineLoad: 54, neutralBeam: true, pelletPulse: true, divertorSweep: false, emergencyQuench: false },
  cruise: { temperature: 16.5, magneticField: 6.8, fuelRate: 74, fuelBalance: 50, coolingFlow: 82, turbineLoad: 76, neutralBeam: true, pelletPulse: true, divertorSweep: true, emergencyQuench: false },
  gain: { temperature: 18, magneticField: 8.2, fuelRate: 73, fuelBalance: 50, coolingFlow: 96, turbineLoad: 78, neutralBeam: true, pelletPulse: true, divertorSweep: true, emergencyQuench: false },
  stress: { temperature: 24, magneticField: 4.6, fuelRate: 94, fuelBalance: 58, coolingFlow: 52, turbineLoad: 92, neutralBeam: true, pelletPulse: false, divertorSweep: false, emergencyQuench: false },
  shutdown: { temperature: 4.2, magneticField: 3.6, fuelRate: 0, fuelBalance: 50, coolingFlow: 92, turbineLoad: 8, neutralBeam: false, pelletPulse: false, divertorSweep: true, emergencyQuench: true }
};

/* ---------- Lessons (with deeper physics + formula) ---------- */
const lessons = {
  plasma: {
    topic: "Plasma core",
    title: "A hot charged gas does the work.",
    body: "Fusion begins when deuterium and tritium nuclei move fast enough to overcome their electrical repulsion. Temperature sets the reaction rate, but heat without confinement just leaks away.",
    deeper: "The D-T reaction rate scales with density squared times the reactivity, n²⟨σv⟩. The reactivity climbs steeply from a few keV and is already strong by 10 to 20 keV, the practical operating window. Push too hard and the plasma pressure can exceed what the magnetic field can hold (the beta limit), risking a disruption.",
    formula: "P_fusion ∝ n² · ⟨σv⟩(T) · E_DT",
    note: "Best operation sits in the 10 to 20 keV window, with matching confinement.",
    plain: {
      title: "It starts with a super-hot gas.",
      body: "Heat the hydrogen fuel until its particles slam together hard enough to fuse and release energy. Hotter fuel fuses faster, but you also have to hold that heat in.",
      note: "Make it very hot and hold the heat in at the same time."
    }
  },
  solenoid: {
    topic: "Central solenoid",
    title: "The transformer that starts the current.",
    body: "The central solenoid is a stack of coils running up the middle of the machine. Ramping its current induces the plasma current by transformer action, which both heats the plasma and helps create its confining field.",
    deeper: "A transformer needs a changing current, so the solenoid's swing is finite. That limits how long a purely inductive pulse can run, which is one reason tokamaks are pulsed and why steady-state operation needs separate non-inductive current drive.",
    formula: "Plasma current rises with the solenoid's current swing",
    note: "It kickstarts and sustains the plasma current rather than producing power.",
    plain: {
      title: "The part that gets the current going.",
      body: "A tall coil runs up the center of the machine. Changing its current pushes a current through the plasma, like a transformer, which helps heat it and hold its shape.",
      note: "It starts the plasma current; it does not make the power."
    }
  },
  magnets: {
    topic: "Magnets",
    title: "Magnetic fields replace solid walls.",
    body: "Charged particles spiral along magnetic field lines, so superconducting coils shape a torus that keeps the hottest material away from the vessel and holds energy in.",
    deeper: "Confinement time tau_E, how long the plasma keeps its energy, rises strongly with field strength and device size. A stronger field also raises the pressure the plasma can hold before going unstable. Weaken the field while fuelling hard and confinement collapses, dropping you below breakeven.",
    formula: "tau_E increases with B, raising nT·tau_E",
    note: "If the field is weak, energy leaks out and the reaction rate collapses.",
    plain: {
      title: "Magnets hold the hot gas in place.",
      body: "The fuel is far too hot to touch any wall, so powerful magnets trap it in a floating ring and keep the heat from leaking out.",
      note: "Weak magnets let the heat escape and the reaction fades."
    }
  },
  blanket: {
    topic: "Blanket",
    title: "The blanket catches neutrons and breeds fuel.",
    body: "About 80% of fusion energy leaves as fast 14.1 MeV neutrons. They deposit heat in a lithium blanket that drives the power cycle, and lithium reactions create fresh tritium.",
    deeper: "Tritium does not occur naturally in useful amounts, so a power plant must breed its own. The tritium breeding ratio (TBR) is tritium produced per tritium burned; above 1.0 the plant is self-sufficient. Neutron multipliers and blanket geometry push the TBR over unity.",
    formula: "TBR > 1.0 means fuel self-sufficiency",
    note: "A breeding ratio above 1.0 means the plant is replacing its tritium fuel.",
    plain: {
      title: "The blanket soaks up energy and makes more fuel.",
      body: "Most of the energy flies out as tiny particles called neutrons. A lithium blanket catches them for heat and uses them to make fresh fuel.",
      note: "Above 1.0, the plant makes more fuel than it burns."
    }
  },
  divertor: {
    topic: "Divertor",
    title: "The exhaust system for a star.",
    body: "Fusion produces helium ash and concentrates exhaust heat at the plasma edge. The divertor channels that heat and particle flux to specially cooled targets, protecting the rest of the wall.",
    deeper: "Unmanaged, edge heat flux can exceed materials limits (tens of MW/m²). Sweeping the strike point spreads the load over a larger area. Good exhaust handling also removes helium ash that would otherwise dilute the fuel and quench the burn.",
    formula: "Wall heat flux drops when the load is swept",
    note: "Enable the divertor sweep to relieve peak wall heat flux.",
    plain: {
      title: "The exhaust pipe for a tiny star.",
      body: "Fusion leaves behind helium and dumps heat at the edge of the gas. The divertor channels that away so it does not damage the walls.",
      note: "Turn on the divertor sweep to spread the heat out."
    }
  },
  turbine: {
    topic: "Turbine",
    title: "Fusion heat still becomes electricity the classic way.",
    body: "Coolant carries blanket heat into heat exchangers, raising steam (or another working fluid) that spins a turbine-generator. The conversion is ordinary thermodynamics.",
    deeper: "Gross electric output is thermal power times the turbine efficiency (about 33 to 45%). The plant must then subtract its own recirculating power: magnets, pumps, and especially the wall-plug cost of plasma heating. Net electricity therefore needs a high gain Q, not merely Q above 1.",
    formula: "P_net = P_thermal x eff_turbine - P_recirculating",
    note: "High turbine load only helps when the blanket is hot and cooling is balanced.",
    plain: {
      title: "The heat becomes electricity like any power plant.",
      body: "Coolant carries the heat away to boil water into steam, and the steam spins a turbine to make electricity, just like a coal or nuclear plant.",
      note: "The turbine only helps when the blanket is hot and cooling is balanced."
    }
  }
};

let selectedTopic = "plasma";
let netHistory = Array.from({ length: 120 }, () => 0);
let fusionHistory = Array.from({ length: 120 }, () => 0);
let trail = [];
let particles = [];
let sparks = [];
let alphas = [];
let fusionAcc = 0;
let neutrons = [];
let wallHeat = [];           // A4: per-rib neutron heat accumulation
let lastFrame = performance.now();
let model = {};
let lastAnnouncedState = "";   // A11y: last reactor state spoken to screen readers (announce only on change)
let chartsDirty = true;     // C1: redraw the static charts only when their data changes
const vis = new Set();      // C1: canvases currently on screen (off-screen ones are skipped)

/* ---------- Phase 1 UI state ---------- */
let scaleRef = false;        // A5: human + scale reference overlay
let unitMode = false;        // C3: real-world unit translator
let showMachines = true;     // C2: real-machine points on the Lawson map
let readLevel = "tech";      // C9: "tech" or "plain" lesson and coach wording
let kioskCycle = 0;          // B1: presentation-mode auto-demo index
let kioskLast = 0;           // B1: last auto-demo advance time
let lastUserAction = performance.now();  // C4: last real interaction (idle watchdog)
const WATCHDOG_MS = 180000;  // C4: normal-mode idle reset after 3 minutes
let liteMode = !!((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2));  // C3: weak-GPU lite path

/* ---------- Math helpers ---------- */
function gaussian(value, center, width) {
  return Math.exp(-Math.pow((value - center) / width, 2));
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function mixColor(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}
function formatMw(value) {
  return `${Math.round(value).toLocaleString()} MW`;
}

/* Ignition triple-product requirement L(T), in units of 1e21 keV.s/m^3.
   Minimum ~3 at 14 keV; this single curve also reproduces the classic
   n*tauE minimum of ~1.5e20 m^-3.s near ~25 keV. */
function ignitionTriple(T) {
  return 3.0 * (1 + 0.55 * Math.pow(Math.log(T / 14), 2));
}
/* Required n*tauE (m^-3.s) for ignition at temperature T (keV). */
function ignitionNTau(T) {
  return (ignitionTriple(T) * 1e21) / T;
}
/* Relative D-T reactivity over the operating window (normalized to 1 at 20 keV). */
function reactivity(T) {
  return Math.pow(T / 20, 2) * (1 / (1 + Math.pow(T / 48, 2.4)));
}

/* ---------- C4: transient dynamics ----------
   The "actual" continuous inputs chase the dialed setpoints with thermal and
   engineering time constants, so the plant ramps up and settles over seconds
   rather than snapping. The physics in calculateModel is unchanged; it simply
   reads these smoothed values. Setpoint labels still show the dialed value. */
const SMOOTH_KEYS = ["temperature", "magneticField", "fuelRate", "fuelBalance", "coolingFlow", "turbineLoad"];
const SMOOTH_TAU = { temperature: 2.4, magneticField: 1.1, fuelRate: 1.6, fuelBalance: 1.2, coolingFlow: 1.5, turbineLoad: 1.0 };
let smoothed = null;

/* ---------- Phase 3: burn-through dynamics ----------
   The actual core temperature is a state that self-heats from alpha power. The
   setpoint slider sets the external heating drive; alpha feedback can push the
   real temperature above it (ignition) or, when starved, let it collapse. The
   ceiling reflects the beta limit, past which rising pressure trips a disruption. */
const BURN_GAIN = 4.0;    // strength of alpha self-heating
const BURN_TAU = 3.0;     // thermal time constant (s)
const BURN_TMAX = 55;     // ceiling temperature (keV)
let burnT = null;
function rawInputs() {
  const o = {};
  for (const k of SMOOTH_KEYS) o[k] = Number(controls[k].value);
  return o;
}
function advanceDynamics(dt) {
  const raw = rawInputs();
  if (!smoothed) { smoothed = raw; return; }
  const quench = controls.emergencyQuench.checked;
  for (const k of SMOOTH_KEYS) {
    let tau = SMOOTH_TAU[k];
    if (quench && (k === "temperature" || k === "fuelRate")) tau = 0.35; // quench dumps energy fast
    const a = 1 - Math.exp(-dt / Math.max(0.05, tau));
    smoothed[k] += (raw[k] - smoothed[k]) * a;
  }

  // Burn-through: actual core temperature self-heats from alpha power. Past the
  // ignition threshold it climbs on its own; starve it and it collapses.
  if (burnT === null) burnT = smoothed.temperature;
  const n20 = (smoothed.fuelRate / 100) * (controls.pelletPulse.checked ? 1.05 : 0.9);
  const tauE = 2.1 * Math.pow(smoothed.magneticField / 8.8, 1.4) * (controls.divertorSweep.checked ? 1.06 : 1.0) * (quench ? 0.12 : 1);
  const alphaHeat = BURN_GAIN * n20 * reactivity(burnT) * gaussian(smoothed.fuelBalance, 50, 12) *
    (controls.neutralBeam.checked ? 1.14 : 0.82) * tauE * (quench ? 0.08 : 1);
  const Teq = clamp(smoothed.temperature + alphaHeat, 3, BURN_TMAX);
  const bTau = quench ? 0.5 : BURN_TAU;
  burnT += (Teq - burnT) * (1 - Math.exp(-dt / bTau));
  burnT = clamp(burnT, 3, BURN_TMAX);
}

function readState() {
  if (!smoothed) smoothed = rawInputs();
  if (burnT === null) burnT = smoothed.temperature;
  return {
    temperature: burnT,
    magneticField: smoothed.magneticField,
    fuelRate: smoothed.fuelRate,
    fuelBalance: smoothed.fuelBalance,
    coolingFlow: smoothed.coolingFlow,
    turbineLoad: smoothed.turbineLoad,
    neutralBeam: controls.neutralBeam.checked,
    pelletPulse: controls.pelletPulse.checked,
    divertorSweep: controls.divertorSweep.checked,
    emergencyQuench: controls.emergencyQuench.checked
  };
}

function calculateModel() {
  const s = readState();
  const T = s.temperature;
  const quench = s.emergencyQuench ? 0.08 : 1;
  const quenchTau = s.emergencyQuench ? 0.12 : 1;

  // Density (x1e20 m^-3) from fuel injection and pellet pacing
  const n20 = 1.0 * (s.fuelRate / 100) * (s.pelletPulse ? 1.05 : 0.9);

  // Confinement time tau_E (s): strong function of magnetic field, helped by divertor
  const tauE = 2.1 * Math.pow(s.magneticField / 8.8, 1.4) * (s.divertorSweep ? 1.06 : 1.0) * quenchTau;

  // Fusion triple product nT*tauE (x1e21 keV.s/m^3)
  const triple = (n20 * T * tauE) / 10;
  const tripleReq = ignitionTriple(T);
  const phi = clamp(triple / tripleReq, 0, 0.985);

  // Energy gain Q = 5*phi/(1-phi); 5 = 1/f_alpha (alphas carry ~20% of energy)
  const q = (5 * phi) / Math.max(0.015, 1 - phi);

  // Beta-style pressure vs magnetic pressure -> disruption risk
  const beta = (n20 * T) / (s.magneticField * s.magneticField);
  const betaRisk = clamp((beta - 0.42) * 1.45, 0, 0.92);
  // D1: Greenwald density limit. The achievable density scales with plasma current, which a stronger
  // field supports; pushing density past the limit triggers a distinct (non-beta) disruption. The plant
  // disrupts from whichever limit it crosses first, so the two combine as a max (normal operating points
  // sit well under the density limit, so this leaves the tuned presets unchanged).
  const greenwaldFrac = n20 / (0.155 * s.magneticField);
  const greenwaldRisk = clamp((greenwaldFrac - 0.95) * 1.2, 0, 0.9);
  const disruptionRisk = Math.max(betaRisk, greenwaldRisk);

  // Fusion power (MW)
  const balanceShape = gaussian(s.fuelBalance, 50, 12);
  const beamBoost = s.neutralBeam ? 1.14 : 0.82;
  const fusionPower = Math.max(
    0,
    1600 * n20 * n20 * reactivity(T) * balanceShape * beamBoost *
      (s.pelletPulse ? 1.04 : 0.94) * quench * (1 - disruptionRisk * 0.7)
  );

  // Power split: alpha (20%) stays, neutron (80%) -> blanket
  const pAlpha = 0.2 * fusionPower;
  const pNeutron = 0.8 * fusionPower;

  // D1: bremsstrahlung radiation, a real loss that grows with density squared and sqrt(T). It is small at
  // reactor conditions but dominates a cold, dense plasma, which is the lower branch of the ignition curve.
  const pRad = 8 * n20 * n20 * Math.sqrt(Math.max(1, T));

  // External heating implied by Q (consistent with the gain definition)
  let pExt = q > 0.05 ? fusionPower / q : 0;
  pExt = clamp(pExt, s.neutralBeam ? 20 : 5, 400);

  // Thermal -> turbine -> electricity
  const capture = clamp(0.8 + s.coolingFlow / 500, 0.8, 0.97);
  const thermalPower = Math.max(0, (pNeutron * 1.1 + pAlpha + pExt) * capture - pRad);   // D1: radiated power is not captured by the turbine
  const idealCooling = clamp(45 + (fusionPower / 1500) * 45, 40, 95);
  const coolingMatch = clamp(1 - Math.abs(s.coolingFlow - idealCooling) / 130, 0, 1);
  const overload = Math.max(0, s.turbineLoad - 88) / 400;
  const turbineEff = clamp(0.32 + coolingMatch * 0.13 - overload, 0.2, 0.46);
  const loadFactor = 0.55 + 0.45 * (s.turbineLoad / 100);
  const grossElec = thermalPower * turbineEff * loadFactor;
  const auxPower = 30 + s.magneticField * 5.5 + s.coolingFlow * 0.3 + s.fuelRate * 0.25;
  const recirc = auxPower + pExt / 0.5;
  const netElec = grossElec - recirc;

  // Plant-side telemetry
  const divertorRelief = s.divertorSweep ? 0.9 : 1.05;
  const wallLoad = (pNeutron / 120) * divertorRelief;
  const coolantTemp = 290 + (thermalPower / Math.max(15, s.coolingFlow)) * 14;
  const tritiumRatio = clamp(0.8 + pNeutron / 2600 + s.coolingFlow / 900 - Math.abs(s.fuelBalance - 50) / 150, 0.5, 1.4);

  const heatStress = clamp((coolantTemp - 560) / 240 + wallLoad / 26, 0, 1);
  const stability = clamp(
    100 * (0.34 + clamp(tauE / 2.6, 0, 1) * 0.3 + coolingMatch * 0.16 + balanceShape * 0.12 -
      disruptionRisk * 0.6 - heatStress * 0.3) * (s.emergencyQuench ? 0.25 : 1),
    0,
    100
  );

  // Operating-state label
  let label = "Startup";
  let stateColor = "#ffc24b";
  if (s.emergencyQuench) {
    label = "Quench"; stateColor = "#a896ff";
  } else if (stability < 28 || disruptionRisk > 0.6) {
    label = "Disruption Risk"; stateColor = "#ff5d5d";
  } else if (coolantTemp > 640 || wallLoad > 14) {
    label = "Thermal Limit"; stateColor = "#ff7a66";
  } else if (phi >= 0.95) {
    label = "Ignition"; stateColor = "#7ee787";
  } else if (netElec > 0) {
    label = "Net Power"; stateColor = "#7ee787";
  } else if (q >= 1) {
    label = "Burning Plasma"; stateColor = "#38e1c6";
  }

  const nTauActual = n20 * 1e20 * tauE;

  return {
    ...s, n20, tauE, triple, tripleReq, phi, q, beta, disruptionRisk,
    fusionPower, pAlpha, pNeutron, pExt, thermalPower, grossElec, recirc,
    netElec, wallLoad, coolantTemp, tritiumRatio, stability, nTauActual, pRad, greenwaldFrac,
    label, stateColor
  };
}

/* ---------- Readouts ---------- */
function updateReadouts() {
  model = calculateModel();

  // Setpoint labels show the dialed value; telemetry/stage show the actual (smoothed) response.
  outputs.temperatureValue.textContent = `${Number(controls.temperature.value).toFixed(1)} keV`;
  outputs.magneticFieldValue.textContent = `${Number(controls.magneticField.value).toFixed(1)} T`;
  outputs.fuelRateValue.textContent = `${Math.round(Number(controls.fuelRate.value))}%`;
  outputs.fuelBalanceValue.textContent = `${Number(controls.fuelBalance.value)} / ${100 - Number(controls.fuelBalance.value)}`;
  outputs.coolingFlowValue.textContent = `${Math.round(Number(controls.coolingFlow.value))}%`;
  outputs.turbineLoadValue.textContent = `${Math.round(Number(controls.turbineLoad.value))}%`;

  // A11y: give each slider a spoken value with units (screen readers otherwise read a bare number).
  controls.temperature.setAttribute("aria-valuetext", outputs.temperatureValue.textContent);
  controls.magneticField.setAttribute("aria-valuetext", outputs.magneticFieldValue.textContent);
  controls.fuelRate.setAttribute("aria-valuetext", outputs.fuelRateValue.textContent);
  controls.fuelBalance.setAttribute("aria-valuetext", `${outputs.fuelBalanceValue.textContent} deuterium to tritium`);
  controls.coolingFlow.setAttribute("aria-valuetext", outputs.coolingFlowValue.textContent);
  controls.turbineLoad.setAttribute("aria-valuetext", outputs.turbineLoadValue.textContent);

  outputs.reactorState.textContent = model.label;
  // A11y: announce only discrete reactor-state changes (not the continuous number stream).
  if (srStatus && model.label !== lastAnnouncedState) {
    lastAnnouncedState = model.label;
    srStatus.textContent = `Reactor state: ${model.label}. Net electric ${Math.round(model.netElec)} megawatts.`;
  }
  outputs.reactorState.style.background = model.stateColor;
  outputs.reactorState.style.boxShadow = `0 0 18px ${model.stateColor}66`;
  outputs.netPowerBadge.style.color = model.netElec > 0 ? "var(--green)" : "var(--coral)";
  // B3: the numeric readouts are tweened smoothly per frame in tweenReadouts()

  outputs.fusionPowerMeter.value = model.fusionPower;
  outputs.qMeter.value = Math.min(25, model.q);
  outputs.electricMeter.value = model.netElec;
  outputs.tripleMeter.value = Math.min(3.5, model.triple);
  outputs.confinementMeter.value = model.tauE;
  outputs.stabilityMeter.value = model.stability;

  setBar(outputs.wallLoadBar, model.wallLoad / 16, model.wallLoad > 12);
  setBar(outputs.coolantBar, (model.coolantTemp - 280) / 380, model.coolantTemp > 620);
  setBar(outputs.tritiumBar, model.tritiumRatio / 1.25, model.tritiumRatio < 1);

  // D1: radiated loss and Greenwald density fraction
  const radEl = document.getElementById("radLoss"); if (radEl) radEl.textContent = formatMw(model.pRad);
  const radBar = document.getElementById("radLossBar"); if (radBar) setBar(radBar, model.pRad / 120, model.pRad > model.fusionPower);
  const gwEl = document.getElementById("greenwaldFrac"); if (gwEl) gwEl.textContent = `${Math.round(model.greenwaldFrac * 100)}%`;
  const gwBar = document.getElementById("greenwaldBar"); if (gwBar) setBar(gwBar, model.greenwaldFrac / 1.1, model.greenwaldFrac > 0.9);

  // Stage readout (stageTemp is tweened in tweenReadouts)
  outputs.stageField.textContent = model.magneticField.toFixed(1);
  outputs.stageDensity.textContent = model.n20.toFixed(2);

  updatePowerBalance();
  updateLesson();
  updateCoach();
  updateRealWorld();
  updateAnnunciator();
  updatePlant();
  updatePeaks();
}

// Balance-of-plant panel: trace the reactor's heat to the grid, component by component.
function updatePlant() {
  if (!model || model.fusionPower === undefined) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const rejected = Math.max(0, (model.thermalPower || 0) - Math.max(0, model.grossElec || 0));
  set("plBlanket", formatMw(model.pNeutron));
  set("plSteam", `${Math.round(model.coolantTemp)} °C`);
  set("plTurbine", formatMw(Math.max(0, model.grossElec)));
  set("plCondenser", formatMw(rejected));
  set("plTower", `${Math.round(model.coolingFlow)}%`);
  set("plGrid", formatMw(model.netElec));
  const grid = document.getElementById("plGrid");
  if (grid) grid.style.color = model.netElec > 0 ? "var(--green)" : "var(--coral)";
}

/* ---------- B5: control-room annunciator lamps ---------- */
function updateAnnunciator() {
  const set = (id, on) => { const e = document.getElementById(id); if (e) e.classList.toggle("on", !!on); };
  set("lampBurn", model.q >= 1);
  set("lampNet", model.netElec > 0);
  set("lampIgnite", model.phi >= 0.95);
  set("lampBreed", model.tritiumRatio >= 1);
  set("lampThermal", model.coolantTemp > 640 || model.wallLoad > 14);
  set("lampDisrupt", model.disruptionRisk > 0.6 || model.stability < 28);
}

/* ---------- C3: real-world unit translator ---------- */
function updateRealWorld() {
  const el = document.getElementById("realWorld");
  if (!el) return;
  if (!unitMode) { el.hidden = true; return; }
  el.hidden = false;
  const milC = model.temperature * 11.6;          // 1 keV is about 11.6 million degrees C
  const sun = milC / 15;                            // the Sun's core is about 15 million degrees C
  const homes = Math.max(0, model.netElec) * 750;   // very roughly 750 US homes per MW of electricity
  const set = (id, txt) => { const n = document.getElementById(id); if (n) n.textContent = txt; };
  set("rwTemp", `${Math.round(milC).toLocaleString()} million °C`);
  set("rwTempSub", `about ${sun.toFixed(1)}x the Sun's core`);
  set("rwHomes", model.netElec > 0 ? `${Math.round(homes).toLocaleString()} homes` : "not yet net-positive");
  set("rwHomesSub", model.netElec > 0 ? `${formatMw(model.netElec)} reaching the grid` : "raise Q to send power out");
}

function setBar(element, amount, warning) {
  element.style.width = `${Math.round(clamp(amount, 0, 1) * 100)}%`;
  element.style.background = warning ? "var(--coral)" : "var(--teal)";
}

function updatePowerBalance() {
  const scale = Math.max(model.fusionPower, model.pExt, 200) * 1.05;
  outputs.pbExt.style.width = `${(model.pExt / scale) * 100}%`;
  outputs.pbAlpha.style.width = `${(model.pAlpha / scale) * 100}%`;
  outputs.pbNeutron.style.width = `${(model.pNeutron / scale) * 100}%`;
  outputs.pbExtVal.textContent = formatMw(model.pExt);
  outputs.pbFusVal.textContent = formatMw(model.fusionPower);
  // qBig is tweened in tweenReadouts
}

/* ---------- Lessons + coach ---------- */
function updateLesson() {
  const lesson = lessons[selectedTopic];
  const plain = readLevel === "plain" && lesson.plain;
  outputs.lessonTopic.textContent = lesson.topic;
  outputs.lessonTitle.textContent = plain ? lesson.plain.title : lesson.title;
  outputs.lessonBody.textContent = plain ? lesson.plain.body : lesson.body;
  outputs.lessonDeeper.textContent = lesson.deeper;
  outputs.lessonFormula.textContent = lesson.formula;
  outputs.lessonNote.textContent = plain ? lesson.plain.note : lesson.note;
}

function updateCoach() {
  outputs.coachText.textContent = getCoachMessage();
}

function getCoachMessage() {
  const plain = readLevel === "plain";
  if (model.emergencyQuench)
    return plain
      ? "Emergency stop is on. The reactor is dumping its heat on purpose to stay safe, so there is almost no power right now."
      : "Emergency quench engaged. Plasma energy is being dumped to protect the vessel and magnets, so fusion power is intentionally near zero.";
  if (model.disruptionRisk > 0.6)
    return plain
      ? "Danger: the hot gas is pushing harder than the magnets can hold. Turn the magnetic field up or ease off the fuel before it breaks apart."
      : "Plasma pressure is outrunning the magnetic field (high beta). You are near a disruption. Raise the magnetic field or ease back fuel injection.";
  if (model.temperature < 9 && model.fuelRate > 25)
    return plain
      ? "There is fuel, but it is too cold to fuse. Turn the temperature up."
      : "Fuel is present but the ions are too cool to fuse efficiently. Raise plasma temperature to climb the reactivity curve.";
  if (model.magneticField < 4.4 && model.fuelRate > 60)
    return plain
      ? "The magnets are too weak for this much fuel, so the heat leaks out. Turn the field up before adding more fuel."
      : "Confinement is weak for this much fuel, so energy leaks out faster than it is produced. Strengthen the field before fuelling harder.";
  if (model.coolantTemp > 620)
    return plain
      ? "The coolant is getting too hot. Turn the coolant up or ease off the power."
      : "Coolant outlet is running hot. Increase blanket coolant flow or trim fusion power to protect the heat exchangers.";
  if (model.phi >= 0.95)
    return plain
      ? "Ignition! The reactor now heats itself and keeps going on its own. This is the goal."
      : "Ignition. Alpha self-heating now sustains the burn on its own, external heating can be pulled right back, and Q has run away. This is the goal.";
  if (model.tritiumRatio < 1 && model.fusionPower > 200)
    return plain
      ? "Good burn, but it is using fuel faster than it makes it. Nudge the cooling and keep the D-T mix even."
      : "Strong burn, but the breeding ratio is below 1.0, so the plant is consuming tritium faster than it makes it. Nudge cooling and keep the D-T blend balanced.";
  if (model.netElec > 0)
    return plain
      ? `Net positive: ${formatMw(model.netElec)} going to the grid. You are about ${Math.round(model.phi * 100)}% of the way to ignition.`
      : `Net positive: ${formatMw(model.netElec)} after recirculating power. The triple product is ${model.triple.toFixed(2)}×10²¹, about ${Math.round(model.phi * 100)}% of the way to ignition.`;
  if (model.q >= 1)
    return plain
      ? "It is now making more energy than you put in. Push the field and fuel to turn that into real electricity."
      : "Burning plasma. Fusion power now exceeds the heating you supply (Q above 1). Push confinement and density to turn that into net electricity.";
  return plain
    ? "Not there yet. Turn up the temperature and the magnetic field together to get closer to ignition."
    : "Below breakeven. Build temperature and confinement together to lift the operating point toward the ignition curve at right.";
}

/* ---------- Canvas sizing ---------- */
function resizeCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return rect; // hidden (e.g. presentation mode): keep last size
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * scale));
  const height = Math.max(1, Math.floor(rect.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  return rect;
}

/* ===========================================================
   REACTOR 3D ENGINE  (software-rendered, dependency-free)

   A real 3D scene drawn on the 2D canvas. Every component is
   defined by genuine 3D geometry in a right-handed world where
   +Y is up and the plasma torus lies in the X-Z plane:

     centerline(th)      = ( R cos th, 0, R sin th )
     surface(th, ph)     = ( (R + r cos ph) cos th,
                              r sin ph,
                              (R + r cos ph) sin th )

   A yaw/pitch camera rotates the world, a perspective divide
   projects to the screen, and a painter's-algorithm pass sorts
   every primitive by camera-space depth so occlusion is correct.
   Drag to orbit, scroll to zoom; it auto-rotates when idle.
   =========================================================== */

/* World-space dimensions (plasma major radius R = 1). */
const R = 1.0;
const A_PLASMA = 0.32;   // plasma minor radius
const A_COIL = 0.40;     // toroidal-field coil radius (cages the plasma)
const A_VESSEL = 0.52;   // vacuum vessel / blanket shell radius
const SOL_R = 0.17;      // central solenoid radius
const SOL_H = 0.74;      // central solenoid half-height

/* Camera + interaction state. */
const cam = { yaw: -0.62, pitch: 0.60, dist: 3.15, focalK: 0.95 };
let dragOn = false, dragX = 0, dragY = 0, lastInteract = -9999, prevTime = 0;
let reduceMotion = false, inputBound = false;
let velYaw = 0, velPitch = 0;
let panX = 0, panY = 0, panMode = false;
const CAM_DEFAULT = { yaw: -0.62, pitch: 0.60, dist: 3.15 };
let autoSpin = true;     // idle auto-rotation enabled
let panSticky = false;   // pan latched from the HUD button (so non-shift / touch can pan)
let camTween = null;     // active camera fly-to {from,dYaw,to,t0,dur}, or null

/* Canonical viewpoints reachable from the gizmo. */
const VIEW_PRESETS = {
  iso:   { yaw: -0.62,   pitch: 0.60, dist: 3.15 },
  top:   { yaw: -0.62,   pitch: -1.45, dist: 3.45 },
  front: { yaw: 0.0,     pitch: 0.16, dist: 3.30 },
  side:  { yaw: -1.5708, pitch: 0.18, dist: 3.45 }
};

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
/* Smoothly fly the camera to a target {yaw,pitch,dist}. Leaves pan untouched. */
function animateCameraTo(target, dur) {
  camTween = {
    from: { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist },
    dYaw: shortestAngle(cam.yaw, target.yaw),
    to: { pitch: target.pitch, dist: target.dist },
    t0: performance.now(),
    dur: dur || 620
  };
  velYaw = 0; velPitch = 0; lastInteract = performance.now();
}
function snapToView(name) {
  const v = VIEW_PRESETS[name];
  if (!v) return;
  animateCameraTo(v, 620);
  panX = 0; panY = 0;
}
function resetCamera() {
  camTween = null;
  cam.yaw = CAM_DEFAULT.yaw; cam.pitch = CAM_DEFAULT.pitch; cam.dist = CAM_DEFAULT.dist;
  velYaw = 0; velPitch = 0; panX = 0; panY = 0; lastInteract = performance.now();
}

/* Balance-of-plant anchors (off to +X so the plant sits beside the reactor). */
const BOP = {
  sg: { x: 2.05, y: -0.12, z: 0.55 },   // steam generator
  turb: { x: 2.42, y: -0.40, z: 0.18 }, // turbine
  gen: { x: 3.18, y: -0.06, z: -0.12 }, // generator
  cond: { x: 2.72, y: -0.66, z: 0.18 }, // condenser
  grid: { x: 3.40, y: 0.52, z: -0.42 }  // grid / pylon
};

/* ---- small 3D helpers ---- */
function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function plasmaColor(t) {
  const stops = [[120, 40, 95], [232, 92, 70], [255, 182, 112], [255, 236, 182], [182, 236, 255]];
  const x = clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mixColor(stops[i], stops[i + 1], x - i);
}

/* Projection context, rebuilt each frame for the current canvas size. */
let PROJ = { cx: 0, cy: 0, focal: 1 };
function project(x, y, z) {
  const cy0 = Math.cos(cam.yaw), sy0 = Math.sin(cam.yaw);
  const x1 = x * cy0 - z * sy0;
  const z1 = x * sy0 + z * cy0;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  let depth = z2 + cam.dist;
  if (depth < 0.05) depth = 0.05;
  const s = PROJ.focal / depth;
  return { x: PROJ.cx + x1 * s, y: PROJ.cy - y2 * s, depth, s };
}

/* Nearer geometry (smaller depth) is brighter. */
function depthBright(depth) {
  return clamp(1 - (depth - (cam.dist - 1.5)) / 3.0, 0, 1);
}

/* A torus point: toroidal angle th, poloidal angle ph, minor radius r. */
function torusPt(th, ph, r) {
  const cph = Math.cos(ph), rr = R + r * cph;
  return [rr * Math.cos(th), r * Math.sin(ph), rr * Math.sin(th)];
}

/* Project an array of [x,y,z] points; returns {pts, depth} with mean depth. */
function projectAll(world) {
  const pts = new Array(world.length);
  let d = 0;
  for (let i = 0; i < world.length; i += 1) {
    const p = project(world[i][0], world[i][1], world[i][2]);
    pts[i] = p; d += p.depth;
  }
  return { pts, depth: d / world.length };
}

function tracePts(ctx, pts, close) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 1) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
    else ctx.lineTo(pts[i].x, pts[i].y);
  }
  if (close) ctx.closePath();
}

/* ---- particles ---- */
function seedParticles() {
  particles = Array.from({ length: liteMode ? 96 : 168 }, () => {
    const r = Math.random();
    const species = r < 0.38 ? "D" : r < 0.76 ? "T" : r < 0.88 ? "alpha" : "electron";
    const sizeMul = species === "electron" ? 0.6 : species === "alpha" ? 1.4 : 1;
    const spMul = species === "electron" ? 1.8 : species === "alpha" ? 0.8 : 1;
    return {
      th: Math.random() * Math.PI * 2,
      ph: Math.random() * Math.PI * 2,
      lane: 0.18 + Math.random() * 0.78,
      sp: (0.5 + Math.random() * 1.7) * spMul,
      size: (0.010 + Math.random() * 0.018) * sizeMul,
      species
    };
  });
  sparks = [];
  alphas = [];
  fusionAcc = 0;
  neutrons = Array.from({ length: liteMode ? 28 : 64 }, () => ({
    th: Math.random() * Math.PI * 2,
    ph: Math.random() * Math.PI * 2,
    life: Math.random(),
    sp: 0.6 + Math.random() * 0.9
  }));
  prevTime = 0;
}

/* ---- input (orbit + zoom) ---- */
function bindInput() {
  if (inputBound) return;
  inputBound = true;
  reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  reactorCanvas.style.cursor = "grab";
  reactorCanvas.style.touchAction = "pan-y";   // U2: vertical swipes scroll the page; horizontal drags orbit
  let touchAxis = null, touchStartX = 0, touchStartY = 0;   // U2: one-finger directional lock

  const down = (cx, cy, pan) => { camTween = null; dragOn = true; dragX = cx; dragY = cy; panMode = !!pan; lastInteract = performance.now(); reactorCanvas.style.cursor = pan ? "move" : "grabbing"; };
  const move = (cx, cy) => {
    if (!dragOn) return;
    const ddx = cx - dragX, ddy = cy - dragY;
    if (panMode) {
      panX += ddx; panY += ddy;
    } else {
      const dyaw = ddx * 0.0095;
      const dpitch = -ddy * 0.0095;
      cam.yaw += dyaw;
      cam.pitch = clamp(cam.pitch + dpitch, -1.45, 1.45);
      velYaw = dyaw; velPitch = dpitch;
    }
    dragX = cx; dragY = cy; lastInteract = performance.now();
  };
  const up = () => { dragOn = false; panMode = false; touchAxis = null; reactorCanvas.style.cursor = panSticky ? "move" : "grab"; };

  reactorCanvas.addEventListener("mousedown", (e) => down(e.clientX, e.clientY, e.button === 2 || e.shiftKey || panSticky));
  reactorCanvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  window.addEventListener("mouseup", up);
  reactorCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.dist = clamp(cam.dist + e.deltaY * 0.0022, 1.9, 6.4);
    lastInteract = performance.now();
  }, { passive: false });
  reactorCanvas.addEventListener("touchstart", (e) => {
    if (!e.touches[0]) return;
    const manip = e.touches.length >= 2 || panSticky;   // two-finger or latched pan is a deliberate manipulation
    touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
    touchAxis = manip ? "orbit" : null;                 // single finger: decide on first move (below)
    down(touchStartX, touchStartY, manip);
  }, { passive: true });
  reactorCanvas.addEventListener("touchmove", (e) => {
    if (!e.touches[0]) return;
    const x = e.touches[0].clientX, y = e.touches[0].clientY;
    if (touchAxis === null) {
      const dx = Math.abs(x - touchStartX), dy = Math.abs(y - touchStartY);
      if (dx < 8 && dy < 8) return;                      // wait until the gesture has a clear direction
      if (dy > dx) { touchAxis = "scroll"; dragOn = false; return; }   // U2: vertical → let the page scroll
      touchAxis = "orbit";                               // horizontal → orbit the reactor
    }
    if (touchAxis === "scroll") return;                  // the browser scrolls; don't fight it
    move(x, y); e.preventDefault();
  }, { passive: false });
  window.addEventListener("touchend", up);
  reactorCanvas.addEventListener("dblclick", () => resetCamera());
  window.addEventListener("keydown", (e) => { if (e.key === "r" || e.key === "R") resetCamera(); });
  // A4: keyboard control of the 3D stage - focusable canvas, arrows orbit, +/- zoom, R resets.
  reactorCanvas.setAttribute("tabindex", "0");
  reactorCanvas.addEventListener("keydown", (e) => {
    let used = true; const a = 0.18;
    if (e.key === "ArrowLeft") cam.yaw -= a;
    else if (e.key === "ArrowRight") cam.yaw += a;
    else if (e.key === "ArrowUp") cam.pitch = clamp(cam.pitch - a, -1.45, 1.45);
    else if (e.key === "ArrowDown") cam.pitch = clamp(cam.pitch + a, -1.45, 1.45);
    else if (e.key === "+" || e.key === "=") cam.dist = clamp(cam.dist - 0.35, 1.9, 6.4);
    else if (e.key === "-" || e.key === "_") cam.dist = clamp(cam.dist + 0.35, 1.9, 6.4);
    else used = false;
    if (used) { e.preventDefault(); camTween = null; lastInteract = performance.now(); }
  });

  // hotspots are repositioned every frame; keep their transitions off-position
  hotspots.forEach((b) => { b.style.transitionProperty = "background-color, border-color, box-shadow, color, opacity"; });
}

/* ===========================================================
   Phase 3: WebGL volumetric plasma (raw WebGL, no library)
   Raymarches a glowing torus volume on an offscreen canvas, then composites it
   into the 2D reactor at the core's depth. Falls back to the 2D plasma discs if
   WebGL is unavailable or the shader fails to compile. Camera matched to project().
   =========================================================== */
let glCanvas = null, glx = null, glProg = null, glReady = false, glFailed = false, glLost = false;
const glLoc = {};
const PLASMA_VS = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;
const PLASMA_FS = `
precision highp float;
uniform vec2 uRes; uniform float uCx, uCy, uFocal, uTime, uIntensity, uR, uA, uRb;
uniform vec3 uEye, uColor, uHot; uniform mat3 uInvRot;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
                 mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
                 mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 3; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
float tubeDist(vec3 p){ vec2 q = vec2(length(p.xz) - uR, p.y); return length(q); }
void main(){
  float sx = gl_FragCoord.x;
  float sy = uRes.y - gl_FragCoord.y;
  vec3 rdCam = normalize(vec3((sx - uCx) / uFocal, (uCy - sy) / uFocal, 1.0));
  vec3 rd = normalize(uInvRot * rdCam);
  vec3 ro = uEye;
  float b = dot(ro, rd);
  float c = dot(ro, ro) - uRb * uRb;
  float disc = b * b - c;
  if(disc < 0.0){ gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float sq = sqrt(disc);
  float t0 = max(0.0, -b - sq), t1 = -b + sq;
  float dt = (t1 - t0) / 60.0;
  float t = t0;
  float tube = uA * 1.2;
  vec3 col = vec3(0.0); float alpha = 0.0;
  for(int i = 0; i < 60; i++){
    vec3 p = ro + rd * t;
    float d = tubeDist(p);
    if(d < tube){
      float dens = pow(clamp(1.0 - d / tube, 0.0, 1.0), 1.4);
      float n = fbm(p * 3.1 + vec3(0.0, uTime * 0.0004, uTime * 0.0005));
      dens *= 0.5 + 0.95 * n;
      vec3 cc = mix(uColor, uHot, clamp((1.0 - d / tube) * 1.5 - 0.3, 0.0, 1.0));
      float e = dens * 0.11 * (0.45 + uIntensity);
      col += cc * e * (1.0 - alpha);
      alpha += e * (1.0 - alpha);
    }
    t += dt;
  }
  gl_FragColor = vec4(col * 1.35, 1.0);
}
`;
function glCompile(type, src) {
  const sh = glx.createShader(type);
  glx.shaderSource(sh, src); glx.compileShader(sh);
  if (!glx.getShaderParameter(sh, glx.COMPILE_STATUS)) { console.warn("plasma shader:", glx.getShaderInfoLog(sh)); return null; }
  return sh;
}
// C4: build (or rebuild) the GL program + buffer on the current context. Re-runnable after a context restore.
function buildPlasmaGLResources() {
  const vs = glCompile(glx.VERTEX_SHADER, PLASMA_VS), fs = glCompile(glx.FRAGMENT_SHADER, PLASMA_FS);
  if (!vs || !fs) return false;
  glProg = glx.createProgram();
  glx.attachShader(glProg, vs); glx.attachShader(glProg, fs); glx.linkProgram(glProg);
  if (!glx.getProgramParameter(glProg, glx.LINK_STATUS)) return false;
  glx.useProgram(glProg);
  const buf = glx.createBuffer();
  glx.bindBuffer(glx.ARRAY_BUFFER, buf);
  glx.bufferData(glx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), glx.STATIC_DRAW);
  const ap = glx.getAttribLocation(glProg, "aPos");
  glx.enableVertexAttribArray(ap); glx.vertexAttribPointer(ap, 2, glx.FLOAT, false, 0, 0);
  ["uRes", "uCx", "uCy", "uFocal", "uTime", "uIntensity", "uR", "uA", "uRb", "uEye", "uColor", "uHot", "uInvRot"].forEach((n) => { glLoc[n] = glx.getUniformLocation(glProg, n); });
  glx.clearColor(0, 0, 0, 1);
  return true;
}
function initPlasmaGL() {
  if (glReady) return true;
  if (glFailed) return false;
  if (glLost) return false;   // C4: context lost; wait for restore rather than spawning a new one
  try {
    glCanvas = document.createElement("canvas");
    const opts = { alpha: false, antialias: true, depth: false, premultipliedAlpha: false, powerPreference: "low-power" };
    glx = glCanvas.getContext("webgl", opts) || glCanvas.getContext("experimental-webgl", opts);
    if (!glx) { glFailed = true; return false; }
    // C4: recover from a GPU context loss (driver reset, sleep/wake) instead of dying on a black plasma.
    glCanvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); glReady = false; glLost = true; }, false);
    glCanvas.addEventListener("webglcontextrestored", () => { glLost = false; glProg = null; if (buildPlasmaGLResources()) glReady = true; }, false);
    if (!buildPlasmaGLResources()) { glFailed = true; return false; }
    glReady = true;
    return true;
  } catch (e) { glFailed = true; return false; }
}
function renderPlasmaGL(w, h, pColor, hotCore, intensity, time) {
  if (!glReady) return false;
  // F3: supersample the volumetric core so it is sharp on retina tablets (the 2D coils render at full
  // device resolution; the plasma was rendering at CSS px and upscaling). Capped at 2x, off under lite.
  const s = liteMode ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(2, Math.floor(w * s)), H = Math.max(2, Math.floor(h * s));
  if (glCanvas.width !== W || glCanvas.height !== H) { glCanvas.width = W; glCanvas.height = H; }
  glx.viewport(0, 0, W, H);
  glx.clear(glx.COLOR_BUFFER_BIT);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw);
  // invRot = Ry(-yaw) * Rx(-pitch), column-major
  const invRot = [cyw, 0, -syw, -syw * sp, cp, -cyw * sp, syw * cp, sp, cyw * cp];
  glx.uniform2f(glLoc.uRes, W, H);
  glx.uniform1f(glLoc.uCx, PROJ.cx * s);
  glx.uniform1f(glLoc.uCy, PROJ.cy * s);
  glx.uniform1f(glLoc.uFocal, PROJ.focal * s);
  glx.uniform1f(glLoc.uTime, reduceMotion ? 0 : time);
  glx.uniform1f(glLoc.uIntensity, intensity);
  glx.uniform1f(glLoc.uR, R);
  glx.uniform1f(glLoc.uA, A_PLASMA);
  glx.uniform1f(glLoc.uRb, R + A_PLASMA * 1.3 + 0.1);
  glx.uniform3f(glLoc.uEye, cam.dist * (-cp * syw), cam.dist * (-sp), cam.dist * (-cp * cyw));
  glx.uniform3f(glLoc.uColor, pColor[0] / 255, pColor[1] / 255, pColor[2] / 255);
  glx.uniform3f(glLoc.uHot, hotCore[0] / 255, hotCore[1] / 255, hotCore[2] / 255);
  glx.uniformMatrix3fv(glLoc.uInvRot, false, invRot);
  glx.drawArrays(glx.TRIANGLES, 0, 3);
  return true;
}

/* ===========================================================
   Main reactor render
   =========================================================== */
function drawReactor(time) {
  const rect = resizeCanvas(reactorCanvas, reactorCtx);
  const ctx = reactorCtx;
  const w = rect.width, h = rect.height;
  const size = Math.min(w, h);
  bindInput();

  let dt = time - prevTime;
  prevTime = time;
  if (!(dt > 0) || dt > 60) dt = 16;

  // A4: decay neutron wall-heat each frame (half-life ~700 ms)
  if (wallHeat.length !== 26) wallHeat = new Array(26).fill(0);
  const whDecay = Math.pow(0.5, dt / 700);
  for (let i = 0; i < 26; i += 1) wallHeat[i] *= whDecay;

  if (camTween) {
    const k = clamp((time - camTween.t0) / camTween.dur, 0, 1);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
    cam.yaw = camTween.from.yaw + camTween.dYaw * e;
    cam.pitch = camTween.from.pitch + (camTween.to.pitch - camTween.from.pitch) * e;
    cam.dist = camTween.from.dist + (camTween.to.dist - camTween.from.dist) * e;
    if (k >= 1) camTween = null;
  } else {
    if (!dragOn) {
      cam.yaw += velYaw;
      cam.pitch = clamp(cam.pitch + velPitch, -1.45, 1.45);
      velYaw *= 0.90; velPitch *= 0.90;
      if (Math.abs(velYaw) < 0.00006) velYaw = 0;
      if (Math.abs(velPitch) < 0.00006) velPitch = 0;
    }
    if (autoSpin && !reduceMotion && !dragOn && velYaw === 0 && time - lastInteract > 3500) cam.yaw += dt * 0.00006;
  }

  updateDisruption(dt);
  const shk = disruptionShake();
  PROJ.cx = w * 0.5 + panX + (shk ? (Math.random() * 2 - 1) * shk : 0);
  PROJ.cy = h * 0.45 + panY + (shk ? (Math.random() * 2 - 1) * shk : 0);
  PROJ.focal = size * cam.focalK;
  updateViewDir();

  const tNorm = clamp((model.temperature - 6) / 22, 0, 1);
  const intensity = clamp(model.fusionPower / 1200, 0.05, 1);
  const bNorm = clamp(model.magneticField / 8.8, 0.18, 1);
  const pColor = plasmaColor(tNorm);
  const stateRgb = hexToRgb(model.stateColor);

  ctx.clearRect(0, 0, w, h);
  drawAtmosphere(ctx, w, h, intensity);
  drawCoreShaft(ctx, intensity, stateRgb);

  /* ---- assemble depth-sorted primitives ---- */
  const prims = [];

  // central solenoid - a solid, shaded, ribbed coil-stack column up the central axis:
  // the transformer that drives the plasma current. Subtle field-driven energized tint.
  const solEnergy = clamp((bNorm - 0.18) / 0.82, 0, 1);
  const solRgb = mixColor([140, 148, 172], [152, 172, 236], solEnergy * 0.7);
  const solNodes = [];
  const solTurns = 14;
  for (let i = 0; i <= solTurns; i += 1) {
    solNodes.push({ d: (2 * SOL_H) * (i / solTurns), r: SOL_R * (i % 2 === 0 ? 0.93 : 1.05) });
  }
  addRevolution(prims, ctx, [0, -SOL_H, 0], [0, 1, 0], solNodes, 18, solRgb, 1, true);

  // vacuum vessel / blanket shell - ghostly amber cage of poloidal ribs
  for (let ci = 0; ci < 26; ci += 1) {
    const th = (ci / 26) * Math.PI * 2;
    const loop = [];
    for (let a = 0; a <= 30; a += 1) loop.push(torusPt(th, (a / 30) * Math.PI * 2, A_VESSEL));
    const pr = projectAll(loop);
    const b = depthBright(pr.depth);
    const hc = clamp(wallHeat[ci] || 0, 0, 1); // A4: neutron heat on this rib (amber -> white-hot)
    const gg = Math.round(196 + 50 * hc), bb = Math.round(96 + 150 * hc);
    const al = Math.min(0.95, (0.05 + 0.10 * b) * (0.6 + intensity * 0.5) + hc * 0.55);
    const lw = 1 + hc * 1.8;
    prims.push({ z: pr.depth + 0.001, d: () => {
      tracePts(ctx, pr.pts, true);
      ctx.strokeStyle = `rgba(255,${gg},${bb},${al})`;
      ctx.lineWidth = lw;
      if (hc > 0.35) { ctx.save(); ctx.shadowColor = "rgba(255,180,120,0.7)"; ctx.shadowBlur = 7 * hc; ctx.stroke(); ctx.restore(); } else { ctx.stroke(); }
    } });
  }
  // a couple of toroidal vessel hoops for read
  [0.0, Math.PI].forEach((ph) => {
    const hoop = [];
    for (let a = 0; a <= 80; a += 1) hoop.push(torusPt((a / 80) * Math.PI * 2, ph, A_VESSEL));
    for (let seg = 0; seg < 4; seg += 1) {
      const slice = hoop.slice(seg * 20, seg * 20 + 21);
      const pr = projectAll(slice);
      prims.push({ z: pr.depth + 0.002, d: () => { tracePts(ctx, pr.pts, false); ctx.strokeStyle = `rgba(120,132,156,${0.05 + 0.10 * depthBright(pr.depth)})`; ctx.lineWidth = 1; ctx.stroke(); } });
    }
  });

  // outer poloidal-field coils - solid ring magnets for plasma position + shaping
  addPFCoils(prims, ctx, bNorm);

  // toroidal field coils - solid, shaded D-shaped magnets caging the plasma
  addDCoils(prims, ctx, bNorm);

  // plasma body - WebGL volumetric raymarch if available, else 2D additive discs
  const hotCore = mixColor(pColor, [255, 255, 245], 0.5);
  if (initPlasmaGL() && renderPlasmaGL(w, h, pColor, hotCore, intensity, time)) {
    // composite the GL glow at the core's depth so the coils still weave in front/behind
    const cDepth = project(0, 0, 0).depth;
    prims.push({ z: cDepth, d: () => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glCanvas, 0, 0, w, h);
      ctx.restore();
    } });
  } else {
    const ND = 56;
    for (let di = 0; di < ND; di += 1) {
      const th = (di / ND) * Math.PI * 2;
      const c = project(R * Math.cos(th), 0, R * Math.sin(th));
      // A2: living-plasma turbulence - cheap layered sines make the core churn and flicker
      const fl = reduceMotion ? 1 : (0.86 + 0.14 * Math.sin(time * 0.0045 + di * 0.7) + 0.09 * Math.sin(time * 0.012 + di * 2.3));
      const radPulse = reduceMotion ? 1 : (0.97 + 0.05 * Math.sin(time * 0.006 + di * 1.5));
      const rad = Math.max(2, A_PLASMA * c.s) * radPulse;
      const coreA = (0.22 + intensity * 0.34) * fl;
      const midA = (0.10 + intensity * 0.16) * fl;
      prims.push({ z: c.depth - 0.0005, d: () => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad * 1.25);
        g.addColorStop(0, `rgba(${hotCore[0]},${hotCore[1]},${hotCore[2]},${coreA})`);
        g.addColorStop(0.4, `rgba(${pColor[0]},${pColor[1]},${pColor[2]},${midA})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c.x, c.y, rad * 1.25, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } });
    }
  }

  // bright separatrix + a couple of surface striations
  [0.0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((ph, idx) => {
    const loop = [];
    for (let a = 0; a <= 90; a += 1) loop.push(torusPt((a / 90) * Math.PI * 2, ph, A_PLASMA));
    for (let seg = 0; seg < 6; seg += 1) {
      const slice = loop.slice(seg * 15, seg * 15 + 16);
      const pr = projectAll(slice);
      const b = depthBright(pr.depth);
      const cc = mixColor([60, 150, 170], pColor, 0.5);
      const al = (idx === 0 ? 0.30 : 0.12) * (0.4 + b * 0.8) * (0.6 + intensity * 0.6);
      prims.push({ z: pr.depth - 0.001, d: () => {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        tracePts(ctx, pr.pts, false);
        ctx.strokeStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${al})`;
        ctx.lineWidth = idx === 0 ? 1.6 : 1.0; ctx.stroke(); ctx.restore();
      } });
    }
  });

  // helical magnetic field lines on the plasma surface
  const NL = 7, Q = 4, SPIN = reduceMotion ? 0 : time * 0.00028;
  for (let li = 0; li < NL; li += 1) {
    const ph0 = (li / NL) * Math.PI * 2 + SPIN;
    const line = [];
    for (let s = 0; s <= 160; s += 1) { const th = (s / 160) * Math.PI * 2; line.push(torusPt(th, Q * th + ph0, A_PLASMA * 1.04)); }
    for (let seg = 0; seg < 8; seg += 1) {
      const slice = line.slice(seg * 20, seg * 20 + 21);
      const pr = projectAll(slice);
      const b = depthBright(pr.depth);
      const al = (0.18 + 0.45 * b) * (0.45 + bNorm * 0.7);
      prims.push({ z: pr.depth - 0.002, d: () => {
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
        tracePts(ctx, pr.pts, false);
        ctx.strokeStyle = `rgba(${90 + Math.round(intensity * 60)},${200},${255},${clamp(al, 0, 0.85)})`;
        ctx.lineWidth = 1.0 + b * 1.1 + bNorm * 0.9; // A6: thicker, denser-looking field at higher B
        if (!reduceMotion) { ctx.setLineDash([9, 7]); ctx.lineDashOffset = -time * (0.05 + bNorm * 0.08); } // A6: flow shows direction
        if (b > 0.6) { ctx.shadowColor = "rgba(120,210,255,0.5)"; ctx.shadowBlur = 5 * b; }
        ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.restore();
      } });
    }
  }

  // ions streaming around the torus
  const speedScale = (reduceMotion ? 0 : 1) * (0.4 + model.temperature / 11);
  for (const p of particles) {
    p.th += dt * 0.00016 * p.sp * speedScale;
    const ph = p.ph + Math.sin(time * 0.0009 + p.lane * 6) * 0.25;
    const w0 = torusPt(p.th, ph, A_PLASMA * 0.92 * p.lane);
    const c = project(w0[0], w0[1], w0[2]);
    const w1 = torusPt(p.th - 0.05 * p.sp, ph, A_PLASMA * 0.92 * p.lane);
    const tail = project(w1[0], w1[1], w1[2]);
    const rad = Math.max(0.8, p.size * c.s);
    // A6: color by species (deuterium, tritium, helium ash, electron)
    const col = p.species === "alpha" ? "255,206,110" : p.species === "T" ? "255,150,110" : p.species === "electron" ? "215,216,240" : "150,200,255";
    const al = 0.22 + intensity * 0.55;
    prims.push({ z: c.depth - 0.0015, d: () => {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${col},${al * 0.5})`; ctx.lineWidth = rad * 0.9;
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${al})`;
      ctx.beginPath(); ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } });
  }

  // neutrons streaming from the plasma surface into the blanket (80% of fusion energy)
  for (const nu of neutrons) {
    nu.life += dt * 0.0016 * nu.sp * (0.4 + intensity);
    if (nu.life > 1) {
      const bin = ((Math.floor((nu.th / (Math.PI * 2)) * 26) % 26) + 26) % 26; // A4: deposit heat where it struck
      wallHeat[bin] = Math.min(1.4, wallHeat[bin] + intensity * (model.divertorSweep ? 0.10 : 0.18));
      nu.life = 0; nu.th = Math.random() * Math.PI * 2; nu.ph = Math.random() * Math.PI * 2;
    }
    const r1 = A_PLASMA + (A_VESSEL - A_PLASMA) * nu.life;
    const a0 = project(...torusPt(nu.th, nu.ph, r1));
    const a1 = project(...torusPt(nu.th, nu.ph, Math.max(A_PLASMA, r1 - (A_VESSEL - A_PLASMA) * 0.16)));
    const al = clamp((1 - nu.life) * intensity * 0.7, 0, 0.7);
    prims.push({ z: a0.depth - 0.0009, d: () => {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(255,210,140,${al})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a0.x, a0.y); ctx.stroke();
      ctx.restore();
    } });
  }

  // A1: in-core fusion events - flashes and lingering alphas, rate scaled to fusion power
  updateFusionEvents(prims, ctx, dt, time, intensity);

  // divertor - red exhaust ring at the bottom of the tube (split for occlusion)
  const sweep = (model.divertorSweep && !reduceMotion) ? Math.sin(time * 0.004) * 0.10 : 0;
  const dLoad = clamp(0.3 + model.wallLoad / 14, 0.3, 1) * (0.5 + intensity * 0.6);
  for (let seg = 0; seg < 6; seg += 1) {
    const slice = [];
    for (let a = 0; a <= 16; a += 1) { const th = ((seg * 16 + a) / 96) * Math.PI * 2; slice.push(torusPt(th, -Math.PI / 2 + sweep, A_PLASMA * 1.02)); }
    const pr = projectAll(slice);
    prims.push({ z: pr.depth - 0.0008, d: () => {
      ctx.save(); ctx.lineCap = "round"; ctx.globalCompositeOperation = "lighter";
      tracePts(ctx, pr.pts, false);
      ctx.strokeStyle = `rgba(255,110,90,${0.3 + dLoad * 0.5})`;
      ctx.lineWidth = 3.0 + dLoad * 3.0;
      ctx.shadowColor = "#ff7a66"; ctx.shadowBlur = 10 * dLoad; ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();
    } });
  }

  // A5: optional human + scale reference (the plant now lives in the Balance of Plant panel)
  addScaleReference(prims, ctx);

  /* ---- paint sorted ---- */
  prims.sort((a, b) => b.z - a.z);
  const fogNear = cam.dist - 0.7, fogSpan = 2.2;
  for (let i = 0; i < prims.length; i += 1) {
    ctx.globalAlpha = clamp(1 - ((prims[i].z - fogNear) / fogSpan) * 0.6, 0.4, 1);
    prims[i].d();
  }
  ctx.globalAlpha = 1;

  // foreground bloom at the core
  const core = project(0, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const bg = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, (A_PLASMA + 0.4) * core.s);
  bg.addColorStop(0, `rgba(${stateRgb[0]},${stateRgb[1]},${stateRgb[2]},${0.05 + intensity * 0.16})`);
  bg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(core.x, core.y, (A_PLASMA + 0.4) * core.s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  applyBloom(ctx, w, h, 0.32 + intensity * 0.42);
  drawVignette(ctx, w, h);
  drawDisruptionFlash(ctx, w, h);
  drawTitle(ctx, w, h);
  positionHotspots();
}

/* ---- 3D balance-of-plant: flat-shaded solids in world space ---- */
const LIGHT = (() => { const v = [-0.35, 0.85, 0.4]; const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
function v3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function v3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function basisFor(axis) {
  const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const v = v3norm(v3cross(axis, helper));
  const w = v3cross(axis, v);
  return [v, w];
}
function faceShade(normal) { return 0.30 + 0.70 * Math.max(0, v3dot(normal, LIGHT)); }

/* World-space direction from a surface toward the camera, refreshed each frame. */
let VIEW_DIR = [0, 0, -1];
function updateViewDir() {
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const sy = Math.sin(cam.yaw), cyv = Math.cos(cam.yaw);
  VIEW_DIR = [-cp * sy, -sp, -cp * cyv];
}
/* Material shading: cool ambient fill + warm key light + a cool fresnel rim. */
function shadeRGB(rgb, n) {
  const ndl = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  const amb = 0.36, key = 0.74;
  let r = rgb[0] * (amb * 0.86 + ndl * key * 1.07);
  let g = rgb[1] * (amb * 0.96 + ndl * key * 1.00);
  let b = rgb[2] * (amb * 1.12 + ndl * key * 0.90);
  const vd = clamp(Math.abs(n[0] * VIEW_DIR[0] + n[1] * VIEW_DIR[1] + n[2] * VIEW_DIR[2]), 0, 1);
  const rim = Math.pow(1 - vd, 3) * 0.55;
  r += 150 * rim; g += 172 * rim; b += 205 * rim;
  return [clamp(Math.round(r), 0, 255), clamp(Math.round(g), 0, 255), clamp(Math.round(b), 0, 255)];
}
/* A flat face shaded by the material model (used for caps, boxes). */
function addFaceN(prims, ctx, pts3, rgb, normal, alpha, zBias, stroke) {
  const col = shadeRGB(rgb, v3norm(normal));
  const pr = projectAll(pts3);
  const a = (alpha === undefined) ? 1 : alpha;
  prims.push({ z: pr.depth + (zBias || 0), d: () => {
    tracePts(ctx, pr.pts, true);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = `rgba(${clamp(col[0] + 20, 0, 255)},${clamp(col[1] + 20, 0, 255)},${clamp(col[2] + 24, 0, 255)},${Math.min(1, a + 0.15)})`;
      ctx.lineWidth = 1; ctx.stroke();
    }
  } });
}
/* A quad filled with a gradient between its two side-edge colors (smooth shading). */
function addSmoothQuad(prims, ctx, quad, colA, colB, alpha, zBias) {
  const pr = projectAll(quad);
  prims.push({ z: pr.depth + (zBias || 0), d: () => {
    const a = pr.pts;
    const mAx = (a[0].x + a[3].x) / 2, mAy = (a[0].y + a[3].y) / 2;
    const mBx = (a[1].x + a[2].x) / 2, mBy = (a[1].y + a[2].y) / 2;
    let style;
    if (Math.abs(mAx - mBx) < 0.6 && Math.abs(mAy - mBy) < 0.6) {
      style = `rgba(${colA[0]},${colA[1]},${colA[2]},${alpha})`;
    } else {
      const grd = ctx.createLinearGradient(mAx, mAy, mBx, mBy);
      grd.addColorStop(0, `rgba(${colA[0]},${colA[1]},${colA[2]},${alpha})`);
      grd.addColorStop(1, `rgba(${colB[0]},${colB[1]},${colB[2]},${alpha})`);
      style = grd;
    }
    tracePts(ctx, a, true);
    ctx.fillStyle = style;
    ctx.fill();
  } });
}
/* Soft contact shadow: a flattened radial blob on the ground pad. */
function addGroundShadow(prims, ctx, cx, cz, rx, rz, alpha) {
  const yS = -0.598;
  const ring = [];
  for (let a = 0; a <= 22; a += 1) { const t = (a / 22) * Math.PI * 2; ring.push([cx + Math.cos(t) * rx, yS, cz + Math.sin(t) * rz]); }
  const pr = projectAll(ring);
  const c = project(cx, yS, cz);
  prims.push({ z: pr.depth + 0.06, d: () => {
    const rad = Math.max(6, Math.hypot(pr.pts[0].x - c.x, pr.pts[0].y - c.y));
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(0.7, `rgba(0,0,0,${alpha * 0.5})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    tracePts(ctx, pr.pts, true);
    ctx.fill();
  } });
}
function addFace(prims, ctx, pts3, rgb, shade, alpha, zBias) {
  const pr = projectAll(pts3);
  const r = clamp(Math.round(rgb[0] * shade), 0, 255);
  const g = clamp(Math.round(rgb[1] * shade), 0, 255);
  const b = clamp(Math.round(rgb[2] * shade), 0, 255);
  const a = (alpha === undefined) ? 1 : alpha;
  prims.push({ z: pr.depth + (zBias || 0), d: () => {
    tracePts(ctx, pr.pts, true);
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${clamp(r + 22, 0, 255)},${clamp(g + 22, 0, 255)},${clamp(b + 22, 0, 255)},${Math.min(1, a + 0.2)})`;
    ctx.lineWidth = 1; ctx.stroke();
  } });
}
function addBox(prims, ctx, c, dims, rgb, alpha) {
  const x = c[0], y = c[1], z = c[2], hx = dims[0] / 2, hy = dims[1] / 2, hz = dims[2] / 2;
  const A = [x - hx, y - hy, z - hz], B = [x + hx, y - hy, z - hz], C = [x + hx, y - hy, z + hz], D = [x - hx, y - hy, z + hz];
  const E = [x - hx, y + hy, z - hz], F = [x + hx, y + hy, z - hz], G = [x + hx, y + hy, z + hz], H = [x - hx, y + hy, z + hz];
  const faces = [
    [[A, B, C, D], [0, -1, 0]], [[E, F, G, H], [0, 1, 0]],
    [[A, B, F, E], [0, 0, -1]], [[D, C, G, H], [0, 0, 1]],
    [[A, D, H, E], [-1, 0, 0]], [[B, C, G, F], [1, 0, 0]]
  ];
  for (let i = 0; i < faces.length; i += 1) addFaceN(prims, ctx, faces[i][0], rgb, faces[i][1], alpha, 0, true);
}
function addRevolution(prims, ctx, base, axis, nodes, sides, rgb, alpha, caps) {
  const bw = basisFor(axis), v = bw[0], w = bw[1];
  const ringAt = (node) => {
    const cx = base[0] + axis[0] * node.d, cy = base[1] + axis[1] * node.d, cz = base[2] + axis[2] * node.d;
    const ring = [];
    for (let k = 0; k < sides; k += 1) {
      const t = (k / sides) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
      const dx = v[0] * ct + w[0] * st, dy = v[1] * ct + w[1] * st, dz = v[2] * ct + w[2] * st;
      ring.push([cx + dx * node.r, cy + dy * node.r, cz + dz * node.r, dx, dy, dz]);
    }
    return ring;
  };
  const rings = nodes.map(ringAt);
  for (let i = 0; i < rings.length - 1; i += 1) {
    const r0 = rings[i], r1 = rings[i + 1];
    for (let k = 0; k < sides; k += 1) {
      const k2 = (k + 1) % sides;
      const quad = [
        [r0[k][0], r0[k][1], r0[k][2]], [r0[k2][0], r0[k2][1], r0[k2][2]],
        [r1[k2][0], r1[k2][1], r1[k2][2]], [r1[k][0], r1[k][1], r1[k][2]]
      ];
      const colA = shadeRGB(rgb, v3norm([r0[k][3], r0[k][4], r0[k][5]]));
      const colB = shadeRGB(rgb, v3norm([r0[k2][3], r0[k2][4], r0[k2][5]]));
      addSmoothQuad(prims, ctx, quad, colA, colB, alpha);
    }
  }
  if (caps) {
    const first = rings[0], last = rings[rings.length - 1];
    if (nodes[0].r > 0.001) addFaceN(prims, ctx, first.map((p) => [p[0], p[1], p[2]]), rgb, [-axis[0], -axis[1], -axis[2]], alpha, 0, false);
    if (nodes[nodes.length - 1].r > 0.001) addFaceN(prims, ctx, last.map((p) => [p[0], p[1], p[2]]), rgb, axis, alpha, 0, false);
  }
}
function addCyl(prims, ctx, base, axis, len, r, sides, rgb, alpha, caps) {
  addRevolution(prims, ctx, base, axis, [{ d: 0, r }, { d: len, r }], sides, rgb, alpha, caps !== false);
}

/* ---- balance of plant: a small power station beside the reactor ---- */
/* ---- toroidal-field coils: solid, shaded D-section magnets ---- */
let D_PROFILE = null;
function buildDProfile() {
  // Closed D outline in local (u = radial offset from plasma centre, v = vertical):
  // a straight inboard leg, rounded inboard corners, and a wide rounded outboard bulge.
  const uIn = -0.42, uOut = 0.52, H = 0.60, rc = 0.15, cIn = uIn + rc;
  const legN = 6, filN = 4, arcN = 18, ax = uOut - cIn, ay = H;
  const pts = [];
  for (let i = 0; i <= legN; i += 1) pts.push([uIn, (H - rc) - 2 * (H - rc) * (i / legN)]);
  for (let i = 1; i <= filN; i += 1) { const a = Math.PI + (Math.PI / 2) * (i / filN); pts.push([cIn + rc * Math.cos(a), -(H - rc) + rc * Math.sin(a)]); }
  for (let i = 1; i < arcN; i += 1) { const a = -Math.PI / 2 + Math.PI * (i / arcN); pts.push([cIn + ax * Math.cos(a), ay * Math.sin(a)]); }
  for (let i = 1; i < filN; i += 1) { const a = (Math.PI / 2) + (Math.PI / 2) * (i / filN); pts.push([cIn + rc * Math.cos(a), (H - rc) + rc * Math.sin(a)]); }
  return pts;
}
/* Metallic coil shading: cool ambient + warm key + fresnel rim + Blinn-Phong
   specular sheen, plus an optional emissive term for the energised winding. */
function shadeCoil(rgb, n, emissive) {
  const ndl = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  // diffuse body: a cool shadow rising to a brighter key (polished metal has a wide tonal range)
  let r = rgb[0] * (0.24 + ndl * 0.86);
  let g = rgb[1] * (0.27 + ndl * 0.84);
  let b = rgb[2] * (0.36 + ndl * 0.80);
  // Blinn-Phong: a broad body sheen plus a tight, bright polished glint
  const hx = LIGHT[0] + VIEW_DIR[0], hy = LIGHT[1] + VIEW_DIR[1], hz = LIGHT[2] + VIEW_DIR[2];
  const hl = Math.hypot(hx, hy, hz) || 1;
  const ndh = Math.max(0, (n[0] * hx + n[1] * hy + n[2] * hz) / hl);
  const sheen = Math.pow(ndh, 6) * 26;
  const glint = Math.pow(ndh, 64) * 120;
  r += sheen + glint; g += sheen + glint; b += sheen * 1.06 + glint * 1.08;
  // fresnel rim: a cool sky-blue edge, the hallmark of a curved polished surface
  const vd = clamp(Math.abs(n[0] * VIEW_DIR[0] + n[1] * VIEW_DIR[1] + n[2] * VIEW_DIR[2]), 0, 1);
  const rim = Math.pow(1 - vd, 3.2) * 0.44;
  r += 54 * rim; g += 76 * rim; b += 118 * rim;
  if (emissive > 0) { r += 48 * emissive; g += 40 * emissive; b += 96 * emissive; }
  return [clamp(Math.round(r), 0, 255), clamp(Math.round(g), 0, 255), clamp(Math.round(b), 0, 255)];
}
function addFaceCoil(prims, ctx, pts, normal, rgb, emissive) {
  if (v3dot(normal, VIEW_DIR) < -0.05) return;          // cull back faces (opaque solid)
  const col = shadeCoil(rgb, v3norm(normal), emissive || 0);
  const pr = projectAll(pts);
  prims.push({ z: pr.depth, d: () => {
    tracePts(ctx, pr.pts, true);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},1)`;
    ctx.fill();
  } });
}
function addDCoils(prims, ctx, bNorm) {
  const prof = D_PROFILE || (D_PROFILE = buildDProfile());
  const M = prof.length;
  const NC = 14, TUBE_R = 0.046, NS = 8;                // round (octagonal) cross-section: a smooth metallic bar
  const emis = clamp((bNorm - 0.18) / 0.82, 0, 1);      // brighter / more energised at high field
  const coilRgb = [128, 126, 170];                      // blue-violet brushed steel
  const cs = new Array(NS), sn = new Array(NS);
  for (let s = 0; s < NS; s += 1) { const a = (s / NS) * Math.PI * 2; cs[s] = Math.cos(a); sn[s] = Math.sin(a); }
  for (let ci = 0; ci < NC; ci += 1) {
    const th = (ci / NC) * Math.PI * 2;
    const cth = Math.cos(th), sth = Math.sin(th);
    const et = [-sth, 0, cth];                           // toroidal (out-of-plane) cross-section axis
    const rings = new Array(M);
    for (let i = 0; i < M; i += 1) {
      const a = prof[i], pv = prof[(i - 1 + M) % M], nx = prof[(i + 1) % M];
      let nu = -(nx[1] - pv[1]), nv = (nx[0] - pv[0]);
      const ln = Math.hypot(nu, nv) || 1; nu /= ln; nv /= ln;     // in-plane (radial/vertical) cross-section axis
      const u = a[0], v = a[1];
      const Px = (R + u) * cth, Py = v, Pz = (R + u) * sth;
      const npx = nu * cth, npy = nv, npz = nu * sth;
      const ring = new Array(NS);
      for (let s = 0; s < NS; s += 1) {
        const ox = cs[s] * npx + sn[s] * et[0];
        const oy = cs[s] * npy + sn[s] * et[1];
        const oz = cs[s] * npz + sn[s] * et[2];
        ring[s] = { p: [Px + TUBE_R * ox, Py + TUBE_R * oy, Pz + TUBE_R * oz], n: [ox, oy, oz] };
      }
      rings[i] = ring;
    }
    for (let i = 0; i < M; i += 1) {
      const r0 = rings[i], r1 = rings[(i + 1) % M];
      const band = (i % 6 === 0) ? 0.9 : 1.0;            // subtle casing ribs along the bar
      const col = [coilRgb[0] * band, coilRgb[1] * band, coilRgb[2] * band];
      for (let s = 0; s < NS; s += 1) {
        const s2 = (s + 1) % NS;
        const quad = [r0[s].p, r0[s2].p, r1[s2].p, r1[s].p];
        const nrm = [r0[s].n[0] + r0[s2].n[0], r0[s].n[1] + r0[s2].n[1], r0[s].n[2] + r0[s2].n[2]];
        const inward = -(r0[s].n[0] * cth + r0[s].n[2] * sth);          // side facing the central axis / plasma
        const e = emis * (0.12 + 0.5 * clamp(inward, 0, 1)) + 0.03;     // energised winding glows on the inner side
        addFaceCoil(prims, ctx, quad, nrm, col, e);
      }
    }
  }
}

/* ---- outer poloidal-field coils: solid ring magnets that position + shape the plasma ----
   The classic stacked set: small rings top and bottom, larger rings hugging the
   outboard midplane, all sitting outside the toroidal-field cage. */
function addPFCoils(prims, ctx, bNorm) {
  const coils = [
    { h: 0.86, rho: 0.74, tr: 0.05 },   // upper shaping coil
    { h: -0.86, rho: 0.74, tr: 0.05 }   // lower shaping coil
  ];
  const Nmaj = 44, Nmin = 14;                            // higher-poly = smoother rings
  const caseRgb = [106, 126, 164];                       // blue-steel, distinct from the violet TF coils
  const emis = 0.04 + 0.14 * clamp((bNorm - 0.18) / 0.82, 0, 1);
  for (const co of coils) {
    const rings = new Array(Nmaj + 1);
    for (let j = 0; j <= Nmaj; j += 1) {
      const phi = ((j % Nmaj) / Nmaj) * Math.PI * 2;
      const cphi = Math.cos(phi), sphi = Math.sin(phi);
      const cx = co.rho * cphi, cy = co.h, cz = co.rho * sphi;
      const ring = new Array(Nmin);
      for (let k = 0; k < Nmin; k += 1) {
        const a = (k / Nmin) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const nx = ca * cphi, ny = sa, nz = ca * sphi;   // outward normal of the tube surface
        ring[k] = { p: [cx + co.tr * nx, cy + co.tr * ny, cz + co.tr * nz], n: [nx, ny, nz] };
      }
      rings[j] = ring;
    }
    for (let j = 0; j < Nmaj; j += 1) {
      const r0 = rings[j], r1 = rings[j + 1];
      for (let k = 0; k < Nmin; k += 1) {
        const k2 = (k + 1) % Nmin;
        const quad = [r0[k].p, r0[k2].p, r1[k2].p, r1[k].p];
        const nrm = [(r0[k].n[0] + r0[k2].n[0]) / 2, (r0[k].n[1] + r0[k2].n[1]) / 2, (r0[k].n[2] + r0[k2].n[2]) / 2];
        addFaceCoil(prims, ctx, quad, nrm, caseRgb, emis);
      }
    }
  }
}

/* ---- balance of plant: a small power station beside the reactor ---- */
function addBOP(prims, ctx, time, intensity) {
  const flow = clamp(model.coolingFlow / 100, 0, 1);
  const net = model.netElec;
  const yG = -0.6;

  // ground pad
  addBox(prims, ctx, [2.6, yG - 0.04, 0.05], [2.4, 0.08, 1.9], [24, 28, 38], 0.95);

  // soft contact shadows that ground each solid on the pad
  addGroundShadow(prims, ctx, 1.7, 0.55, 0.27, 0.17, 0.50);   // steam generator
  addGroundShadow(prims, ctx, 2.48, 0.18, 0.52, 0.2, 0.42);   // turbine + generator
  addGroundShadow(prims, ctx, 2.42, -0.32, 0.3, 0.2, 0.34);   // condenser
  addGroundShadow(prims, ctx, 3.32, -0.5, 0.34, 0.26, 0.52);  // cooling tower
  addGroundShadow(prims, ctx, 3.82, 0.5, 0.13, 0.13, 0.4);    // pylon

  // steam generator: vertical drum + tapered dome, with a hot band near the base
  const sgBase = [1.7, yG, 0.55], sgLen = 0.6, sgR = 0.15;
  addCyl(prims, ctx, sgBase, [0, 1, 0], sgLen, sgR, 16, [126, 138, 156], 1, true);
  addRevolution(prims, ctx, [sgBase[0], sgBase[1] + sgLen, sgBase[2]], [0, 1, 0],
    [{ d: 0, r: sgR }, { d: 0.12, r: sgR * 0.5 }, { d: 0.18, r: 0.02 }], 16, [150, 160, 176], 1, false);
  addRevolution(prims, ctx, sgBase, [0, 1, 0], [{ d: 0.03, r: sgR * 1.03 }, { d: 0.17, r: sgR * 1.03 }], 16,
    [Math.round(180 + intensity * 60), Math.round(96 + intensity * 24), 60], 0.45 + intensity * 0.35, false);
  const sgTop = [sgBase[0], sgBase[1] + sgLen + 0.18, sgBase[2]];

  // turbine + coupled generator (horizontal cylinders along X)
  const turbBase = [2.2, -0.4, 0.18];
  addCyl(prims, ctx, turbBase, [1, 0, 0], 0.44, 0.12, 14, [120, 132, 150], 1, true);
  const genBase = [2.68, -0.4, 0.18];
  const genRgb = net > 0 ? [92, 152, 112] : [110, 118, 138];
  addCyl(prims, ctx, genBase, [1, 0, 0], 0.34, 0.10, 14, genRgb, 1, true);

  // condenser (horizontal cylinder along Z, lower/behind)
  const condBase = [2.42, -0.52, -0.32];
  addCyl(prims, ctx, condBase, [0, 0, 1], 0.44, 0.11, 14, [58, 104, 130], 1, true);

  // cooling tower (hyperboloid surface of revolution)
  const towerBase = [3.32, yG, -0.5];
  addRevolution(prims, ctx, towerBase, [0, 1, 0],
    [{ d: 0, r: 0.26 }, { d: 0.18, r: 0.2 }, { d: 0.42, r: 0.16 }, { d: 0.62, r: 0.18 }, { d: 0.74, r: 0.21 }], 18,
    [148, 154, 166], 0.96, false);

  // transmission pylon (mast + crossarm)
  addBox(prims, ctx, [3.82, yG + 0.26, 0.5], [0.045, 0.52, 0.045], [150, 158, 172], 1);
  addBox(prims, ctx, [3.82, yG + 0.44, 0.5], [0.36, 0.045, 0.045], [150, 158, 172], 1);

  // turbine spin fan (billboard at the near end)
  const fan = project(turbBase[0], turbBase[1], turbBase[2]);
  prims.push({ z: fan.depth - 0.002, d: () => {
    const rad = Math.max(8, 0.08 * fan.s);
    ctx.save(); ctx.translate(fan.x, fan.y);
    ctx.rotate((reduceMotion ? 0 : time * 0.004) * (0.2 + model.turbineLoad / 100));
    ctx.fillStyle = "rgba(255,200,96,0.9)";
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(rad * 0.6, -rad * 0.16, rad * 1.2, -rad * 0.05);
      ctx.quadraticCurveTo(rad * 0.5, rad * 0.24, 0, 0); ctx.fill();
    }
    ctx.fillStyle = "#eef2f8"; ctx.beginPath(); ctx.arc(0, 0, rad * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } });

  // cooling-tower steam plume (billboard)
  const towerTop = project(towerBase[0], towerBase[1] + 0.82, towerBase[2]);
  prims.push({ z: towerTop.depth - 0.05, d: () => {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const rr = Math.max(10, 0.22 * towerTop.s);
    const a = 0.08 + flow * 0.14;
    const g = ctx.createRadialGradient(towerTop.x, towerTop.y - rr * 0.4, 0, towerTop.x, towerTop.y - rr * 0.4, rr);
    g.addColorStop(0, `rgba(232,242,252,${a})`); g.addColorStop(1, "rgba(232,242,252,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(towerTop.x, towerTop.y - rr * 0.4, rr, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } });

  // ---- pipes (projected ports) ----
  const blanketTap = project((R + A_VESSEL) * Math.cos(Math.PI * 0.35), -A_VESSEL * 0.4, (R + A_VESSEL) * Math.sin(Math.PI * 0.35));
  const pSgTop = project(sgTop[0], sgTop[1], sgTop[2]);
  const pTurbIn = project(turbBase[0] + 0.1, turbBase[1] + 0.12, turbBase[2]);
  const pCondTop = project(condBase[0], condBase[1] + 0.11, condBase[2] + 0.22);
  const pSgMid = project(sgBase[0] + sgR, sgBase[1] + 0.22, sgBase[2]);
  const pTowerIn = project(towerBase[0], towerBase[1] + 0.12, towerBase[2]);
  const pGen = project(genBase[0] + 0.34, genBase[1], genBase[2]);
  const pGrid = project(3.82, yG + 0.42, 0.5);

  const pipe = (p0, p1, color, speed, lw) => {
    prims.push({ z: (p0.depth + p1.depth) / 2 - 0.02, d: () => {
      ctx.save(); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
      const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2 + 14;
      ctx.quadraticCurveTo(mx, my, p1.x, p1.y);
      ctx.strokeStyle = "rgba(30,36,48,0.92)"; ctx.lineWidth = lw + 3; ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.setLineDash([12, 10]); ctx.lineDashOffset = -time * speed; ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    } });
  };
  pipe(blanketTap, pSgTop, `rgba(255,150,90,${0.5 + flow * 0.4})`, 0.05 + flow * 0.15, 3);
  pipe(pSgTop, pTurbIn, `rgba(214,240,255,${0.55 + flow * 0.4})`, 0.12 + flow * 0.2, 2.6);
  pipe(pTurbIn, pCondTop, `rgba(120,200,220,${0.45 + flow * 0.4})`, 0.07 + flow * 0.12, 2.4);
  pipe(pCondTop, pSgMid, `rgba(56,225,198,${0.45 + flow * 0.4})`, 0.05 + flow * 0.12, 2.2);
  pipe(pCondTop, pTowerIn, `rgba(150,190,210,${0.3 + flow * 0.3})`, 0.04 + flow * 0.1, 2.0);

  // power export gen -> grid pylon
  prims.push({ z: (pGen.depth + pGrid.depth) / 2 - 0.03, d: () => {
    ctx.save();
    ctx.strokeStyle = net > 0 ? `rgba(126,231,135,${0.5 + clamp(net / 500, 0, 0.5)})` : "rgba(120,128,150,0.5)";
    ctx.lineWidth = 1.8; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 0.05;
    ctx.beginPath(); ctx.moveTo(pGen.x, pGen.y); ctx.lineTo(pGrid.x, pGrid.y); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  } });

  // label
  prims.push({ z: pSgTop.depth - 0.01, d: () => {
    ctx.save(); ctx.fillStyle = "rgba(214,224,240,0.32)";
    ctx.font = `700 ${Math.max(8, Math.min(13, 10 * pSgTop.s * 0.02))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.fillText("STEAM GENERATOR", pSgTop.x, pSgTop.y - 10); ctx.textAlign = "left";
    ctx.restore();
  } });
}

/* ---- screen-space atmosphere ---- */
function drawAtmosphere(ctx, w, h, intensity) {
  ctx.save();
  const g = ctx.createRadialGradient(w * 0.47, h * 0.45, 0, w * 0.47, h * 0.45, Math.max(w, h) * 0.7);
  g.addColorStop(0, `rgba(20,40,44,${0.18 + intensity * 0.12})`);
  g.addColorStop(0.6, "rgba(10,14,20,0.0)");
  g.addColorStop(1, "rgba(6,8,12,0.35)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ---- cheap additive bloom: blur a downscaled copy of the frame back over itself ---- */
let glowCanvas = null, glowCtx = null;
function applyBloom(ctx, w, h, amount) {
  if (liteMode) return;   // C3: skip the bloom passes on weak GPUs
  if (reduceMotion && amount < 0.2) return;
  const gw = Math.max(1, Math.floor(w * 0.34)), gh = Math.max(1, Math.floor(h * 0.34));
  if (!glowCanvas) { glowCanvas = document.createElement("canvas"); glowCtx = glowCanvas.getContext("2d"); }
  if (glowCanvas.width !== gw || glowCanvas.height !== gh) { glowCanvas.width = gw; glowCanvas.height = gh; }
  glowCtx.clearRect(0, 0, gw, gh);
  glowCtx.drawImage(reactorCanvas, 0, 0, gw, gh);
  const base = Math.max(2, Math.round(Math.min(w, h) * 0.013));
  const a = clamp(amount, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // A2: multi-scale bloom - a wide soft halo plus a tighter, brighter core pass
  ctx.globalAlpha = a * 0.55;
  ctx.filter = `blur(${base * 2.2}px)`;
  ctx.drawImage(glowCanvas, 0, 0, w, h);
  ctx.globalAlpha = a;
  ctx.filter = `blur(${base}px)`;
  ctx.drawImage(glowCanvas, 0, 0, w, h);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ---- A1: in-core fusion events - bright flashes plus lingering alpha particles,
   spawned in the hot core at a rate that scales with fusion power. Reuses the
   previously unused sparks array and an alphas pool. ---- */
function updateFusionEvents(prims, ctx, dt, time, intensity) {
  if (!reduceMotion) {
    const rate = intensity * 26;                 // events per second at full power
    fusionAcc += (dt / 1000) * rate;
    let guard = 0;
    while (fusionAcc >= 1 && guard < 6) {
      fusionAcc -= 1; guard += 1;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 2;
      const r = A_PLASMA * (0.12 + Math.random() * 0.5);
      sparks.push({ th, ph, r, life: 1 });
      alphas.push({ th, ph, r, life: 1, sp: 0.4 + Math.random() * 0.9, drift: (Math.random() * 2 - 1) * 0.7 });
    }
    if (sparks.length > 90) sparks.splice(0, sparks.length - 90);
    if (alphas.length > 90) alphas.splice(0, alphas.length - 90);
  }

  // flash of the reaction
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const s = sparks[i];
    s.life -= dt * 0.0030;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    const w = torusPt(s.th, s.ph, s.r);
    const c = project(w[0], w[1], w[2]);
    const k = s.life;
    const rad = Math.max(2.5, A_PLASMA * c.s * 0.55) * (1.25 - k * 0.5);
    prims.push({ z: c.depth - 0.003, d: () => {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad);
      g.addColorStop(0, `rgba(255,255,242,${0.85 * k})`);
      g.addColorStop(0.4, `rgba(255,232,170,${0.5 * k})`);
      g.addColorStop(1, "rgba(255,180,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } });
  }

  // the alpha (helium nucleus) that stays in the plasma and heats it
  for (let i = alphas.length - 1; i >= 0; i -= 1) {
    const a = alphas[i];
    a.life -= dt * 0.00065;
    if (a.life <= 0) { alphas.splice(i, 1); continue; }
    if (!reduceMotion) { a.th += dt * 0.00012 * a.sp; a.ph += dt * 0.00026 * a.drift; }
    const w = torusPt(a.th, a.ph, a.r);
    const c = project(w[0], w[1], w[2]);
    const rad = Math.max(1, 0.013 * c.s) * (0.55 + a.life * 0.6);
    const al = a.life * 0.8;
    prims.push({ z: c.depth - 0.0016, d: () => {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255,206,110,${al})`;
      ctx.beginPath(); ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,240,206,${al * 0.7})`;
      ctx.beginPath(); ctx.arc(c.x, c.y, rad * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } });
  }
}

/* ---- A5: optional human + scale reference, stood on the ground pad in front of
   the vessel so visitors grasp that the machine is building-sized. ---- */
function addScaleReference(prims, ctx) {
  if (!scaleRef) return;
  const gy = -0.6, zf = 1.78, xh = 0.0, personH = 0.27;
  const feet = project(xh, gy, zf);
  const head = project(xh, gy + personH, zf);
  prims.push({ z: feet.depth - 0.05, d: () => {
    const x = feet.x, yb = feet.y, yt = head.y;
    const hpx = Math.max(10, yb - yt);
    ctx.save();
    ctx.fillStyle = "rgba(18,24,34,0.94)";
    ctx.strokeStyle = "rgba(120,210,255,0.7)"; ctx.lineWidth = 1.4;
    const bw = hpx * 0.16;
    ctx.beginPath();
    ctx.moveTo(x - bw, yb);
    ctx.lineTo(x - bw * 0.66, yt + hpx * 0.30);
    ctx.quadraticCurveTo(x, yt + hpx * 0.17, x + bw * 0.66, yt + hpx * 0.30);
    ctx.lineTo(x + bw, yb);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    const hr = hpx * 0.11;
    ctx.beginPath(); ctx.arc(x, yt + hr * 1.2, hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(200,224,255,0.92)";
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("~1.8 m", x, yt - 4);
    ctx.restore();
  } });
  const b0 = project(xh - 0.72, gy, zf + 0.2);
  const b1 = project(xh + 0.72, gy, zf + 0.2);
  prims.push({ z: ((b0.depth + b1.depth) / 2) - 0.04, d: () => {
    ctx.save();
    ctx.strokeStyle = "rgba(120,210,255,0.8)"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
    [b0, b1].forEach((p) => { ctx.beginPath(); ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x, p.y + 5); ctx.stroke(); });
    ctx.fillStyle = "rgba(200,224,255,0.92)";
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("~10 m", (b0.x + b1.x) / 2, (b0.y + b1.y) / 2 + 6);
    ctx.restore();
  } });
}

function drawCoreShaft(ctx, intensity, rgb) {
  const top = project(0, SOL_H * 1.25, 0);
  const bot = project(0, -SOL_H * 1.25, 0);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.06 + intensity * 0.16})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  const ww = Math.max(8, SOL_R * top.s * 1.6);
  ctx.fillStyle = grad;
  ctx.fillRect(top.x - ww / 2, Math.min(top.y, bot.y), ww, Math.abs(bot.y - top.y));
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  ctx.save();
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawTitle(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(238,242,248,0.5)";
  ctx.font = "700 11px Inter, system-ui, sans-serif";
  // F5: the full label collides with the corner HUD on a narrow stage; shorten it there.
  ctx.fillText(w < 520 ? "TOKAMAK" : "MAGNETIC CONFINEMENT VESSEL", Math.max(16, w * 0.05), Math.max(24, h * 0.06));
  ctx.restore();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

/* ---- project hotspot anchors onto the moving model ---- */
const HOTSPOT_ANCHORS = {
  plasma: () => [0, 0, 0],
  solenoid: () => [0, SOL_H * 0.62, 0],
  magnets: () => torusPt(Math.PI * 1.15, Math.PI / 2, A_COIL * 1.05),
  blanket: () => torusPt(-0.35, 0, A_VESSEL * 1.05),
  divertor: () => torusPt(Math.PI * 0.5, -Math.PI / 2, A_PLASMA * 1.1)
};
function positionHotspots() {
  const rect = reactorCanvas.getBoundingClientRect();
  // 1) project each label to its target pixel position
  const items = [];
  hotspots.forEach((b) => {
    const fn = HOTSPOT_ANCHORS[b.dataset.topic];
    if (!fn) return;
    const wpt = fn();
    const p = project(wpt[0], wpt[1], wpt[2]);
    items.push({ b, x: p.x, y: p.y, depth: p.depth, w: (b.offsetWidth || 96) + 6, h: (b.offsetHeight || 30) + 4 });
  });
  // 2) relax overlapping labels apart along whichever axis needs the least movement
  for (let iter = 0; iter < 5; iter += 1) {
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const A = items[i], B = items[j];
        const dx = B.x - A.x, dy = B.y - A.y;
        const ox = (A.w + B.w) / 2 - Math.abs(dx);
        const oy = (A.h + B.h) / 2 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (oy <= ox) { const pu = oy / 2 + 0.5, d = dy >= 0 ? 1 : -1; B.y += pu * d; A.y -= pu * d; }
          else { const pu = ox / 2 + 0.5, d = dx >= 0 ? 1 : -1; B.x += pu * d; A.x -= pu * d; }
        }
      }
    }
  }
  // 3) apply, clamped to the stage bounds
  // F5: keep labels clear of the right-edge camera HUD, the top title, and the bottom toggles.
  const padR = rect.width > 560 ? 58 : 26, padT = 30, padB = 34, padL = 6;
  items.forEach((it) => {
    const left = clamp(it.x, it.w / 2 + padL, rect.width - it.w / 2 - padR);
    const top = clamp(it.y, it.h / 2 + padT, rect.height - it.h / 2 - padB);
    it.b.style.left = `${(left / rect.width) * 100}%`;
    it.b.style.top = `${(top / rect.height) * 100}%`;
    it.b.style.right = "auto";
    it.b.style.bottom = "auto";
    it.b.style.transform = "translate(-50%, -50%)";
    it.b.style.opacity = `${clamp(0.4 + depthBright(it.depth) * 0.6, 0.4, 1)}`;
  });
}

/* ---------- Orientation gizmo (axis triad in a cube, top-right of the stage) ---------- */
let gizmoCanvas = null, gizmoCtx = null, gizmoReady = false;
function initGizmo() {
  gizmoCanvas = document.getElementById("gizmoCanvas");
  if (!gizmoCanvas) return;
  gizmoCtx = gizmoCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  gizmoCanvas.width = 84 * dpr; gizmoCanvas.height = 84 * dpr;
  gizmoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gizmoReady = true;
}
function drawGizmo() {
  if (!gizmoReady) return;
  const g = gizmoCtx, S = 84, cx = S / 2, cy = S / 2, L = 24;
  g.clearRect(0, 0, S, S);
  const proj = (x, y, z) => {
    const cyaw = Math.cos(cam.yaw), syaw = Math.sin(cam.yaw);
    const x1 = x * cyaw - z * syaw, z1 = x * syaw + z * cyaw;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    return { x: cx + x1 * L, y: cy - y2 * L, z: z2 };
  };
  // faint cube cage
  const s = 0.62;
  const corners = [[-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s], [-s, s, -s], [s, s, -s], [s, s, s], [-s, s, s]].map((p) => proj(p[0], p[1], p[2]));
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  g.lineWidth = 1; g.strokeStyle = "rgba(120,132,156,0.26)";
  g.beginPath();
  edges.forEach((e) => { g.moveTo(corners[e[0]].x, corners[e[0]].y); g.lineTo(corners[e[1]].x, corners[e[1]].y); });
  g.stroke();
  // axis triad, depth-sorted so the near axis sits on top
  const o = proj(0, 0, 0);
  const axes = [
    { v: [1.05, 0, 0], col: [255, 122, 102], lab: "X" },
    { v: [0, 1.05, 0], col: [126, 231, 135], lab: "Y" },
    { v: [0, 0, 1.05], col: [92, 200, 255], lab: "Z" }
  ].map((a) => ({ ...a, p: proj(a.v[0], a.v[1], a.v[2]) }));
  axes.sort((a, b) => b.p.z - a.p.z);
  axes.forEach((a) => {
    const near = clamp(0.6 - a.p.z * 0.5, 0.35, 1);
    g.strokeStyle = `rgba(${a.col[0]},${a.col[1]},${a.col[2]},${near})`;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(a.p.x, a.p.y); g.stroke();
    g.fillStyle = `rgba(${a.col[0]},${a.col[1]},${a.col[2]},${near})`;
    g.beginPath(); g.arc(a.p.x, a.p.y, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(238,242,248,${near})`;
    g.font = "700 8px Inter, system-ui, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(a.lab, a.p.x, a.p.y - 6.5);
  });
}

/* ---------- Lawson operating-point map ---------- */
function drawLawson() {
  const rect = resizeCanvas(lawsonCanvas, lawsonCtx);
  const w = rect.width;
  const h = rect.height;
  const ctx = lawsonCtx;
  const padL = 52, padR = 14, padT = 14, padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const tMin = 3, tMax = 30;
  const logMin = 19, logMax = 21.8; // log10 of n*tauE (m^-3.s)

  const xOf = (T) => padL + ((T - tMin) / (tMax - tMin)) * plotW;
  const yOf = (val) => {
    const l = Math.log10(Math.max(1e-9, val));
    return padT + (1 - (l - logMin) / (logMax - logMin)) * plotH;
  };

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8, 10, 14, 0.6)";
  ctx.fillRect(padL, padT, plotW, plotH);

  // grid + axis labels
  ctx.strokeStyle = "rgba(120,132,156,0.16)";
  ctx.fillStyle = "rgba(154,164,184,0.85)";
  ctx.lineWidth = 1;
  ctx.font = "10px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let p = 19; p <= 21; p += 1) {
    const y = yOf(Math.pow(10, p));
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillText(`10${superscript(p)}`, padL - 6, y);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let T = 5; T <= 30; T += 5) {
    const x = xOf(T);
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke();
    ctx.fillText(`${T}`, x, h - padB + 6);
  }
  ctx.fillStyle = "rgba(154,164,184,0.7)";
  ctx.fillText("Ion temperature (keV)", padL + plotW / 2, h - 14);
  ctx.save();
  ctx.translate(13, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("n·tau_E  (m⁻³·s)", 0, 0);
  ctx.restore();

  // ignition + breakeven curves
  const drawCurve = (fn, color, width) => {
    ctx.beginPath();
    let started = false;
    for (let T = tMin; T <= tMax; T += 0.3) {
      const x = xOf(T);
      const y = yOf(fn(T));
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  // faint fill above ignition curve
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xOf(tMin), padT);
  for (let T = tMin; T <= tMax; T += 0.3) ctx.lineTo(xOf(T), yOf(ignitionNTau(T)));
  ctx.lineTo(xOf(tMax), padT);
  ctx.closePath();
  ctx.fillStyle = "rgba(126, 231, 135, 0.06)";
  ctx.fill();
  ctx.restore();

  drawCurve((T) => ignitionNTau(T), "rgba(255,122,102,0.9)", 2.4);
  drawCurve((T) => ignitionNTau(T) / 6, "rgba(168,150,255,0.85)", 1.8);

  // "IGNITION" label near curve minimum
  ctx.fillStyle = "rgba(255,122,102,0.9)";
  ctx.font = "700 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("IGNITION", xOf(24), yOf(ignitionNTau(24)) - 4);

  // C2: real machines - labeled reference operating points (illustrative placement).
  // None of these magnetic devices has crossed the ignition curve; NIF reached it with lasers.
  if (showMachines) {
    const machines = [
      { k: "JET", T: 13, nTau: 4.2e19 },
      { k: "EAST", T: 9, nTau: 5.0e19 },
      { k: "SPARC", T: 17, nTau: 1.3e20 },
      { k: "ITER", T: 13, nTau: 1.6e20 }
    ];
    machines.forEach((mc) => {
      const mx = clamp(xOf(mc.T), padL + 5, w - padR - 5);
      const my = clamp(yOf(mc.nTau), padT + 5, h - padB - 5);
      ctx.save();
      ctx.fillStyle = "rgba(150,190,255,0.95)";
      ctx.strokeStyle = "rgba(12,16,24,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, my - 4); ctx.lineTo(mx + 4, my); ctx.lineTo(mx, my + 4); ctx.lineTo(mx - 4, my);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(210,226,250,0.96)";
      ctx.font = "700 9px Inter, system-ui, sans-serif";
      ctx.textAlign = mc.T > 19 ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.fillText(mc.k, mx + (mc.T > 19 ? -7 : 7), my);
      ctx.restore();
    });
  }

  // trail
  trail.forEach((pt, i) => {
    const a = (i / trail.length) * 0.4;
    ctx.fillStyle = `rgba(56,225,198,${a})`;
    ctx.beginPath();
    ctx.arc(clamp(xOf(pt.T), padL, w - padR), clamp(yOf(pt.nTau), padT, h - padB), 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // current operating point
  const px = clamp(xOf(model.temperature), padL, w - padR);
  const py = clamp(yOf(model.nTauActual), padT, h - padB);
  ctx.save();
  ctx.shadowColor = "#38e1c6";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#38e1c6";
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function superscript(n) {
  const map = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(n).split("").map((c) => map[c] || c).join("");
}

/* ---------- History chart ---------- */
function drawHistory() {
  const rect = resizeCanvas(historyCanvas, historyCtx);
  const w = rect.width;
  const h = rect.height;
  const ctx = historyCtx;
  const maxVal = Math.max(200, ...fusionHistory) * 1.1;
  const minVal = Math.min(0, ...netHistory);
  const range = maxVal - minVal;

  outputs.chartPeak.textContent = formatMw(Math.max(0, ...netHistory));

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8, 10, 14, 0.85)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(120, 132, 156, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = (h / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // zero line
  const zeroY = h - ((0 - minVal) / range) * (h - 10) - 5;
  ctx.strokeStyle = "rgba(154,164,184,0.4)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
  ctx.setLineDash([]);

  const plot = (arr, color, fillTop) => {
    ctx.beginPath();
    arr.forEach((v, i) => {
      const x = (i / (arr.length - 1)) * w;
      const y = h - ((v - minVal) / range) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    if (fillTop) {
      ctx.lineTo(w, zeroY);
      ctx.lineTo(0, zeroY);
      ctx.closePath();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "rgba(56, 225, 198, 0.28)");
      grd.addColorStop(1, "rgba(56, 225, 198, 0)");
      ctx.fillStyle = grd;
      ctx.fill();
    }
  };

  plot(fusionHistory, "rgba(255, 194, 75, 0.7)", false);
  plot(netHistory, "#38e1c6", true);
}

/* ---------- D-T reactivity vs temperature ---------- */
/* Relative reaction-rate shape: rises ~T^2, rolls over past ~65 keV. */
function reactivityShape(T) { return (T * T) / (1 + Math.pow(T / 57, 3.3)); } // peaks ~65 keV (matches caption + real D-T)

function drawReactivity() {
  if (!reactivityCtx) return;
  const rect = resizeCanvas(reactivityCanvas, reactivityCtx);
  const w = rect.width, h = rect.height, ctx = reactivityCtx;
  const padL = 30, padR = 14, padT = 14, padB = 30;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const tMin = 1, tMax = 100;
  let peakT = 1, maxR = 0;
  for (let T = tMin; T <= tMax; T += 0.5) { const r = reactivityShape(T); if (r > maxR) { maxR = r; peakT = T; } }
  const xOf = (T) => padL + ((T - tMin) / (tMax - tMin)) * plotW;
  const yOf = (r) => padT + (1 - r / maxR) * plotH;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8,10,14,0.6)"; ctx.fillRect(padL, padT, plotW, plotH);

  // practical operating window (10-20 keV) - matches the "reactors run at 10 to 20 keV" copy
  ctx.fillStyle = "rgba(56,225,198,0.09)";
  ctx.fillRect(xOf(10), padT, xOf(20) - xOf(10), plotH);
  ctx.fillStyle = "rgba(56,225,198,0.65)"; ctx.font = "9px Inter, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("practical window", (xOf(10) + xOf(20)) / 2, padT + 4);

  // grid + x labels
  ctx.strokeStyle = "rgba(120,132,156,0.16)"; ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(154,164,184,0.8)";
  for (let T = 20; T <= 100; T += 20) {
    const x = xOf(T);
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke();
    ctx.fillText(`${T}`, x, h - padB + 5);
  }
  ctx.fillStyle = "rgba(154,164,184,0.7)";
  ctx.fillText("Ion temperature (keV)", padL + plotW / 2, h - 12);

  // curve + fill
  ctx.beginPath();
  for (let T = tMin; T <= tMax; T += 0.5) { const x = xOf(T), y = yOf(reactivityShape(T)); if (T === tMin) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.strokeStyle = "rgba(255,194,75,0.95)"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.lineTo(xOf(tMax), h - padB); ctx.lineTo(xOf(tMin), h - padB); ctx.closePath();
  ctx.fillStyle = "rgba(255,194,75,0.08)"; ctx.fill();

  // peak label
  const pkx = xOf(peakT), pky = yOf(maxR);
  ctx.fillStyle = "rgba(255,194,75,0.9)"; ctx.font = "700 9px Inter, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText(`peak ≈ ${Math.round(peakT)} keV`, pkx, pky - 4);
  ctx.beginPath(); ctx.arc(pkx, pky, 2.5, 0, Math.PI * 2); ctx.fill();

  // live operating temperature
  const T0 = model.temperature || 11;
  const cx = xOf(clamp(T0, tMin, tMax)), cy = yOf(reactivityShape(T0));
  ctx.strokeStyle = "rgba(56,225,198,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, h - padB); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#38e1c6"; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#eef2f8"; ctx.font = "700 10px Inter, system-ui, sans-serif";
  ctx.textAlign = cx > w * 0.7 ? "right" : "left"; ctx.textBaseline = "middle";
  ctx.fillText(`${T0.toFixed(1)} keV`, cx + (cx > w * 0.7 ? -10 : 10), cy - 12);
}

/* ---------- Energy-flow Sankey ---------- */
function drawSankey() {
  if (!sankeyCtx) return;
  const rect = resizeCanvas(sankeyCanvas, sankeyCtx);
  const w = rect.width, h = rect.height, ctx = sankeyCtx;
  ctx.clearRect(0, 0, w, h);
  const heat = Math.max(0, model.pExt || 0);
  const fus = Math.max(0, model.fusionPower || 0);
  const thermal = Math.max(0, model.thermalPower || 0);
  const gross = Math.max(0, model.grossElec || 0);
  const recirc = Math.max(0, model.recirc || 0);
  const net = model.netElec || 0;
  const inTot = heat + fus;
  const maxP = Math.max(inTot, thermal, 300);
  const sc = (h * 0.28) / maxP;
  const wOf = (p) => Math.max(2.5, p * sc);
  const midY = h * 0.42;
  const xIn = w * 0.11, xTh = w * 0.40, xEl = w * 0.66, xOut = w * 0.90;

  const ribbon = (x0, y0, x1, y1, wp, col) => {
    const mx = (x0 + x1) / 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - wp / 2);
    ctx.bezierCurveTo(mx, y0 - wp / 2, mx, y1 - wp / 2, x1, y1 - wp / 2);
    ctx.lineTo(x1, y1 + wp / 2);
    ctx.bezierCurveTo(mx, y1 + wp / 2, mx, y0 + wp / 2, x0, y0 + wp / 2);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };

  ribbon(xIn, midY, xTh, midY, wOf(thermal), "rgba(255,150,90,0.30)");
  ribbon(xTh, midY, xEl, midY, wOf(gross), "rgba(56,225,198,0.36)");
  ribbon(xTh, midY, xEl, h * 0.86, wOf(Math.max(0, thermal - gross)), "rgba(110,122,146,0.20)");
  ribbon(xEl, midY, xOut, h * 0.18, wOf(Math.max(0, net)), net >= 0 ? "rgba(126,231,135,0.5)" : "rgba(120,132,156,0.12)");
  ribbon(xEl, midY, xOut, h * 0.82, wOf(recirc), "rgba(168,150,255,0.34)");

  ctx.textBaseline = "alphabetic";
  const node = (x, y, name, val, nameCol, valCol) => {
    ctx.fillStyle = nameCol; ctx.font = "700 10px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(name, x, y - 8);
    ctx.fillStyle = valCol; ctx.font = "800 11px Inter, system-ui, sans-serif";
    ctx.fillText(val, x, y + 6);
  };
  node(xIn, midY, "Power in", `${Math.round(inTot)} MW`, "rgba(238,242,248,0.92)", "#ffc24b");
  ctx.fillStyle = "rgba(154,164,184,0.8)"; ctx.font = "8.5px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
  const inSub = `heat ${Math.round(heat)} + fusion ${Math.round(fus)}`;
  ctx.fillText(inSub, Math.max(xIn, ctx.measureText(inSub).width / 2 + 4), midY + 22); // clamp so it never clips the left edge
  node(xTh, midY, "Thermal", `${Math.round(thermal)} MW`, "rgba(238,242,248,0.92)", "#ff9a5a");
  node(xEl, midY, "Gross elec", `${Math.round(gross)} MW`, "rgba(238,242,248,0.92)", "#38e1c6");
  node(xOut, h * 0.18, "Net to grid", `${Math.round(net)} MW`, "rgba(238,242,248,0.92)", net >= 0 ? "#7ee787" : "#ff5d5d");
  node(xOut, h * 0.82, "Recirculating", `${Math.round(recirc)} MW`, "rgba(168,150,255,0.95)", "rgba(214,224,240,0.85)");
  ctx.fillStyle = "rgba(150,160,180,0.75)"; ctx.font = "8.5px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("rejected heat", (xTh + xEl) / 2, h * 0.86 + 14);
}

/* ---------- D-T fuel-cycle animation ---------- */
function drawFuelCycle(time) {
  if (!fuelCycleCtx) return;
  const rect = resizeCanvas(fuelCycleCanvas, fuelCycleCtx);
  const w = rect.width, h = rect.height, ctx = fuelCycleCtx;
  ctx.clearRect(0, 0, w, h);
  const cy = h * 0.46;
  const xFuel = w * 0.16, xCore = w * 0.46, xBlanket = w * 0.82;
  const period = 2600 / (0.6 + clamp((model.fusionPower || 0) / 800, 0, 1.4));
  const ph = (time % period) / period;

  // lithium blanket block
  ctx.fillStyle = "rgba(52,78,92,0.5)"; roundedRect(ctx, xBlanket - 28, cy - 42, 56, 84, 8); ctx.fill();
  ctx.strokeStyle = "rgba(120,200,220,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "rgba(214,224,240,0.85)"; ctx.font = "700 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText("Li blanket", xBlanket, cy - 50);

  const nucleus = (x, y, r, col, label) => {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.45, col); g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (label) { ctx.fillStyle = "#0b0d12"; ctx.font = "800 10px Inter, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, x, y); ctx.textBaseline = "alphabetic"; }
  };

  if (ph < 0.4) {
    const t = ph / 0.4;
    nucleus(lerp(xFuel, xCore - 14, t), cy, 13, "#5cc8ff", "D");
    nucleus(lerp(xFuel, xCore + 14, t), cy, 13, "#ff7a66", "T");
  } else if (ph < 0.55) {
    const t = (ph - 0.4) / 0.15;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const fr = 18 + t * 34;
    const g = ctx.createRadialGradient(xCore, cy, 0, xCore, cy, fr);
    g.addColorStop(0, `rgba(255,240,180,${0.9 * (1 - t)})`); g.addColorStop(1, "rgba(255,180,80,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(xCore, cy, fr, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  } else {
    const t = (ph - 0.55) / 0.45;
    nucleus(xCore - 8, cy + lerp(0, -20, t), 12, "#ffc24b", "⁴He");
    const nx = lerp(xCore + 10, xBlanket - 30, clamp(t * 1.4, 0, 1));
    nucleus(nx, cy, 7, "#e6ecf5", "n");
    if (t > 0.62) {
      const u = (t - 0.62) / 0.38;
      const bx = lerp(xBlanket - 8, xFuel, u), by = cy + Math.sin(u * Math.PI) * -42;
      const tbrOk = (model.tritiumRatio || 1) >= 1;
      nucleus(bx, by, 10, tbrOk ? "#7ee787" : "#ffb24b", "T");
    }
  }

  // captions + equation
  ctx.fillStyle = "rgba(154,164,184,0.9)"; ctx.font = "700 9px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("fuel: D + T", xFuel, cy + 32);
  ctx.fillStyle = "rgba(214,224,240,0.88)"; ctx.font = "700 11px Inter, system-ui, sans-serif"; ctx.textAlign = "left";
  ctx.fillText("D + T → ⁴He (3.5 MeV) + n (14.1 MeV)", 14, h - 12);
  const tbr = model.tritiumRatio || 1;
  ctx.fillStyle = tbr >= 1 ? "#7ee787" : "#ffb24b"; ctx.font = "800 10px Inter, system-ui, sans-serif"; ctx.textAlign = "right";
  ctx.fillText(`TBR ${tbr.toFixed(2)}`, w - 14, h - 12);
}

/* ---------- B3: smooth value transitions (per-frame number tweening) ---------- */
let disp = null;
function tweenReadouts(dt) {
  if (!model || model.q === undefined) return;
  if (!disp) disp = { net: model.netElec, q: Math.min(model.q, 50), fus: model.fusionPower, tri: model.triple, tau: model.tauE, stab: model.stability, wall: model.wallLoad, cool: model.coolantTemp, tbr: model.tritiumRatio, temp: model.temperature };
  const k = clamp(dt / 130, 0, 1);
  const lp = (key, target) => { disp[key] += (target - disp[key]) * k; return disp[key]; };
  const net = lp("net", model.netElec), q = lp("q", Math.min(model.q, 50)), fus = lp("fus", model.fusionPower);
  const tri = lp("tri", model.triple), tau = lp("tau", model.tauE), stab = lp("stab", model.stability);
  const wall = lp("wall", model.wallLoad), cool = lp("cool", model.coolantTemp), tbr = lp("tbr", model.tritiumRatio);
  const temp = lp("temp", model.temperature);
  const qStr = model.q >= 50 ? "≈ ∞" : q.toFixed(1);
  const set = (el, v) => { if (el) el.textContent = v; };
  set(outputs.netPowerBadge, formatMw(net));
  set(outputs.qBadge, qStr);
  set(outputs.fusionPower, formatMw(fus));
  set(outputs.qPlasma, qStr);
  set(outputs.electricOutput, formatMw(net));
  set(outputs.tripleProduct, tri.toFixed(2));
  set(outputs.confinementTime, `${tau.toFixed(2)} s`);
  set(outputs.stability, `${Math.round(stab)}%`);
  set(outputs.wallLoad, `${wall.toFixed(1)} MW/m²`);
  set(outputs.coolantTemp, `${Math.round(cool)} °C`);
  set(outputs.tritiumRatio, tbr.toFixed(2));
  set(outputs.qBig, qStr.charAt(0) === "≈" ? `Q ${qStr}` : `Q = ${qStr}`);
  set(outputs.stageTemp, temp.toFixed(1));
}

/* ---------- Animation + ticking ---------- */
function animate(time) {
  const delta = time - lastFrame;
  lastFrame = time;
  if (delta > 0) {
    // C1: per-frame work only for the reactor stage and the animated fuel cycle, and only on screen.
    if (vis.has(reactorCanvas)) { drawReactor(time); drawGizmo(); }
    if (fuelCycleCanvas && vis.has(fuelCycleCanvas)) drawFuelCycle(time);
    // C1: the static charts redraw only when their data changed (flag set on the model tick) and they're visible.
    if (chartsDirty) {
      if (historyCanvas && vis.has(historyCanvas)) drawHistory();
      if (lawsonCanvas && vis.has(lawsonCanvas)) drawLawson();
      if (reactivityCanvas && vis.has(reactivityCanvas)) drawReactivity();
      if (sankeyCanvas && vis.has(sankeyCanvas)) drawSankey();
      drawCrossSection();   // self-skips when the cutaway is closed
      chartsDirty = false;
    }
    tweenReadouts(delta);
    positionStoryRing();   // U4: keep the guided-story highlight ring on its control as the page scrolls
  }
  rafId = requestAnimationFrame(animate);
}

function tickHistory() {
  netHistory = netHistory.slice(1);
  netHistory.push(model.netElec);
  fusionHistory = fusionHistory.slice(1);
  fusionHistory.push(model.fusionPower);
  trail.push({ T: model.temperature, nTau: model.nTauActual });
  if (trail.length > 26) trail.shift();
}

/* ---------- Interaction ---------- */
function applyPreset(name) {
  const preset = presetValues[name];
  Object.entries(preset).forEach(([key, value]) => {
    if (typeof value === "boolean") controls[key].checked = value;
    else controls[key].value = value;
  });
  presets.forEach((b) => b.classList.toggle("active", b.dataset.preset === name));
  trail = [];
  updateReadouts();
}

function clearPresetHighlight() {
  presets.forEach((b) => b.classList.remove("active"));
}

Object.values(controls).forEach((control) => {
  control.addEventListener("input", () => {
    clearPresetHighlight();
    updateReadouts();
  });
});

presets.forEach((b) => b.addEventListener("click", () => applyPreset(b.dataset.preset)));

hotspots.forEach((b) => {
  b.addEventListener("click", () => {
    selectedTopic = b.dataset.topic;
    hotspots.forEach((item) => item.classList.toggle("active", item === b));
    updateLesson();
  });
});

// Balance-of-plant stages that map to a lesson select it (and sync the matching hotspot).
document.querySelectorAll(".plant-stage[data-lesson]").forEach((el) => {
  const pick = () => {
    selectedTopic = el.dataset.lesson;
    hotspots.forEach((h) => h.classList.toggle("active", h.dataset.topic === el.dataset.lesson));
    updateLesson();
    const panel = document.querySelector(".lesson-panel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  el.addEventListener("click", pick);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
  });
});

window.addEventListener("resize", () => {
  resizeCanvas(reactorCanvas, reactorCtx);
  resizeCanvas(historyCanvas, historyCtx);
  resizeCanvas(lawsonCanvas, lawsonCtx);
  chartsDirty = true;
});

/* ---------- Navigation HUD wiring ---------- */
function initNavHud() {
  initGizmo();
  window.addEventListener("resize", initGizmo);

  const legend = document.getElementById("navLegend");
  const help = document.getElementById("navHelp");
  const showLegend = (show) => {
    if (legend) legend.classList.toggle("hide", !show);
    if (help) help.hidden = show;
  };
  let legendDismissed = false;
  const dismissLegend = () => { if (!legendDismissed) { legendDismissed = true; showLegend(false); } };
  document.getElementById("legendClose")?.addEventListener("click", dismissLegend);
  help?.addEventListener("click", () => { legendDismissed = false; showLegend(true); });
  reactorCanvas.addEventListener("pointerdown", dismissLegend, { once: true });
  reactorCanvas.addEventListener("wheel", dismissLegend, { once: true, passive: true });
  setTimeout(dismissLegend, 7000);

  // gizmo view snaps + active-state
  const viewBtns = Array.from(document.querySelectorAll(".gizmo-btn"));
  const setActiveView = (name) => viewBtns.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  viewBtns.forEach((b) => b.addEventListener("click", () => { snapToView(b.dataset.view); setActiveView(b.dataset.view); dismissLegend(); }));
  // clicking the cube cycles iso -> top -> front -> side
  const order = ["iso", "top", "front", "side"];
  let gz = 0;
  gizmoCanvas?.addEventListener("click", () => { gz = (gz + 1) % order.length; snapToView(order[gz]); setActiveView(order[gz]); dismissLegend(); });
  // any manual orbit clears the highlighted view
  reactorCanvas.addEventListener("pointerdown", () => setActiveView(null));

  // camera control cluster
  const cluster = document.querySelector(".nav-cluster");
  const spinBtn = cluster?.querySelector('[data-cam="spin"]');
  const panBtn = cluster?.querySelector('[data-cam="pan"]');
  cluster?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cam]");
    if (!btn) return;
    const cmd = btn.dataset.cam;
    if (cmd === "zoom-in") animateCameraTo({ yaw: cam.yaw, pitch: cam.pitch, dist: clamp(cam.dist - 0.5, 1.9, 6.4) }, 260);
    else if (cmd === "zoom-out") animateCameraTo({ yaw: cam.yaw, pitch: cam.pitch, dist: clamp(cam.dist + 0.5, 1.9, 6.4) }, 260);
    else if (cmd === "reset") { snapToView("iso"); setActiveView(null); }
    else if (cmd === "spin") { autoSpin = !autoSpin; spinBtn.setAttribute("aria-pressed", String(autoSpin)); lastInteract = performance.now(); }
    else if (cmd === "pan") { panSticky = !panSticky; panBtn.setAttribute("aria-pressed", String(panSticky)); reactorCanvas.style.cursor = panSticky ? "move" : "grab"; }
    dismissLegend();
  });
}

/* ---------- Missions / challenges ---------- */
/* Two intro milestones a preset can reach, then five constraint puzzles that no
   preset satisfies: each forces a deliberate tradeoff, so they must be hand-tuned. */
const MISSIONS = [
  { id: "firstlight", name: "First Light", goal: "Produce 400 MW of fusion power", hint: "Try the Cruise preset, then nudge Fuel injection up.", test: (m) => m.fusionPower >= 400 },
  { id: "netpos", name: "Net Positive", goal: "Send real power to the grid (net above 0)", hint: "Cruise reaches it; net power needs a high Q, not just Q above 1.", test: (m) => m.netElec > 0 },
  { id: "leanburn", name: "Lean Burn", goal: "Reach Q of 4 with fuel injection at 65% or less", hint: "From Cruise, ease Fuel injection down toward 65% while keeping the field strong.", test: (m) => m.q >= 4 && m.fuelRate <= 65 },
  { id: "strongfield", name: "Strong Field", goal: "Reach Q of 3 with magnetic field at 8 T or more", hint: "Push Magnetic field to 8 T or more (High Gain is close), temperature up.", test: (m) => m.q >= 3 && m.magneticField >= 8.0 },
  { id: "frugal", name: "Frugal Plant", goal: "Go net positive with turbine load at 70% or less", hint: "From Cruise, lower Turbine load toward 70% but stay net positive.", test: (m) => m.netElec > 0 && m.turbineLoad <= 70 },
  { id: "breed", name: "Self-Sufficient", goal: "Breed tritium (TBR over 1) with coolant at 70% or less", hint: "Lower Blanket coolant toward 70% while holding a strong burn.", test: (m) => m.tritiumRatio >= 1 && m.coolingFlow <= 70 },
  { id: "ignition", name: "Ignition", goal: "Reach ignition with fuel injection at 75% or less", hint: "Use High Gain, then trim Fuel injection under 75%.", test: (m) => m.phi >= 0.95 && m.fuelRate <= 75 }
];
const missionState = {};
let missionPrevT = 0, missionsInitialized = false;

function buildMissions() {
  const list = document.getElementById("missionList");
  const total = document.getElementById("missionTotal");
  if (total) total.textContent = MISSIONS.length;
  if (!list) return;
  list.innerHTML = "";
  MISSIONS.forEach((mn) => {
    const chip = document.createElement("div");
    chip.className = "mission-chip";
    chip.innerHTML =
      '<span class="mission-check" aria-hidden="true"></span>' +
      `<span class="mission-name">${mn.name}</span>` +
      `<span class="mission-goal">${mn.goal}</span>` +
      (mn.hold ? '<span class="mission-bar"><span></span></span>' : "") +
      (mn.hint ? '<button type="button" class="mission-hint-btn" aria-expanded="false">Hint</button>' +
                 `<p class="mission-hint" hidden>${mn.hint}</p>` : "");
    list.appendChild(chip);
    missionState[mn.id] = { done: false, hold: 0, el: chip, bar: mn.hold ? chip.querySelector(".mission-bar span") : null };
  });
  // U3: one delegated handler reveals a starting hint per challenge (kept hidden so the puzzle stays a puzzle).
  if (!buildMissions._wired) {
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".mission-hint-btn");
      if (!btn) return;
      const hint = btn.nextElementSibling;
      const show = hint && hint.hidden;
      if (hint) hint.hidden = !show;
      btn.setAttribute("aria-expanded", String(!!show));
      btn.textContent = show ? "Hide hint" : "Hint";
    });
    buildMissions._wired = true;
  }
  missionPrevT = performance.now();
}

function showMissionToast(name) {
  const t = document.getElementById("missionToast");
  if (!t) return;
  t.textContent = `Mission complete: ${name}`;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2600);
}

function completeMission(mn, st) {
  st.done = true;
  st.el.classList.add("done");
  if (st.bar) st.bar.style.width = "100%";
  if (missionsInitialized) {
    st.el.classList.add("justdone");
    setTimeout(() => st.el.classList.remove("justdone"), 900);
    showMissionToast(mn.name);
    const chip = document.getElementById("missionChip");   // U3: pulse the status-strip chip too
    if (chip) { chip.classList.add("pulse"); setTimeout(() => chip.classList.remove("pulse"), 1000); }
  }
}

function updateMissions() {
  if (!missionState.firstlight) return;
  const now = performance.now();
  let dt = (now - missionPrevT) / 1000; missionPrevT = now;
  if (!(dt > 0) || dt > 1) dt = 0.36;
  let count = 0;
  MISSIONS.forEach((mn) => {
    const st = missionState[mn.id];
    if (!st) return;
    if (st.done) { count += 1; return; }
    const pass = !!mn.test(model);
    if (mn.hold) {
      st.hold = pass ? Math.min(mn.hold, st.hold + dt) : 0;
      if (st.bar) st.bar.style.width = `${(st.hold / mn.hold) * 100}%`;
      if (st.hold >= mn.hold) completeMission(mn, st);
    } else if (pass) {
      completeMission(mn, st);
    }
    if (st.done) count += 1;
  });
  missionsInitialized = true;
  const c = document.getElementById("missionCount");
  if (c) c.textContent = count;
  const cc = document.getElementById("missionChipCount");   // U3: keep the status-strip chip in sync
  if (cc) cc.textContent = count;
}

/* ---------- Teachable tooltips ---------- */
const TIPS = {
  temperature: { title: "Plasma temperature", body: "How hot the fuel ions are. 1 keV is about 11.6 million °C. Hotter ions fuse faster, but the rate only keeps climbing to roughly 65 keV. Reactors run at 10 to 20 keV, where confinement is achievable.", formula: "1 keV ≈ 11.6 million °C" },
  magneticField: { title: "Magnetic field", body: "Field strength from the superconducting coils, in tesla. A stronger field holds the plasma's energy longer and lets it run at higher pressure before going unstable.", real: "ITER: ~5.3 T on axis, up to ~12 T at the coils" },
  fuelRate: { title: "Fuel injection", body: "How fast D-T pellets are fed in, which sets the plasma density. More fuel means more reactions, but more than the field can hold raises disruption risk." },
  fuelBalance: { title: "D-T balance", body: "The deuterium to tritium mix. A 50/50 blend gives the highest reaction rate; drifting either way lowers fusion power." },
  coolingFlow: { title: "Blanket coolant", body: "How much coolant carries blanket heat to the steam cycle. Too little overheats the blanket; too much wastes pumping power. There is a sweet spot." },
  turbineLoad: { title: "Turbine load", body: "How hard the turbine-generator is driven. Higher load converts more heat to electricity, but only when the blanket is hot and cooling is matched." },
  fusionPower: { title: "Fusion power", body: "Total power released by fusion, in megawatts. About 20% (alpha particles) stays to heat the plasma; 80% (neutrons) deposits in the blanket.", formula: "P_fus ∝ n² · ⟨σv⟩(T)" },
  qPlasma: { title: "Energy gain Q", body: "Fusion power out divided by heating power in. Q = 1 is scientific breakeven; net electricity needs roughly Q above 5; Q to infinity is ignition.", formula: "Q = P_fusion / P_heating" },
  electricOutput: { title: "Net electric", body: "Gross turbine electricity minus the power the plant uses to run itself (magnets, pumps, heating). This is what reaches the grid, and it can be negative." },
  tripleProduct: { title: "Triple product", body: "Density times temperature times confinement time, the single figure of merit for fusion progress. D-T ignition needs about 3.", formula: "n · T · τ_E  (×10²¹ keV·s·m⁻³)" },
  confinementTime: { title: "Confinement time", body: "How long the plasma holds its energy before it leaks out, in seconds. Rises strongly with magnetic field and device size." },
  stability: { title: "Stability", body: "Margin against a disruption. Falls when plasma pressure outruns the field (high beta) or when wall and coolant heat run hot." },
  wallLoad: { title: "Wall load", body: "Heat flux on the plasma-facing wall, in MW per square meter. Materials cap this near 10; sweeping the divertor spreads the load.", real: "Limit: roughly 10 MW/m²" },
  coolantTemp: { title: "Coolant outlet", body: "Temperature of coolant leaving the blanket. Hotter coolant gives more efficient electricity, up to material limits." },
  tritiumRatio: { title: "Tritium breeding ratio", body: "Tritium bred in the lithium blanket per tritium burned. Above 1.0 the plant makes its own fuel; below 1.0 it runs its supply down.", formula: "TBR > 1.0 = self-sufficient" },
  reactorState: { title: "Reactor state", body: "The current operating regime, from Startup through Burning Plasma to Ignition, plus warnings like Disruption Risk or Thermal Limit." },
  netPowerBadge: { title: "Net electric", body: "Gross turbine electricity minus the plant's own recirculating power. Positive means the reactor is a net energy source." },
  qBadge: { title: "Energy gain Q", body: "Fusion power out divided by heating power in. Q = 1 is breakeven; ignition is Q to infinity.", formula: "Q = P_fusion / P_heating" },
  radLoss: { title: "Radiated loss", body: "Bremsstrahlung: the plasma glows in X-rays as fast electrons brush past ions. The loss grows with density squared and the square root of temperature. It is small at reactor conditions but can outpace fusion in a cold, dense plasma, which sets a lower limit on useful temperature.", formula: "P_rad ∝ n² · √T" },
  greenwaldFrac: { title: "Density vs limit", body: "How close the plasma density sits to the Greenwald limit, the empirical ceiling a tokamak can hold before a density-limit disruption. The limit rises with plasma current, so a stronger field allows more density. Past 100% the plasma is likely to disrupt, a separate failure mode from the beta (pressure) limit.", formula: "f = n / n_Greenwald" }
};
let tipPop = null;
function buildTipContent(t) {
  return `<strong>${t.title}</strong><span>${t.body}</span>` + (t.formula ? `<code>${t.formula}</code>` : "") + (t.real ? `<em>${t.real}</em>` : "");
}
function positionTip(dot) {
  const r = dot.getBoundingClientRect();
  tipPop.style.left = "0px"; tipPop.style.top = "0px";
  const p = tipPop.getBoundingClientRect();
  let x = r.left + r.width / 2 - p.width / 2;
  let y = r.top - p.height - 8;
  if (y < 8) y = r.bottom + 8;
  x = Math.max(8, Math.min(x, window.innerWidth - p.width - 8));
  y = Math.max(8, Math.min(y, window.innerHeight - p.height - 8));
  tipPop.style.left = `${x}px`; tipPop.style.top = `${y}px`;
}
function showTip(dot) { const t = TIPS[dot.dataset.tip]; if (!t || !tipPop) return; tipPop.innerHTML = buildTipContent(t); tipPop.hidden = false; positionTip(dot); }
function hideTip() { if (tipPop) tipPop.hidden = true; }
function attachTips() {
  tipPop = document.getElementById("tipPop");
  if (!tipPop) return;
  const addDot = (container, id) => {
    if (!container || !TIPS[id] || container.querySelector(".tip-dot")) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "tip-dot"; b.dataset.tip = id; b.textContent = "i";
    b.setAttribute("aria-label", `About ${TIPS[id].title}`);
    b.addEventListener("pointerenter", () => showTip(b));
    b.addEventListener("pointerleave", hideTip);
    b.addEventListener("focus", () => showTip(b));
    b.addEventListener("blur", hideTip);
    b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); if (tipPop.hidden) showTip(b); else hideTip(); });
    container.appendChild(b);
  };
  document.querySelectorAll(".control").forEach((c) => addDot(c.querySelector("strong"), c.getAttribute("for")));
  document.querySelectorAll(".metric").forEach((m) => { const s = m.querySelector("strong[id]"); if (s) addDot(m.querySelector(".metric-label"), s.id); });
  document.querySelectorAll(".system-row").forEach((row) => { const s = row.querySelector("strong[id]"); if (s) addDot(row.querySelector("span"), s.id); });
  document.querySelectorAll(".status-block").forEach((b) => { const idEl = b.querySelector("[id]"); const cap = b.querySelector(".status-caption"); if (idEl && cap) addDot(cap, idEl.id); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".tip-dot")) hideTip(); });
  window.addEventListener("scroll", hideTip, true);
}

/* ---------- Phase 1 controls: themes, real-world units, presentation, scale ---------- */
const THEMES = ["dark", "light", "contrast", "cb"];
function applyTheme(name) {
  const t = THEMES.includes(name) ? name : "dark";
  if (t === "dark") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("fusionTheme", t); } catch (e) {}
  const sel = document.getElementById("themeSelect");
  if (sel) sel.value = t;
  chartsDirty = true;   // C1: recolor charts immediately on theme change
}

let kioskOn = false;
function setKiosk(on) {
  kioskOn = on;
  document.body.classList.toggle("kiosk", on);
  const btn = document.getElementById("presentBtn");
  if (btn) { btn.setAttribute("aria-pressed", String(on)); btn.textContent = on ? "Exit" : "Present"; }
  if (on) {
    kioskLast = performance.now();
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  setTimeout(() => {
    resizeCanvas(reactorCanvas, reactorCtx);
    resizeCanvas(lawsonCanvas, lawsonCtx);
    resizeCanvas(historyCanvas, historyCtx);
  }, 90);
}

function tickKiosk() {
  if (!kioskOn) return;
  const now = performance.now();
  if (now - kioskLast > 12000) {
    kioskLast = now;
    const order = ["startup", "cruise", "gain", "stress", "cruise"];
    kioskCycle = (kioskCycle + 1) % order.length;
    applyPreset(order[kioskCycle]);
  }
}

function initPhase1Controls() {
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("fusionTheme") || "dark"; } catch (e) {}
  applyTheme(savedTheme);
  document.getElementById("themeSelect")?.addEventListener("change", (e) => applyTheme(e.target.value));

  try { unitMode = localStorage.getItem("fusionUnits") === "1"; } catch (e) {}
  const unitBtn = document.getElementById("unitsToggle");
  const syncUnit = () => { if (unitBtn) unitBtn.setAttribute("aria-pressed", String(unitMode)); updateRealWorld(); };
  syncUnit();
  unitBtn?.addEventListener("click", () => {
    unitMode = !unitMode;
    try { localStorage.setItem("fusionUnits", unitMode ? "1" : "0"); } catch (e) {}
    syncUnit();
  });

  document.getElementById("presentBtn")?.addEventListener("click", () => setKiosk(!kioskOn));
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && kioskOn) setKiosk(false); });
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => { kioskLast = performance.now(); lastUserAction = performance.now(); }, { passive: true }));

  const scaleBtn = document.getElementById("scaleToggle");
  scaleBtn?.addEventListener("click", () => {
    scaleRef = !scaleRef;
    scaleBtn.setAttribute("aria-pressed", String(scaleRef));
  });

  const mac = document.getElementById("showMachines");
  if (mac) {
    mac.checked = showMachines;
    mac.addEventListener("change", () => { showMachines = mac.checked; chartsDirty = true; });
  }
}

/* ============================================================
   PHASE 2 ADDITIONS
   Disruption FX, cross-section, materials, export, sound, tour, story.
   ============================================================ */

/* ---- A8: disruption + quench event (screen shake + flash) ---- */
let disruptFx = { t: 0, prevRisk: 0, prevQuench: false };
function updateDisruption(dt) {
  const risk = model.disruptionRisk || 0;
  const quench = !!model.emergencyQuench;
  if ((risk > 0.62 && disruptFx.prevRisk <= 0.62) || (quench && !disruptFx.prevQuench)) disruptFx.t = 1;
  disruptFx.prevRisk = risk; disruptFx.prevQuench = quench;
  if (disruptFx.t > 0) disruptFx.t = Math.max(0, disruptFx.t - dt * 0.0016);
}
function disruptionShake() {
  if (reduceMotion || disruptFx.t <= 0) return 0;
  return disruptFx.t * disruptFx.t * 11;
}
function drawDisruptionFlash(ctx, w, h) {
  if (disruptFx.t <= 0) return;
  const k = disruptFx.t;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.72);
  g.addColorStop(0, `rgba(255,${120 + Math.round(70 * k)},90,${0.30 * k})`);
  g.addColorStop(0.5, `rgba(255,90,70,${0.12 * k})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `rgba(255,70,60,${0.55 * k})`;
  ctx.lineWidth = 7 * k;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.restore();
}

/* ---- A3: labeled poloidal cross-section inset ---- */
function drawCrossSection() {
  const cv = document.getElementById("crossCanvas");
  if (!cv || cv.hidden) return;
  const ctx = cv.getContext("2d");
  const rect = resizeCanvas(cv, ctx);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.40, cy = h * 0.52, R0 = Math.min(w, h) * 0.40;
  const tNorm = clamp((model.temperature - 6) / 22, 0, 1);
  const wallK = clamp((model.wallLoad || 0) / 14, 0, 1);
  const inten = clamp((model.fusionPower || 0) / 1200, 0.05, 1);
  const pcol = plasmaColor(tNorm);
  const shells = [
    { r: 1.00, col: [58, 66, 90], lab: "TF coil" },
    { r: 0.90, col: [92, 106, 132], lab: "Vacuum vessel" },
    { r: 0.78, col: [120 + Math.round(wallK * 120), 96, 70], lab: "Breeding blanket" },
    { r: 0.60, col: [66, 138, 150], lab: "Scrape-off layer" },
    { r: 0.52, col: mixColor([60, 150, 170], pcol, 0.5), lab: "Separatrix" },
    { r: 0.45, col: pcol, lab: "Plasma" }
  ];
  const cc = (v) => clamp(Math.round(v), 0, 255);
  shells.forEach((s) => {
    ctx.beginPath(); ctx.arc(cx, cy, R0 * s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${cc(s.col[0])},${cc(s.col[1])},${cc(s.col[2])})`;
    ctx.fill();
  });
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const hot = mixColor(pcol, [255, 255, 245], 0.5);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.45);
  g.addColorStop(0, `rgba(${hot[0]},${hot[1]},${hot[2]},${0.5 + inten * 0.4})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0 * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.font = "10px Inter, system-ui, sans-serif"; ctx.textBaseline = "middle";
  shells.forEach((s, i) => {
    const ang = -Math.PI * 0.62 + (i - 2.5) * 0.14;
    const ex = cx + Math.cos(ang) * R0 * s.r, ey = cy + Math.sin(ang) * R0 * s.r;
    const ly = 24 + i * ((h - 34) / (shells.length - 1));
    const tw = ctx.measureText(s.lab).width;
    const lx = w - 8;
    ctx.strokeStyle = "rgba(150,164,190,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(lx - tw - 10, ly); ctx.stroke();
    ctx.fillStyle = `rgb(${cc(s.col[0])},${cc(s.col[1])},${cc(s.col[2])})`;
    ctx.beginPath(); ctx.arc(lx - tw - 14, ly, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(225,232,244,0.92)"; ctx.textAlign = "right";
    ctx.fillText(s.lab, lx, ly);
  });
  ctx.fillStyle = "rgba(150,164,190,0.85)"; ctx.font = "700 9px Inter, system-ui, sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("CROSS-SECTION", 8, 14);
}

/* ---- D1: first-wall / materials accrual ---- */
let wallDose = 0;
function updateMaterials(dt) {
  const wl = model.wallLoad || 0;
  wallDose += wl * dt * 0.004; // illustrative displacement-per-atom accrual
  const dEl = document.getElementById("matDose");
  const sEl = document.getElementById("matStatus");
  const bEl = document.getElementById("matLifeBar");
  if (dEl) dEl.textContent = `${wallDose.toFixed(2)} dpa`;
  let status = "Nominal", cls = "ok";
  if (wl > 12) { status = "Over limit"; cls = "bad"; }
  else if (wl > 8) { status = "Elevated"; cls = "warn"; }
  if (sEl) { sEl.textContent = status; sEl.className = `mat-status ${cls}`; }
  if (bEl) {
    const life = clamp(1 - wallDose / 100, 0, 1);
    bEl.style.width = `${life * 100}%`;
    bEl.style.background = life < 0.25 ? "var(--coral)" : "var(--teal)";
  }
}

/* ---- C7: export the run as a CSV lab worksheet ---- */
function exportRun() {
  const m = model;
  const L = [];
  L.push("Fusion Power Generator - run export");
  L.push(`exported,${new Date().toISOString()}`);
  L.push("");
  L.push("Setpoints");
  L.push(`temperature_keV,${Number(controls.temperature.value)}`);
  L.push(`magnetic_field_T,${Number(controls.magneticField.value)}`);
  L.push(`fuel_injection_pct,${Number(controls.fuelRate.value)}`);
  L.push(`DT_balance,${Number(controls.fuelBalance.value)}`);
  L.push(`coolant_pct,${Number(controls.coolingFlow.value)}`);
  L.push(`turbine_load_pct,${Number(controls.turbineLoad.value)}`);
  L.push(`neutral_beam,${controls.neutralBeam.checked}`);
  L.push(`pellet_pacing,${controls.pelletPulse.checked}`);
  L.push(`divertor_sweep,${controls.divertorSweep.checked}`);
  L.push(`emergency_quench,${controls.emergencyQuench.checked}`);
  L.push("");
  L.push("Outputs");
  L.push(`fusion_power_MW,${Math.round(m.fusionPower || 0)}`);
  L.push(`energy_gain_Q,${(m.q || 0).toFixed(2)}`);
  L.push(`net_electric_MW,${Math.round(m.netElec || 0)}`);
  L.push(`triple_product_e21,${(m.triple || 0).toFixed(2)}`);
  L.push(`confinement_tauE_s,${(m.tauE || 0).toFixed(2)}`);
  L.push(`stability_pct,${Math.round(m.stability || 0)}`);
  L.push(`wall_load_MWm2,${(m.wallLoad || 0).toFixed(1)}`);
  L.push(`tritium_breeding_ratio,${(m.tritiumRatio || 0).toFixed(2)}`);
  L.push(`first_wall_dose_dpa,${wallDose.toFixed(2)}`);
  L.push("");
  L.push("History (oldest to newest)");
  L.push("sample,net_electric_MW,fusion_power_MW");
  for (let i = 0; i < netHistory.length; i += 1) L.push(`${i},${Math.round(netHistory[i])},${Math.round(fusionHistory[i])}`);
  const blob = new Blob([L.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "fusion-run.csv";
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

/* ---- B7: layered reactor soundscape (raw Web Audio, off by default) ----
   A continuous "bed" of detuned drone + sub-bass, coil whine, coolant hiss, and
   turbine flutter, all driven by the live model, plus a fusion "boil" of noise
   grains and gentle repeating alarms. A master gain (the volume slider) and a
   ducking bus keep it tasteful; everything is synthesized, no audio files. ---- */
let audioCtx = null, soundOn = false, audioReady = false, soundVol = 0.6;
let masterGain = null, bedGain = null, alarmGain = null, noiseBuffer = null;
let drA = null, drB = null, drSub = null, drFilter = null;
let coilOsc = null, coilGain = null, coolGain = null, coolFilter = null, turbGain = null, turbLfoGain = null;
let sndPrevPhi = 0, sndPrevMissions = 0, sndPrevNet = 0;
let boilAcc = 0, warbleNext = 0, warbleTog = 0, thermalNext = 0;

function mkLayer(type, freq, gv, dest) {
  const o = audioCtx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = audioCtx.createGain(); g.gain.value = gv;
  o.connect(g); g.connect(dest); o.start();
  return { o, g };
}
function initAudio() {
  if (audioReady) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    masterGain = audioCtx.createGain(); masterGain.gain.value = soundVol; masterGain.connect(audioCtx.destination);
    bedGain = audioCtx.createGain(); bedGain.gain.value = 0.0001; bedGain.connect(masterGain);
    alarmGain = audioCtx.createGain(); alarmGain.gain.value = 1; alarmGain.connect(masterGain);
    noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const nd = noiseBuffer.getChannelData(0);
    for (let i = 0; i < nd.length; i += 1) nd[i] = Math.random() * 2 - 1;
    drFilter = audioCtx.createBiquadFilter(); drFilter.type = "lowpass"; drFilter.frequency.value = 600; drFilter.connect(bedGain);
    drA = mkLayer("sine", 60, 0.32, drFilter);
    drB = mkLayer("triangle", 90, 0.10, drFilter);
    drSub = mkLayer("sine", 30, 0.32, drFilter);
    const breLfo = audioCtx.createOscillator(); breLfo.type = "sine"; breLfo.frequency.value = 0.12;
    const breGain = audioCtx.createGain(); breGain.gain.value = 130;
    breLfo.connect(breGain); breGain.connect(drFilter.frequency); breLfo.start();
    const coil = mkLayer("sine", 500, 0.0001, bedGain); coilOsc = coil.o; coilGain = coil.g;
    const cs = audioCtx.createBufferSource(); cs.buffer = noiseBuffer; cs.loop = true;
    coolFilter = audioCtx.createBiquadFilter(); coolFilter.type = "bandpass"; coolFilter.frequency.value = 1200; coolFilter.Q.value = 0.7;
    coolGain = audioCtx.createGain(); coolGain.gain.value = 0.0001;
    cs.connect(coolFilter); coolFilter.connect(coolGain); coolGain.connect(bedGain); cs.start();
    const turb = mkLayer("sawtooth", 140, 0.0001, bedGain); turbGain = turb.g;
    const tLfo = audioCtx.createOscillator(); tLfo.type = "sine"; tLfo.frequency.value = 6;
    turbLfoGain = audioCtx.createGain(); turbLfoGain.gain.value = 0.0;
    tLfo.connect(turbLfoGain); turbLfoGain.connect(turbGain.gain); tLfo.start();
    audioReady = true;
    return true;
  } catch (e) { audioReady = false; return false; }
}
function tone(freq, dur, type, vol) {
  if (!audioReady) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || "sine"; o.frequency.value = freq;
  o.connect(g); g.connect(alarmGain);
  const t = audioCtx.currentTime, d = dur || 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.1), t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.start(t); o.stop(t + d + 0.03);
}
function chimeUp() { tone(523, 0.18, "triangle", 0.1); setTimeout(() => tone(784, 0.3, "triangle", 0.1), 110); setTimeout(() => tone(1046, 0.34, "triangle", 0.08), 230); }
function ignitionSwell() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.6, "sine", 0.09), i * 130)); }
function boilTick(fp) {
  if (!audioReady || !noiseBuffer) return;
  const src = audioCtx.createBufferSource(); src.buffer = noiseBuffer;
  src.playbackRate.value = 0.8 + Math.random() * 1.5;
  const bp = audioCtx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400 + Math.random() * 2600; bp.Q.value = 2.5;
  const g = audioCtx.createGain();
  const t = audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.012 + fp * 0.03, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.connect(bp); bp.connect(g); g.connect(bedGain);
  src.start(t); src.stop(t + 0.08);
}
function setSoundVol(v) {
  soundVol = clamp(v, 0, 1);
  if (masterGain && audioCtx && soundOn) masterGain.gain.setTargetAtTime(soundVol, audioCtx.currentTime, 0.05);
  try { localStorage.setItem("fusionSoundVol", String(soundVol)); } catch (e) {}
}
function setSound(on) {
  soundOn = on;
  if (on) {
    initAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    sndPrevMissions = Number(document.getElementById("missionCount")?.textContent || 0);
    if (masterGain) masterGain.gain.setTargetAtTime(soundVol, audioCtx.currentTime, 0.1);
  } else if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.15);
  }
  const btn = document.getElementById("soundToggle");
  if (btn) btn.setAttribute("aria-pressed", String(on));
  const vol = document.getElementById("soundVol");
  if (vol) vol.hidden = !on;
  try { localStorage.setItem("fusionSound", on ? "1" : "0"); } catch (e) {}
}
function updateSound() {
  if (!soundOn || !audioReady) return;
  const t = audioCtx.currentTime, tc = 0.4;
  const fp = clamp((model.fusionPower || 0) / 2000, 0, 1);
  const tN = clamp(((model.temperature || 6) - 6) / 30, 0, 1);
  const field = clamp((model.magneticField || 5) / 8.8, 0, 1);
  const cool = clamp((model.coolingFlow || 0) / 100, 0, 1);
  const turb = clamp((model.turbineLoad || 0) / 100, 0, 1);
  const disr = (model.disruptionRisk || 0) > 0.6 || (model.stability || 100) < 28;
  const thermal = (model.coolantTemp || 0) > 640 || (model.wallLoad || 0) > 14;
  const duck = (disr || thermal) ? 0.5 : 1;
  const base = 42 + fp * 46 + tN * 14;
  drA.o.frequency.setTargetAtTime(base, t, tc);
  drB.o.frequency.setTargetAtTime(base * 1.5, t, tc);
  drSub.o.frequency.setTargetAtTime(base * 0.5, t, tc);
  drFilter.frequency.setTargetAtTime(300 + fp * 1400 + tN * 400, t, tc);
  bedGain.gain.setTargetAtTime((0.32 + fp * 0.42) * duck, t, tc);
  coilOsc.frequency.setTargetAtTime(420 + field * 900, t, tc);
  coilGain.gain.setTargetAtTime(0.005 + field * 0.024, t, tc);
  coolGain.gain.setTargetAtTime(0.012 + cool * 0.05, t, tc);
  coolFilter.frequency.setTargetAtTime(800 + cool * 1600, t, tc);
  turbGain.gain.setTargetAtTime(0.012 + turb * 0.045, t, tc);
  turbLfoGain.gain.setTargetAtTime(0.01 + turb * 0.04, t, tc);
  boilAcc += 0.36 * fp * 13;
  let guard = 0;
  while (boilAcc >= 1 && guard < 8) { boilAcc -= 1; guard += 1; boilTick(fp); }
  const phi = model.phi || 0;
  if (phi >= 0.95 && sndPrevPhi < 0.95) ignitionSwell();
  sndPrevPhi = phi;
  const net = model.netElec || 0;
  if (net > 0 && sndPrevNet <= 0) tone(660, 0.25, "sine", 0.09);
  sndPrevNet = net;
  const mc = Number(document.getElementById("missionCount")?.textContent || 0);
  if (mc > sndPrevMissions) { chimeUp(); sndPrevMissions = mc; }
  if (disr && t >= warbleNext) { warbleTog ^= 1; tone(warbleTog ? 466 : 350, 0.22, "square", 0.06); warbleNext = t + 0.32; }
  if (thermal && !disr && t >= thermalNext) { tone(540, 0.18, "sine", 0.05); thermalNext = t + 1.4; }
}

/* ---- B4: guided tour + power-up ---- */
const TOUR = [
  { sel: ".preset-row", title: "Start with a preset", body: "Jump to Cruise or High Gain, then fine-tune the sliders from there." },
  { sel: "#temperature", title: "Heat the fuel", body: "Temperature sets how fast deuterium and tritium fuse. Slide it up and watch the core brighten." },
  { sel: "#magneticField", title: "Hold it together", body: "A stronger magnetic field confines the plasma longer, lifting the triple product toward ignition." },
  { sel: ".reactor-stage", title: "The reactor", body: "Drag to orbit, scroll to zoom. Try the Scale and Cutaway buttons at the lower left." },
  { sel: "#qPlasma", title: "Energy gain Q", body: "Fusion power out divided by heating in. Above 1 is breakeven; keep climbing toward ignition." },
  { sel: "#lawsonCanvas", title: "Where you stand", body: "Your operating point against the ignition curve and real machines like ITER and SPARC." }
];
let tourStep = -1;
function showTourStep(i) {
  const card = document.getElementById("tourCard");
  const ring = document.getElementById("tourRing");
  if (!card || !ring) return;
  if (i < 0 || i >= TOUR.length) { endTour(); return; }
  tourStep = i;
  const step = TOUR[i];
  const el = document.querySelector(step.sel);
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    const r = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    ring.style.left = `${r.left - 6}px`; ring.style.top = `${r.top - 6}px`;
    ring.style.width = `${r.width + 12}px`; ring.style.height = `${r.height + 12}px`;
    ring.hidden = false;
    const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
    set("tourTitle", step.title); set("tourBody", step.body); set("tourProg", `${i + 1} / ${TOUR.length}`);
    const nb = document.getElementById("tourNext"); if (nb) nb.textContent = i === TOUR.length - 1 ? "Done" : "Next";
    let cx2 = r.left, cy2 = r.top + r.height + 12;
    if (cy2 + 170 > window.innerHeight) cy2 = Math.max(12, r.top - 176);
    card.style.left = `${clamp(cx2, 12, Math.max(12, window.innerWidth - 332))}px`;
    card.style.top = `${clamp(cy2, 12, Math.max(12, window.innerHeight - 176))}px`;
    card.hidden = false;
  }, 240);
}
function startTour() { const o = document.getElementById("tourOverlay"); if (o) o.hidden = false; showTourStep(0); dialogOpen(document.getElementById("tourCard"), "#tourNext", endTour); }
function endTour() {
  ["tourOverlay", "tourCard", "tourRing"].forEach((id) => { const e = document.getElementById(id); if (e) e.hidden = true; });
  tourStep = -1;
  try { localStorage.setItem("fusionTourDone", "1"); } catch (e) {}
  dialogClose();   // A1: restore focus to whatever opened the tour
}
function runPowerUp() {
  const ov = document.getElementById("powerup");
  if (ov) {
    if (reduceMotion) ov.hidden = true;
    else { ov.hidden = false; ov.classList.add("run"); setTimeout(() => { ov.hidden = true; }, 1900); }
  }
  // The guided tour no longer auto-starts; it runs only from the Tour button.
}

/* ---- C1: guided story mode ---- */
const STORY = [
  { title: "1. Just cold gas", body: "Right now the deuterium and tritium are too cold to fuse, so nothing happens. Let us change that.", hint: "Watch the core stay dark.", sel: ".reactor-stage", test: () => true },
  { title: "2. Heat the fuel", body: "Raise plasma temperature. Hotter ions collide hard enough to fuse, and the reaction rate climbs steeply.", hint: "Set temperature to about 15 keV.", sel: "#temperature", test: () => Number(controls.temperature.value) >= 14 },
  { title: "3. Hold it with the field", body: "Heat leaks out unless you confine it. Raise the magnetic field to keep the energy in long enough to matter.", hint: "Set magnetic field near 7 T.", sel: "#magneticField", test: () => Number(controls.magneticField.value) >= 6.8 },
  { title: "4. Feed the fire", body: "More fuel means more reactions. Increase injection and watch fusion power climb.", hint: "Get fusion power above 400 MW.", sel: "#fuelRate", test: (m) => (m.fusionPower || 0) >= 400 },
  { title: "5. Cross breakeven", body: "When fusion power passes the heating you supply, Q passes 1. You now get more out than you put in.", hint: "Push Q above 1.", sel: "#qPlasma", test: (m) => (m.q || 0) >= 1 },
  { title: "6. Ignition", body: "Near ignition the plasma heats itself and Q runs away. This is the goal of fusion energy.", hint: "Reach the ignition state.", sel: ".reactor-stage", test: (m) => (m.phi || 0) >= 0.95 }
];
let storyOn = false, storyStep = 0;
// U4: reuse the tour's highlight ring to point the learner at the control each story step names.
// The ring is repositioned every frame (positionStoryRing in animate) so it follows the control after
// the page scrolls it into view - and it only ever touches the ring while the story owns it, so the
// tour (which shares the ring element) is left alone.
let storyEl = null;
function storySpotlight(sel) {
  storyEl = sel ? document.querySelector(sel) : null;
  if (!storyEl) { const ring = document.getElementById("tourRing"); if (ring) ring.hidden = true; return; }
  if (storyEl.scrollIntoView) storyEl.scrollIntoView({ behavior: "smooth", block: "center" });
  positionStoryRing();
}
function positionStoryRing() {
  if (!storyOn || !storyEl) return;
  const ring = document.getElementById("tourRing");
  if (!ring) return;
  const r = storyEl.getBoundingClientRect();
  ring.style.left = `${r.left - 6}px`; ring.style.top = `${r.top - 6}px`;
  ring.style.width = `${r.width + 12}px`; ring.style.height = `${r.height + 12}px`;
  ring.hidden = false;
}
function renderStory() {
  const panel = document.getElementById("storyPanel");
  if (!panel) return;
  panel.hidden = !storyOn;
  if (!storyOn) { storySpotlight(null); return; }
  const s = STORY[storyStep];
  const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
  set("storyTitle", s.title); set("storyBody", s.body); set("storyHint", s.hint);
  set("storyProg", `Step ${storyStep + 1} of ${STORY.length}`);
  const pv = document.getElementById("storyPrev"); if (pv) pv.disabled = storyStep === 0;
  const nx = document.getElementById("storyNext"); if (nx) nx.textContent = storyStep === STORY.length - 1 ? "Finish" : "Next";
  storySpotlight(s.sel);
}
function updateStory() {
  if (!storyOn) return;
  const met = !!STORY[storyStep].test(model);
  const badge = document.getElementById("storyCheck");
  if (badge) { badge.textContent = met ? "Goal met" : "Try it"; badge.className = `story-check ${met ? "met" : ""}`; }
}
function setStory(on) {
  storyOn = on; storyStep = 0;
  if (on) {
    // Step 1 ("just cold gas") must match the screen: snap the plasma genuinely cold
    // so the core stays dark until the learner heats it themselves in step 2.
    const cold = { temperature: 3.5, magneticField: 3.0, fuelRate: 32, fuelBalance: 50,
      coolingFlow: 66, turbineLoad: 30, neutralBeam: false, pelletPulse: false,
      divertorSweep: false, emergencyQuench: false };
    Object.entries(cold).forEach(([k, v]) => {
      if (typeof v === "boolean") controls[k].checked = v; else controls[k].value = v;
    });
    clearPresetHighlight();
    smoothed = null; burnT = null;   // reset dynamics so the cold state is immediate, not a slow ramp-down
    trail = [];
    updateReadouts();
  }
  const btn = document.getElementById("storyToggle");
  if (btn) btn.setAttribute("aria-pressed", String(on));
  renderStory();
  if (on) dialogOpen(document.getElementById("storyPanel"), "#storyNext", () => setStory(false));   // A1
  else dialogClose();
}
function storyNav(d) {
  if (storyOn && storyStep === STORY.length - 1 && d > 0) { setStory(false); return; }
  storyStep = clamp(storyStep + d, 0, STORY.length - 1);
  renderStory();
}

function initPhase2Controls() {
  const cut = document.getElementById("cutawayToggle");
  cut?.addEventListener("click", () => {
    const cv = document.getElementById("crossCanvas");
    if (!cv) return;
    const on = cv.hidden;
    cv.hidden = !on;
    cut.setAttribute("aria-pressed", String(on));
    chartsDirty = true;
  });
  document.getElementById("soundToggle")?.addEventListener("click", () => setSound(!soundOn));
  document.getElementById("tourBtn")?.addEventListener("click", () => startTour());
  document.getElementById("tourNext")?.addEventListener("click", () => showTourStep(tourStep + 1));
  document.getElementById("tourSkip")?.addEventListener("click", () => endTour());
  document.getElementById("tourOverlay")?.addEventListener("click", (e) => { if (e.target.id === "tourOverlay") endTour(); });
  document.getElementById("exportBtn")?.addEventListener("click", () => exportRun());
  document.getElementById("cardBtn")?.addEventListener("click", () => openTakeaway());
  document.getElementById("cardClose")?.addEventListener("click", () => closeTakeaway());
  document.getElementById("cardDownload")?.addEventListener("click", () => downloadTakeaway());
  document.getElementById("cardOverlay")?.addEventListener("click", (e) => { if (e.target && e.target.id === "cardOverlay") closeTakeaway(); });
  document.getElementById("storyToggle")?.addEventListener("click", () => setStory(!storyOn));
  document.getElementById("storyNext")?.addEventListener("click", () => storyNav(1));
  document.getElementById("storyPrev")?.addEventListener("click", () => storyNav(-1));
  document.getElementById("storyClose")?.addEventListener("click", () => setStory(false));
  runPowerUp();
}

/* ---------- C9: reading-level switch ---------- */
function setReadLevel(plain) {
  readLevel = plain ? "plain" : "tech";
  document.body.classList.toggle("plain", plain);
  const btn = document.getElementById("levelToggle");
  if (btn) btn.setAttribute("aria-pressed", String(plain));
  try { localStorage.setItem("fusionReadLevel", readLevel); } catch (e) {}
  updateLesson();
  updateCoach();
}

/* ---------- C6: predict-then-test ---------- */
const PREDICT_Q = [
  { q: "You raise the magnetic field. What happens to the confinement time?", choices: ["It goes up", "It goes down", "No change"], answer: 0, why: "A stronger field holds the plasma's energy longer, so confinement time rises." },
  { q: "You heat the plasma from 10 toward 20 keV. The D-T reaction rate...", choices: ["climbs steeply", "barely changes", "falls"], answer: 0, why: "Reactivity rises sharply through this range, which is why reactors aim for it." },
  { q: "You push fuel high with a weak magnetic field. The likely result is...", choices: ["a disruption", "more net power", "nothing"], answer: 0, why: "Too much pressure for the field (high beta) drives the plasma unstable." },
  { q: "At ignition, the external heating you need is about...", choices: ["near zero", "at its maximum", "negative"], answer: 0, why: "Alpha self-heating sustains the burn, so external heating falls toward zero." },
  { q: "Turning on the divertor sweep mainly...", choices: ["lowers peak wall heat", "raises fusion power", "cools the grid"], answer: 0, why: "It spreads the exhaust load over a larger area, easing the peak heat flux." },
  { q: "To send real power to the grid you need roughly...", choices: ["Q well above 1", "any Q above 0", "Q below 1"], answer: 0, why: "The plant must cover its own recirculating power, so net electricity needs a high Q." }
];
let predictIdx = -1, predictAnswered = false, predictOrder = [];
let predictScore = 0, predictDone = 0;   // U2: running quiz score
function updatePredictScore() {
  const el = document.getElementById("predictScoreLine");
  if (el) el.textContent = predictDone ? `You have predicted ${predictScore} of ${predictDone} right.` : "";
}
function renderPredict() {
  const qEl = document.getElementById("predictQ"), choicesEl = document.getElementById("predictChoices"), fbEl = document.getElementById("predictFeedback");
  if (!qEl || !choicesEl) return;
  const item = PREDICT_Q[predictIdx];
  qEl.textContent = item.q;
  if (fbEl) { fbEl.hidden = true; fbEl.textContent = ""; }
  predictAnswered = false;
  const nextBtn = document.getElementById("predictNext");
  if (nextBtn) nextBtn.disabled = true;   // U2: predict before you can advance
  choicesEl.innerHTML = "";
  // Shuffle so the correct answer is not always in the same slot.
  predictOrder = item.choices.map((text, i) => ({ text, correct: i === item.answer }));
  for (let k = predictOrder.length - 1; k > 0; k -= 1) {
    const j = Math.floor(Math.random() * (k + 1));
    [predictOrder[k], predictOrder[j]] = [predictOrder[j], predictOrder[k]];
  }
  predictOrder.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "predict-choice"; btn.textContent = c.text;
    btn.addEventListener("click", () => answerPredict(i));
    choicesEl.appendChild(btn);
  });
}
function answerPredict(i) {
  if (predictAnswered) return;
  predictAnswered = true;
  const item = PREDICT_Q[predictIdx];
  const fbEl = document.getElementById("predictFeedback");
  document.querySelectorAll("#predictChoices .predict-choice").forEach((b, idx) => {
    if (predictOrder[idx] && predictOrder[idx].correct) b.classList.add("correct");
    else if (idx === i) b.classList.add("wrong");
    b.disabled = true;
  });
  const right = !!(predictOrder[i] && predictOrder[i].correct);
  if (fbEl) {
    fbEl.hidden = false;
    fbEl.className = `predict-feedback ${right ? "right" : "miss"}`;
    fbEl.textContent = `${right ? "Correct. " : "Not quite. "}${item.why} Now try it on the reactor to see.`;
  }
  // U2: track the running score and unlock the Next button
  predictDone += 1;
  if (right) predictScore += 1;
  updatePredictScore();
  const nextBtn = document.getElementById("predictNext");
  if (nextBtn) nextBtn.disabled = false;
}
function nextPredict() { predictIdx = (predictIdx + 1) % PREDICT_Q.length; renderPredict(); }

/* ---------- D3: takeaway card - a printable summary of the visitor's run, with a QR.
   The QR is baked at build time (error-correction level M) and verified to decode back to
   TAKEAWAY_URL. To point it elsewhere, regenerate TAKEAWAY_QR for the new URL with any QR tool. ---------- */
const TAKEAWAY_URL = "https://github.com/PJdroopyPants/Fusion-SImulator";
const TAKEAWAY_QR = ["111111101000000010111001001111111","100000101100001011001011101000001","101110100111011010100010101011101","101110101000100100110010101011101","101110100010110011100000101011101","100000100001001110100110101000001","111111101010101010101010101111111","000000001011001111010001100000000","101101110100001111100110101001011","011100011111011011001101001101100","100110101100110000101001010111011","110001000001100011010000011101001","001000110011001110001011000111011","101010010110101001001110100100010","001000111110001001011100101100100","001110010000010100100100011011100","010101100011011010100110011010100","111001000111001000011011111011011","000100101011001110101110111110100","010011000110010001110001111010010","001100101001100110000100000001110","111010001101011111001101010001101","000010100011111100111101111100011","011100010111001100101000001001000","100011111000101011010011111111000","000000001111110110011100100011010","111111101100111011111101101010000","100000101110001101101111100011100","101110100001111011111111111110111","101110101110000011010101000100001","101110101000000111000010001101000","100000100110000001111011001110001","111111101110011001110101001010100"];
let bestQ = 0, bestNet = -Infinity, hotT = 0;
function updatePeaks() {
  if (!model) return;
  if (typeof model.q === "number") { const qv = isFinite(model.q) ? model.q : 50; if (qv > bestQ) bestQ = qv; }
  if (typeof model.netElec === "number" && model.netElec > bestNet) bestNet = model.netElec;
  if (typeof model.temperature === "number" && model.temperature > hotT) hotT = model.temperature;
}
function takeawayStats() {
  const missions = Number(document.getElementById("missionCount")?.textContent || 0);
  const total = Number(document.getElementById("missionTotal")?.textContent || 7);
  const qStr = bestQ >= 50 ? "≈ ∞" : bestQ.toFixed(1);
  const milC = Math.round(hotT * 11.6);
  const netStr = bestNet > 0 ? `${Math.round(bestNet)} MW` : "not net-positive";
  let verdict;
  if (bestQ >= 50) verdict = "You reached ignition. The plasma sustained its own burn.";
  else if (bestQ >= 5) verdict = "You ran a strong burning plasma.";
  else if (bestQ >= 1) verdict = "You crossed scientific breakeven, Q of at least 1.";
  else verdict = "You drove a real magnetic-confinement plasma.";
  const quiz = predictDone ? `${predictScore} / ${predictDone}` : null;
  return { missions, total, qStr, milC, netStr, verdict, quiz };
}
function qrSvg(modules, px) {
  const N = modules.length, q = 2, size = N + q * 2;
  let rects = "";
  for (let y = 0; y < N; y += 1) for (let xx = 0; xx < N; xx += 1) if (modules[y][xx] === "1") rects += `<rect x="${xx + q}" y="${y + q}" width="1.04" height="1.04"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${px}" height="${px}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#ffffff"/><g fill="#0b0d12">${rects}</g></svg>`;
}
function openTakeaway() {
  const s = takeawayStats();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("tcVerdict", s.verdict);
  set("tcQ", s.qStr);
  set("tcNet", s.netStr);
  set("tcTemp", `${s.milC.toLocaleString()} million °C`);
  set("tcMissions", `${s.missions} of ${s.total}`);
  const quizStat = document.getElementById("tcQuizStat");
  if (quizStat) quizStat.hidden = !s.quiz;
  if (s.quiz) set("tcQuiz", s.quiz);
  set("tcUrl", TAKEAWAY_URL.replace(/^https?:\/\//, ""));
  const qr = document.getElementById("tcQR"); if (qr) qr.innerHTML = qrSvg(TAKEAWAY_QR, 128);
  const ov = document.getElementById("cardOverlay"); if (ov) ov.hidden = false;
  dialogOpen(document.querySelector(".takeaway-card"), "#cardClose", closeTakeaway);   // A1
}
function closeTakeaway() { const ov = document.getElementById("cardOverlay"); if (ov) ov.hidden = true; dialogClose(); }
function tcRoundRect(x, rx, ry, w, h, r) { x.beginPath(); x.moveTo(rx + r, ry); x.arcTo(rx + w, ry, rx + w, ry + h, r); x.arcTo(rx + w, ry + h, rx, ry + h, r); x.arcTo(rx, ry + h, rx, ry, r); x.arcTo(rx, ry, rx + w, ry, r); x.closePath(); }
function tcWrap(x, text, tx, ty, maxW, lh) {
  const words = String(text).split(" "); let line = "", yy = ty;
  for (let i = 0; i < words.length; i += 1) {
    const test = line ? line + " " + words[i] : words[i];
    if (x.measureText(test).width > maxW && line) { x.fillText(line, tx, yy); line = words[i]; yy += lh; } else line = test;
  }
  if (line) x.fillText(line, tx, yy);
  return yy;
}
function tcDrawQr(x, modules, ox, oy, px) {
  const N = modules.length, q = 2, total = N + q * 2, m = px / total;
  x.fillStyle = "#ffffff"; x.fillRect(ox, oy, px, px);
  x.fillStyle = "#0b0d12";
  for (let yy = 0; yy < N; yy += 1) for (let xx = 0; xx < N; xx += 1) if (modules[yy][xx] === "1") x.fillRect(ox + (xx + q) * m, oy + (yy + q) * m, m + 0.4, m + 0.4);
}
function downloadTakeaway() {
  const s = takeawayStats();
  const W = 680, H = 936, sc = 2;
  const cv = document.createElement("canvas"); cv.width = W * sc; cv.height = H * sc;
  const x = cv.getContext("2d"); x.scale(sc, sc);
  x.fillStyle = "#0b0e14"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#10141d"; tcRoundRect(x, 24, 24, W - 48, H - 48, 22); x.fill();
  x.strokeStyle = "rgba(120,132,156,0.28)"; x.lineWidth = 1.5; x.stroke();
  x.textAlign = "left"; x.textBaseline = "alphabetic";
  x.fillStyle = "#38e1c6"; x.font = "700 15px Inter, system-ui, sans-serif"; x.fillText(BRAND.program.toUpperCase(), 54, 80);
  x.fillStyle = "#eef2f8"; x.font = "800 33px Inter, system-ui, sans-serif"; x.fillText("You ran a fusion reactor", 54, 122);
  x.fillStyle = "#cdd6e6"; x.font = "500 18px Inter, system-ui, sans-serif"; tcWrap(x, s.verdict, 54, 158, W - 108, 25);
  const stats = [["BEST ENERGY GAIN Q", s.qStr], ["PEAK NET POWER", s.netStr], ["HOTTEST PLASMA", s.milC.toLocaleString() + " million °C"], ["MISSIONS COMPLETED", s.missions + " of " + s.total]];
  if (s.quiz) stats.push(["PREDICTIONS RIGHT", s.quiz]);
  let yy = 224;
  stats.forEach((row) => {
    x.fillStyle = "#0c0f17"; tcRoundRect(x, 54, yy, W - 108, 62, 12); x.fill();
    x.strokeStyle = "rgba(120,132,156,0.18)"; x.lineWidth = 1; x.stroke();
    x.fillStyle = "#9aa4b8"; x.font = "700 12px Inter, system-ui, sans-serif"; x.fillText(row[0], 74, yy + 25);
    x.fillStyle = "#eef2f8"; x.font = "800 23px Inter, system-ui, sans-serif"; x.fillText(row[1], 74, yy + 50);
    yy += 74;
  });
  const qpx = 152, qx = 54, qy = yy + 10;
  tcDrawQr(x, TAKEAWAY_QR, qx, qy, qpx);
  const tx = qx + qpx + 24;
  x.fillStyle = "#eef2f8"; x.font = "700 19px Inter, system-ui, sans-serif"; x.fillText("Scan to run it yourself", tx, qy + 34);
  x.fillStyle = "#9aa4b8"; x.font = "500 14px Inter, system-ui, sans-serif"; tcWrap(x, TAKEAWAY_URL.replace(/^https?:\/\//, ""), tx, qy + 60, W - tx - 54, 18);
  x.fillStyle = "#7f8aa0"; x.font = "500 13px Inter, system-ui, sans-serif"; tcWrap(x, "Donated for educational use, free to run and share.", tx, qy + 104, W - tx - 54, 18);
  cv.toBlob((b) => { if (!b) return; const a = document.createElement("a"); const u = URL.createObjectURL(b); a.href = u; a.download = "fusion-takeaway.png"; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); });
}

/* ---------- B6: inject plus/minus steppers beside each setpoint slider ---------- */
function addSteppers() {
  document.querySelectorAll(".control input[type=range]").forEach((range) => {
    const step = Number(range.step) || 1;
    const nudge = step * 5;
    const wrap = document.createElement("div");
    wrap.className = "stepper";
    const mk = (label, delta) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "step-btn"; b.textContent = label;
      b.setAttribute("aria-label", (delta < 0 ? "Decrease " : "Increase ") + (range.id || "value"));
      b.addEventListener("click", () => {
        range.value = clamp(Number(range.value) + delta, Number(range.min), Number(range.max));
        range.dispatchEvent(new Event("input", { bubbles: true }));
      });
      return b;
    };
    range.parentNode.insertBefore(wrap, range);
    wrap.appendChild(mk("−", -nudge));
    wrap.appendChild(range);
    wrap.appendChild(mk("+", nudge));
  });
}

function initBatchControls() {
  try { if (localStorage.getItem("fusionReadLevel") === "plain") setReadLevel(true); } catch (e) {}
  document.getElementById("levelToggle")?.addEventListener("click", () => setReadLevel(readLevel !== "plain"));
  predictIdx = Math.floor(Math.random() * PREDICT_Q.length);
  renderPredict();
  document.getElementById("predictNext")?.addEventListener("click", () => nextPredict());
  const volEl = document.getElementById("soundVol");
  if (volEl) {
    try { const sv = localStorage.getItem("fusionSoundVol"); if (sv !== null) { soundVol = clamp(parseFloat(sv) || 0.6, 0, 1); volEl.value = Math.round(soundVol * 100); } } catch (e) {}
    volEl.addEventListener("input", () => setSoundVol(Number(volEl.value) / 100));
  }
  addSteppers();
}

if (liteMode) document.body.classList.add("lite");   // C3
seedParticles();
updateReadouts();
// U1: a one-time welcome over the reactor on a first visit, offering the tour or "just let me play".
// Uses the same fusionTourDone flag the tour sets, so it never reappears once handled.
function initWelcome() {
  const prompt = document.getElementById("welcomePrompt");
  if (!prompt) return;
  let seen = false;
  try { seen = !!localStorage.getItem("fusionTourDone"); } catch (e) {}
  if (!seen) prompt.hidden = false;
  const stash = () => { try { localStorage.setItem("fusionTourDone", "1"); } catch (e) {} };
  document.getElementById("welcomeTour")?.addEventListener("click", () => { prompt.hidden = true; stash(); startTour(); });
  document.getElementById("welcomeSkip")?.addEventListener("click", () => { prompt.hidden = true; stash(); });
}
initNavHud();
applyBrand();   // P1: write the host program's name into the topbar, About, and takeaway card
initWelcome();  // U1: first-run welcome prompt
buildMissions();
// U3: the status-strip "challenges" chip jumps to the missions panel and flashes it.
document.getElementById("missionChip")?.addEventListener("click", () => {
  const p = document.querySelector(".missions");
  if (!p) return;
  p.scrollIntoView({ behavior: "smooth", block: "center" });
  p.classList.add("flash"); setTimeout(() => p.classList.remove("flash"), 1100);
});
attachTips();
initPhase1Controls();
initPhase2Controls();
initBatchControls();

// ---- A4: show a scroll cue when a side panel hides controls below the fold ----
function initScrollCues() {
  document.querySelectorAll(".controls-panel, .telemetry-panel").forEach((panel) => {
    const cue = document.createElement("button");
    cue.type = "button"; cue.className = "scroll-cue"; cue.setAttribute("aria-label", "Scroll for more controls");
    cue.textContent = "\u25be";
    panel.appendChild(cue);
    const update = () => { cue.classList.toggle("show", panel.scrollHeight - panel.clientHeight - panel.scrollTop > 14); };
    cue.addEventListener("click", () => panel.scrollBy({ top: panel.clientHeight * 0.7, behavior: "smooth" }));
    panel.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    setTimeout(update, 250);
  });
}
initScrollCues();

// ---- D1: About / credits modal open-close ----
/* A1: shared modal focus management - focus in, trap Tab inside, restore focus on close, Escape to
   close. Wired into the About, Takeaway-card, Tour, and Story dialogs. */
const _dlg = { panel: null, restore: null, close: null };
function dialogOpen(panel, firstSel, closeFn) {
  if (!panel) return;
  _dlg.panel = panel; _dlg.close = closeFn || null; _dlg.restore = document.activeElement;
  const first = (firstSel && panel.querySelector(firstSel)) ||
    panel.querySelector('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
  const tryFocus = () => { if (_dlg.panel === panel && first) { try { first.focus(); } catch (e) {} } };
  setTimeout(tryFocus, 40); setTimeout(tryFocus, 280);   // second pass covers the tour card's delayed reveal
}
function dialogClose() {
  if (!_dlg.panel) return;
  const r = _dlg.restore;
  _dlg.panel = null; _dlg.close = null; _dlg.restore = null;
  if (r && r.focus) { try { r.focus(); } catch (e) {} }
}
document.addEventListener("keydown", (e) => {
  if (!_dlg.panel) return;
  if (e.key === "Escape") { if (_dlg.close) _dlg.close(); return; }
  if (e.key !== "Tab") return;
  const f = Array.from(_dlg.panel.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

(function initAbout() {
  const panel = document.getElementById("aboutPanel");
  const overlay = document.getElementById("aboutOverlay");
  const setOpen = (on) => {
    if (panel) panel.hidden = !on; if (overlay) overlay.hidden = !on;
    if (on) dialogOpen(panel, "#aboutClose", () => setOpen(false)); else dialogClose();
  };
  document.getElementById("aboutBtn")?.addEventListener("click", () => setOpen(true));
  document.getElementById("aboutClose")?.addEventListener("click", () => setOpen(false));
  overlay?.addEventListener("click", () => setOpen(false));
})();

// ---- C1: track which canvases are on screen so off-screen charts are not redrawn. ----
[reactorCanvas, historyCanvas, lawsonCanvas, reactivityCanvas, sankeyCanvas, fuelCycleCanvas]
  .forEach((c) => { if (c) vis.add(c); });
if ("IntersectionObserver" in window) {
  const vizObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { vis.add(e.target); chartsDirty = true; }
      else vis.delete(e.target);
    }
  }, { rootMargin: "150px 0px" });
  [reactorCanvas, historyCanvas, lawsonCanvas, reactivityCanvas, sankeyCanvas, fuelCycleCanvas]
    .forEach((c) => { if (c) vizObserver.observe(c); });
}

// ---- C2: pause the render loop and the model tick when the tab/screen is hidden,
// then resume cleanly, so an all-day kiosk saves power and stays time-coherent. ----
const TICK_MS = 360;
let rafId = null, modelTimer = null;
function modelTick() {
  advanceDynamics(0.36);
  model = calculateModel();
  chartsDirty = true;
  tickHistory();
  updateReadouts();
  updateMissions();
  tickKiosk();
  // C4: idle watchdog (normal mode) - return to a clean attract state after long inactivity,
  // so a visitor never finds a reactor the last person left mid-disruption.
  if (!kioskOn && performance.now() - lastUserAction > WATCHDOG_MS) {
    lastUserAction = performance.now();
    applyPreset("cruise");
    resetCamera();
  }
  updateMaterials(0.36);
  updateSound();
  updateStory();
}
function startLoops() {
  if (!modelTimer) modelTimer = setInterval(modelTick, TICK_MS);
  if (rafId === null) { lastFrame = performance.now(); rafId = requestAnimationFrame(animate); }
}
function stopLoops() {
  if (modelTimer) { clearInterval(modelTimer); modelTimer = null; }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}
document.addEventListener("visibilitychange", () => { if (document.hidden) stopLoops(); else startLoops(); });
// F1: open on a clean net-positive operating point so the first thing a passer-by sees is a
// working reactor (green output climbing to +300 MW), not a red sub-breakeven number. The
// Startup preset (which teaches that Q > 1 is not net power) stays one click away.
applyPreset("cruise");
startLoops();

// ---- C3: FPS safety net - drop to the lite path if early frames are slow ----
(function fpsProbe() {
  if (liteMode) return;
  let frames = 0, t0 = 0;
  const tick = (t) => {
    if (t0 === 0) { t0 = t; requestAnimationFrame(tick); return; }
    const dt = t - t0;
    if (dt < 600) { requestAnimationFrame(tick); return; }
    frames++;
    if (dt < 2100) { requestAnimationFrame(tick); return; }
    if (frames * 1000 / (dt - 600) < 32) { liteMode = true; document.body.classList.add("lite"); seedParticles(); }
  };
  requestAnimationFrame(tick);
})();
