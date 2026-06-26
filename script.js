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
const presets = document.querySelectorAll("[data-preset]");
const hotspots = document.querySelectorAll("[data-topic]");

/* ---------- Presets ---------- */
const presetValues = {
  startup: { temperature: 11, magneticField: 5.2, fuelRate: 58, fuelBalance: 50, coolingFlow: 66, turbineLoad: 54, neutralBeam: true, pelletPulse: true, divertorSweep: false, emergencyQuench: false },
  cruise: { temperature: 16.5, magneticField: 6.8, fuelRate: 74, fuelBalance: 50, coolingFlow: 82, turbineLoad: 76, neutralBeam: true, pelletPulse: true, divertorSweep: true, emergencyQuench: false },
  gain: { temperature: 19.4, magneticField: 7.6, fuelRate: 84, fuelBalance: 51, coolingFlow: 90, turbineLoad: 86, neutralBeam: true, pelletPulse: true, divertorSweep: true, emergencyQuench: false },
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
    note: "Best operation usually sits near 14 to 20 keV with matching confinement."
  },
  magnets: {
    topic: "Magnets",
    title: "Magnetic fields replace solid walls.",
    body: "Charged particles spiral along magnetic field lines, so superconducting coils shape a torus that keeps the hottest material away from the vessel and holds energy in.",
    deeper: "Confinement time tau_E, how long the plasma keeps its energy, rises strongly with field strength and device size. A stronger field also raises the pressure the plasma can hold before going unstable. Weaken the field while fuelling hard and confinement collapses, dropping you below breakeven.",
    formula: "tau_E increases with B, raising nT·tau_E",
    note: "If the field is weak, energy leaks out and the reaction rate collapses."
  },
  blanket: {
    topic: "Blanket",
    title: "The blanket catches neutrons and breeds fuel.",
    body: "About 80% of fusion energy leaves as fast 14 MeV neutrons. They deposit heat in a lithium blanket that drives the power cycle, and lithium reactions create fresh tritium.",
    deeper: "Tritium does not occur naturally in useful amounts, so a power plant must breed its own. The tritium breeding ratio (TBR) is tritium produced per tritium burned; above 1.0 the plant is self-sufficient. Neutron multipliers and blanket geometry push the TBR over unity.",
    formula: "TBR > 1.0 means fuel self-sufficiency",
    note: "A breeding ratio above 1.0 means the plant is replacing its tritium fuel."
  },
  divertor: {
    topic: "Divertor",
    title: "The exhaust system for a star.",
    body: "Fusion produces helium ash and concentrates exhaust heat at the plasma edge. The divertor channels that heat and particle flux to specially cooled targets, protecting the rest of the wall.",
    deeper: "Unmanaged, edge heat flux can exceed materials limits (tens of MW/m²). Sweeping the strike point spreads the load over a larger area. Good exhaust handling also removes helium ash that would otherwise dilute the fuel and quench the burn.",
    formula: "Wall heat flux drops when the load is swept",
    note: "Enable the divertor sweep to relieve peak wall heat flux."
  },
  turbine: {
    topic: "Turbine",
    title: "Fusion heat still becomes electricity the classic way.",
    body: "Coolant carries blanket heat into heat exchangers, raising steam (or another working fluid) that spins a turbine-generator. The conversion is ordinary thermodynamics.",
    deeper: "Gross electric output is thermal power times the turbine efficiency (about 33 to 45%). The plant must then subtract its own recirculating power: magnets, pumps, and especially the wall-plug cost of plasma heating. Net electricity therefore needs a high gain Q, not merely Q above 1.",
    formula: "P_net = P_thermal x eff_turbine - P_recirculating",
    note: "High turbine load only helps when the blanket is hot and cooling is balanced."
  }
};

let selectedTopic = "plasma";
let netHistory = Array.from({ length: 120 }, () => 0);
let fusionHistory = Array.from({ length: 120 }, () => 0);
let trail = [];
let particles = [];
let sparks = [];
let neutrons = [];
let lastFrame = performance.now();
let model = {};

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

function readState() {
  return {
    temperature: Number(controls.temperature.value),
    magneticField: Number(controls.magneticField.value),
    fuelRate: Number(controls.fuelRate.value),
    fuelBalance: Number(controls.fuelBalance.value),
    coolingFlow: Number(controls.coolingFlow.value),
    turbineLoad: Number(controls.turbineLoad.value),
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
  const disruptionRisk = clamp((beta - 0.42) * 1.45, 0, 0.92);

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

  // External heating implied by Q (consistent with the gain definition)
  let pExt = q > 0.05 ? fusionPower / q : 0;
  pExt = clamp(pExt, s.neutralBeam ? 20 : 5, 400);

  // Thermal -> turbine -> electricity
  const capture = clamp(0.8 + s.coolingFlow / 500, 0.8, 0.97);
  const thermalPower = (pNeutron * 1.1 + pAlpha + pExt) * capture;
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
    netElec, wallLoad, coolantTemp, tritiumRatio, stability, nTauActual,
    label, stateColor
  };
}

/* ---------- Readouts ---------- */
function updateReadouts() {
  model = calculateModel();

  outputs.temperatureValue.textContent = `${model.temperature.toFixed(1)} keV`;
  outputs.magneticFieldValue.textContent = `${model.magneticField.toFixed(1)} T`;
  outputs.fuelRateValue.textContent = `${Math.round(model.fuelRate)}%`;
  outputs.fuelBalanceValue.textContent = `${model.fuelBalance} / ${100 - model.fuelBalance}`;
  outputs.coolingFlowValue.textContent = `${Math.round(model.coolingFlow)}%`;
  outputs.turbineLoadValue.textContent = `${Math.round(model.turbineLoad)}%`;

  outputs.reactorState.textContent = model.label;
  outputs.reactorState.style.background = model.stateColor;
  outputs.reactorState.style.boxShadow = `0 0 18px ${model.stateColor}66`;
  outputs.netPowerBadge.textContent = formatMw(model.netElec);
  outputs.netPowerBadge.style.color = model.netElec > 0 ? "var(--green)" : "var(--coral)";
  outputs.qBadge.textContent = model.q >= 50 ? "≈ ∞" : model.q.toFixed(1);

  outputs.fusionPower.textContent = formatMw(model.fusionPower);
  outputs.qPlasma.textContent = model.q >= 50 ? "≈ ∞" : model.q.toFixed(1);
  outputs.electricOutput.textContent = formatMw(model.netElec);
  outputs.tripleProduct.textContent = model.triple.toFixed(2);
  outputs.confinementTime.textContent = `${model.tauE.toFixed(2)} s`;
  outputs.stability.textContent = `${Math.round(model.stability)}%`;
  outputs.wallLoad.textContent = `${model.wallLoad.toFixed(1)} MW/m²`;
  outputs.coolantTemp.textContent = `${Math.round(model.coolantTemp)} °C`;
  outputs.tritiumRatio.textContent = model.tritiumRatio.toFixed(2);

  outputs.fusionPowerMeter.value = model.fusionPower;
  outputs.qMeter.value = Math.min(25, model.q);
  outputs.electricMeter.value = model.netElec;
  outputs.tripleMeter.value = Math.min(3.5, model.triple);
  outputs.confinementMeter.value = model.tauE;
  outputs.stabilityMeter.value = model.stability;

  setBar(outputs.wallLoadBar, model.wallLoad / 16, model.wallLoad > 12);
  setBar(outputs.coolantBar, (model.coolantTemp - 280) / 380, model.coolantTemp > 620);
  setBar(outputs.tritiumBar, model.tritiumRatio / 1.25, model.tritiumRatio < 1);

  // Stage readout
  outputs.stageTemp.textContent = model.temperature.toFixed(1);
  outputs.stageField.textContent = model.magneticField.toFixed(1);
  outputs.stageDensity.textContent = model.n20.toFixed(2);

  updatePowerBalance();
  updateLesson();
  updateCoach();
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
  outputs.qBig.textContent = `Q = ${model.q >= 50 ? "≈ ∞" : model.q.toFixed(1)}`;
}

/* ---------- Lessons + coach ---------- */
function updateLesson() {
  const lesson = lessons[selectedTopic];
  outputs.lessonTopic.textContent = lesson.topic;
  outputs.lessonTitle.textContent = lesson.title;
  outputs.lessonBody.textContent = lesson.body;
  outputs.lessonDeeper.textContent = lesson.deeper;
  outputs.lessonFormula.textContent = lesson.formula;
  outputs.lessonNote.textContent = lesson.note;
}

function updateCoach() {
  outputs.coachText.textContent = getCoachMessage();
}

function getCoachMessage() {
  if (model.emergencyQuench)
    return "Emergency quench engaged. Plasma energy is being dumped to protect the vessel and magnets, so fusion power is intentionally near zero.";
  if (model.disruptionRisk > 0.6)
    return "Plasma pressure is outrunning the magnetic field (high beta). You are near a disruption. Raise the magnetic field or ease back fuel injection.";
  if (model.temperature < 9 && model.fuelRate > 25)
    return "Fuel is present but the ions are too cool to fuse efficiently. Raise plasma temperature to climb the reactivity curve.";
  if (model.magneticField < 4.4 && model.fuelRate > 60)
    return "Confinement is weak for this much fuel, so energy leaks out faster than it is produced. Strengthen the field before fuelling harder.";
  if (model.coolantTemp > 620)
    return "Coolant outlet is running hot. Increase blanket coolant flow or trim fusion power to protect the heat exchangers.";
  if (model.phi >= 0.95)
    return "Ignition. Alpha self-heating now sustains the burn on its own, external heating is essentially zero, and Q has run away. This is the goal.";
  if (model.tritiumRatio < 1 && model.fusionPower > 200)
    return "Strong burn, but the breeding ratio is below 1.0, so the plant is consuming tritium faster than it makes it. Nudge cooling and keep the D-T blend balanced.";
  if (model.netElec > 0)
    return `Net positive: ${formatMw(model.netElec)} after recirculating power. The triple product is ${model.triple.toFixed(2)}×10²¹, about ${Math.round(model.phi * 100)}% of the way to ignition.`;
  if (model.q >= 1)
    return "Burning plasma. Fusion power now exceeds the heating you supply (Q above 1). Push confinement and density to turn that into net electricity.";
  return "Below breakeven. Build temperature and confinement together to lift the operating point toward the ignition curve at right.";
}

/* ---------- Canvas sizing ---------- */
function resizeCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
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
const CAM_DEFAULT = { yaw: -0.62, pitch: 0.60, dist: 3.15 };
function resetCamera() { cam.yaw = CAM_DEFAULT.yaw; cam.pitch = CAM_DEFAULT.pitch; cam.dist = CAM_DEFAULT.dist; velYaw = 0; velPitch = 0; lastInteract = performance.now(); }

/* Balance-of-plant anchors (off to +X so the plant sits beside the reactor). */
const BOP = {
  sg: { x: 2.05, y: -0.12, z: 0.55 },   // steam generator
  turb: { x: 2.72, y: -0.06, z: 0.18 }, // turbine
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
  particles = Array.from({ length: 168 }, () => ({
    th: Math.random() * Math.PI * 2,
    ph: Math.random() * Math.PI * 2,
    lane: 0.18 + Math.random() * 0.78,
    sp: 0.5 + Math.random() * 1.7,
    size: 0.010 + Math.random() * 0.018,
    hot: Math.random() < 0.5
  }));
  sparks = [];
  neutrons = Array.from({ length: 64 }, () => ({
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
  reactorCanvas.style.touchAction = "none";

  const down = (cx, cy) => { dragOn = true; dragX = cx; dragY = cy; lastInteract = performance.now(); reactorCanvas.style.cursor = "grabbing"; };
  const move = (cx, cy) => {
    if (!dragOn) return;
    const dyaw = (cx - dragX) * 0.0095;
    const dpitch = -(cy - dragY) * 0.0095;
    cam.yaw += dyaw;
    cam.pitch = clamp(cam.pitch + dpitch, 0.06, 1.46);
    velYaw = dyaw; velPitch = dpitch;
    dragX = cx; dragY = cy; lastInteract = performance.now();
  };
  const up = () => { dragOn = false; reactorCanvas.style.cursor = "grab"; };

  reactorCanvas.addEventListener("mousedown", (e) => down(e.clientX, e.clientY));
  window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  window.addEventListener("mouseup", up);
  reactorCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.dist = clamp(cam.dist + e.deltaY * 0.0022, 1.9, 6.4);
    lastInteract = performance.now();
  }, { passive: false });
  reactorCanvas.addEventListener("touchstart", (e) => { if (e.touches[0]) down(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  reactorCanvas.addEventListener("touchmove", (e) => { if (e.touches[0]) { move(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
  window.addEventListener("touchend", up);
  reactorCanvas.addEventListener("dblclick", () => resetCamera());
  window.addEventListener("keydown", (e) => { if (e.key === "r" || e.key === "R") resetCamera(); });

  // hotspots are repositioned every frame; keep their transitions off-position
  hotspots.forEach((b) => { b.style.transitionProperty = "background-color, border-color, box-shadow, color, opacity"; });
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

  if (!dragOn) {
    cam.yaw += velYaw;
    cam.pitch = clamp(cam.pitch + velPitch, 0.06, 1.46);
    velYaw *= 0.90; velPitch *= 0.90;
    if (Math.abs(velYaw) < 0.00006) velYaw = 0;
    if (Math.abs(velPitch) < 0.00006) velPitch = 0;
  }
  if (!reduceMotion && !dragOn && velYaw === 0 && time - lastInteract > 3500) cam.yaw += dt * 0.00006;

  PROJ.cx = w * 0.47;
  PROJ.cy = h * 0.45;
  PROJ.focal = size * cam.focalK;

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

  // central solenoid (rings up the axis)
  for (let i = 0; i <= 9; i += 1) {
    const yy = -SOL_H + (2 * SOL_H * i) / 9;
    const ring = [];
    for (let a = 0; a <= 28; a += 1) { const t = (a / 28) * Math.PI * 2; ring.push([SOL_R * Math.cos(t), yy, SOL_R * Math.sin(t)]); }
    const pr = projectAll(ring);
    prims.push({ z: pr.depth, d: () => { tracePts(ctx, pr.pts, true); ctx.strokeStyle = "rgba(170,182,210,0.30)"; ctx.lineWidth = 1; ctx.stroke(); } });
  }

  // vacuum vessel / blanket shell — ghostly amber cage of poloidal ribs
  for (let ci = 0; ci < 26; ci += 1) {
    const th = (ci / 26) * Math.PI * 2;
    const loop = [];
    for (let a = 0; a <= 30; a += 1) loop.push(torusPt(th, (a / 30) * Math.PI * 2, A_VESSEL));
    const pr = projectAll(loop);
    const b = depthBright(pr.depth);
    prims.push({ z: pr.depth + 0.001, d: () => { tracePts(ctx, pr.pts, true); ctx.strokeStyle = `rgba(255,196,96,${(0.05 + 0.10 * b) * (0.6 + intensity * 0.5)})`; ctx.lineWidth = 1; ctx.stroke(); } });
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

  // poloidal field coils (horizontal rings) + central solenoid is separate
  const pfRings = [[0.58, 1.24], [-0.58, 1.24], [0.92, 0.66], [-0.92, 0.66]];
  pfRings.forEach(([hh, rho]) => {
    const ring = [];
    for (let a = 0; a <= 60; a += 1) { const t = (a / 60) * Math.PI * 2; ring.push([rho * Math.cos(t), hh, rho * Math.sin(t)]); }
    const pr = projectAll(ring);
    const b = depthBright(pr.depth);
    prims.push({ z: pr.depth, d: () => { tracePts(ctx, pr.pts, true); ctx.strokeStyle = `rgba(120,170,255,${0.18 + 0.34 * b})`; ctx.lineWidth = 1.4 + b * 1.4; ctx.stroke(); } });
  });

  // toroidal field coils caging the plasma; each poloidal loop is split into
  // arcs so segments sort independently and weave correctly through the torus
  const NC = 16, CSEG = 8, CPTS = 40, CPER = CPTS / CSEG;
  for (let ci = 0; ci < NC; ci += 1) {
    const th = (ci / NC) * Math.PI * 2;
    const loop = [];
    for (let a = 0; a <= CPTS; a += 1) loop.push(torusPt(th, (a / CPTS) * Math.PI * 2, A_COIL));
    for (let s = 0; s < CSEG; s += 1) {
      const slice = loop.slice(s * CPER, s * CPER + CPER + 1);
      const pr = projectAll(slice);
      const b = depthBright(pr.depth);
      const al = (0.16 + 0.40 * b) * (0.55 + bNorm * 0.6);
      prims.push({ z: pr.depth, d: () => {
        tracePts(ctx, pr.pts, false);
        ctx.strokeStyle = `rgba(168,150,255,${clamp(al, 0, 0.9)})`;
        ctx.lineWidth = 1.4 + b * 1.8;
        if (b > 0.6) { ctx.shadowColor = "rgba(168,150,255,0.55)"; ctx.shadowBlur = 6 * b; }
        ctx.stroke(); ctx.shadowBlur = 0;
      } });
    }
  }

  // plasma body — additive radial-gradient discs along the toroidal centerline,
  // with a hot white-gold core that brightens with fusion intensity
  const ND = 56;
  const hotCore = mixColor(pColor, [255, 255, 245], 0.5);
  for (let di = 0; di < ND; di += 1) {
    const th = (di / ND) * Math.PI * 2;
    const c = project(R * Math.cos(th), 0, R * Math.sin(th));
    const rad = Math.max(2, A_PLASMA * c.s);
    prims.push({ z: c.depth - 0.0005, d: () => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad * 1.25);
      g.addColorStop(0, `rgba(${hotCore[0]},${hotCore[1]},${hotCore[2]},${0.22 + intensity * 0.34})`);
      g.addColorStop(0.4, `rgba(${pColor[0]},${pColor[1]},${pColor[2]},${0.10 + intensity * 0.16})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, rad * 1.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } });
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
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        tracePts(ctx, pr.pts, false);
        ctx.strokeStyle = `rgba(${90 + Math.round(intensity * 60)},${200},${255},${clamp(al, 0, 0.85)})`;
        ctx.lineWidth = 1.0 + b * 1.1;
        if (b > 0.6) { ctx.shadowColor = "rgba(120,210,255,0.5)"; ctx.shadowBlur = 5 * b; }
        ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();
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
    const col = p.hot ? "255,210,120" : "150,236,255";
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
    if (nu.life > 1) { nu.life = 0; nu.th = Math.random() * Math.PI * 2; nu.ph = Math.random() * Math.PI * 2; }
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

  // divertor — red exhaust ring at the bottom of the tube (split for occlusion)
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

  // balance of plant (anchored in world space)
  addBOP(prims, ctx, time, intensity);

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

  drawVignette(ctx, w, h);
  drawTitle(ctx, w, h);
  positionHotspots();
}

/* ---- balance of plant ---- */
function addBOP(prims, ctx, time, intensity) {
  const flow = clamp(model.coolingFlow / 100, 0, 1);
  const sg = project(BOP.sg.x, BOP.sg.y, BOP.sg.z);
  const turb = project(BOP.turb.x, BOP.turb.y, BOP.turb.z);
  const gen = project(BOP.gen.x, BOP.gen.y, BOP.gen.z);
  const cond = project(BOP.cond.x, BOP.cond.y, BOP.cond.z);
  const grid = project(BOP.grid.x, BOP.grid.y, BOP.grid.z);
  const blanketTap = project((R + A_VESSEL) * Math.cos(Math.PI * 0.35), -A_VESSEL * 0.4, (R + A_VESSEL) * Math.sin(Math.PI * 0.35));

  const pipe = (p0, p1, color, speed, depth, lw) => {
    prims.push({ z: depth, d: () => {
      ctx.save(); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
      const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2 + 18;
      ctx.quadraticCurveTo(mx, my, p1.x, p1.y);
      ctx.strokeStyle = "rgba(34,40,52,0.9)"; ctx.lineWidth = lw + 3; ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.setLineDash([13, 11]); ctx.lineDashOffset = -time * speed; ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    } });
  };

  pipe(blanketTap, sg, `rgba(255,150,90,${0.45 + flow * 0.45})`, 0.05 + flow * 0.15, (blanketTap.depth + sg.depth) / 2, 3);
  pipe(sg, turb, `rgba(214,240,255,${0.5 + flow * 0.4})`, 0.12 + flow * 0.2, (sg.depth + turb.depth) / 2, 2.6);
  pipe(turb, cond, `rgba(120,200,220,${0.4 + flow * 0.4})`, 0.06 + flow * 0.12, (turb.depth + cond.depth) / 2, 2.4);
  pipe(cond, sg, `rgba(56,225,198,${0.4 + flow * 0.4})`, 0.05 + flow * 0.12, (cond.depth + sg.depth) / 2, 2.2);

  // steam generator drum
  prims.push({ z: sg.depth, d: () => {
    const ww = 26 * sg.s * 0.018, hh = ww * 1.7;
    const x = sg.x - ww / 2, y = sg.y - hh / 2;
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, "rgba(40,120,130,0.95)");
    g.addColorStop(1, `rgba(${Math.round(180 + intensity * 60)},${Math.round(96 + intensity * 24)},60,0.95)`);
    ctx.fillStyle = g; roundedRect(ctx, x, y, ww, hh, ww * 0.32); ctx.fill();
    ctx.strokeStyle = "rgba(214,224,240,0.4)"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = "rgba(238,242,248,0.62)"; ctx.font = `700 ${Math.max(8, 9 * sg.s * 0.02)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.fillText("STEAM GEN", sg.x, y + hh + 12); ctx.textAlign = "left";
  } });

  // condenser
  prims.push({ z: cond.depth, d: () => {
    const ww = 30 * cond.s * 0.018, hh = ww * 0.66;
    roundedRect(ctx, cond.x - ww / 2, cond.y - hh / 2, ww, hh, hh * 0.3);
    ctx.fillStyle = "rgba(46,78,98,0.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(120,200,220,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  } });

  // generator block
  prims.push({ z: gen.depth, d: () => {
    const ww = 22 * gen.s * 0.018, hh = ww * 0.8;
    roundedRect(ctx, gen.x - ww / 2, gen.y - hh / 2, ww, hh, hh * 0.22);
    const net = model.netElec;
    const gg = ctx.createLinearGradient(gen.x - ww / 2, 0, gen.x + ww / 2, 0);
    gg.addColorStop(0, "rgba(70,80,100,0.95)");
    gg.addColorStop(1, net > 0 ? "rgba(126,231,135,0.85)" : "rgba(120,128,150,0.8)");
    ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = "rgba(214,224,240,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  } });

  // turbine wheel (spins)
  prims.push({ z: turb.depth - 0.001, d: () => {
    const rad = Math.max(10, 0.07 * turb.s);
    ctx.save(); ctx.translate(turb.x, turb.y);
    ctx.strokeStyle = "rgba(238,242,248,0.28)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, rad * 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate((reduceMotion ? 0 : time * 0.004) * (0.2 + model.turbineLoad / 100));
    ctx.fillStyle = "rgba(255,194,75,0.85)";
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(rad * 0.6, -rad * 0.16, rad * 1.25, -rad * 0.05);
      ctx.quadraticCurveTo(rad * 0.5, rad * 0.24, 0, 0); ctx.fill();
    }
    ctx.fillStyle = "#eef2f8"; ctx.beginPath(); ctx.arc(0, 0, rad * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } });

  // power line gen -> grid, plus pylon
  prims.push({ z: (gen.depth + grid.depth) / 2 - 0.01, d: () => {
    const net = model.netElec;
    ctx.save();
    ctx.strokeStyle = net > 0 ? `rgba(126,231,135,${0.5 + clamp(net / 500, 0, 0.5)})` : "rgba(120,128,150,0.5)";
    ctx.lineWidth = 1.8; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 0.05;
    ctx.beginPath(); ctx.moveTo(gen.x, gen.y); ctx.lineTo(grid.x, grid.y); ctx.stroke();
    ctx.setLineDash([]);
    const s = Math.max(8, 0.05 * grid.s);
    ctx.strokeStyle = "rgba(200,210,230,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(grid.x, grid.y - s); ctx.lineTo(grid.x - s * 0.6, grid.y + s); ctx.lineTo(grid.x + s * 0.6, grid.y + s); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(grid.x - s * 0.45, grid.y); ctx.lineTo(grid.x + s * 0.45, grid.y); ctx.stroke();
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
  ctx.fillText("MAGNETIC CONFINEMENT VESSEL", Math.max(16, w * 0.05), Math.max(24, h * 0.06));
  ctx.fillStyle = "rgba(154,164,184,0.42)";
  ctx.font = "600 9.5px Inter, system-ui, sans-serif";
  ctx.fillText("DRAG TO ORBIT · SCROLL TO ZOOM · DBL-CLICK TO RESET", Math.max(16, w * 0.05), Math.max(40, h * 0.06) + 16);
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
  magnets: () => torusPt(Math.PI * 1.15, Math.PI / 2, A_COIL * 1.05),
  blanket: () => torusPt(-0.35, 0, A_VESSEL * 1.05),
  divertor: () => torusPt(Math.PI * 0.5, -Math.PI / 2, A_PLASMA * 1.1),
  turbine: () => [BOP.turb.x, BOP.turb.y, BOP.turb.z]
};
function positionHotspots() {
  const rect = reactorCanvas.getBoundingClientRect();
  hotspots.forEach((b) => {
    const fn = HOTSPOT_ANCHORS[b.dataset.topic];
    if (!fn) return;
    const wpt = fn();
    const p = project(wpt[0], wpt[1], wpt[2]);
    b.style.left = `${(p.x / rect.width) * 100}%`;
    b.style.top = `${(p.y / rect.height) * 100}%`;
    b.style.right = "auto";
    b.style.bottom = "auto";
    b.style.transform = "translate(-50%, -50%)";
    b.style.opacity = `${clamp(0.4 + depthBright(p.depth) * 0.6, 0.4, 1)}`;
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

/* ---------- Animation + ticking ---------- */
function animate(time) {
  const delta = time - lastFrame;
  lastFrame = time;
  if (delta > 0) {
    drawReactor(time);
    drawHistory();
    drawLawson();
  }
  requestAnimationFrame(animate);
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

window.addEventListener("resize", () => {
  resizeCanvas(reactorCanvas, reactorCtx);
  resizeCanvas(historyCanvas, historyCtx);
  resizeCanvas(lawsonCanvas, lawsonCtx);
});

seedParticles();
updateReadouts();
setInterval(() => {
  model = calculateModel();
  tickHistory();
  updateReadouts();
}, 360);
requestAnimationFrame(animate);
