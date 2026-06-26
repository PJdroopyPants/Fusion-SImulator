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

function seedParticles() {
  particles = Array.from({ length: 150 }, (_, i) => ({
    angle: (Math.PI * 2 * i) / 150,
    lane: Math.random(),
    speed: 0.45 + Math.random() * 1.8,
    size: 1.1 + Math.random() * 2.2,
    phase: Math.random() * Math.PI * 2
  }));
  sparks = Array.from({ length: 46 }, () => ({
    angle: Math.random() * Math.PI * 2,
    life: Math.random(),
    speed: 0.2 + Math.random() * 0.6
  }));
}

/* ===========================================================
   Reactor render
   The torus is drawn in a tilted top-down projection. A point
   on the plasma centerline at toroidal angle th is:
     C(th) = (cx + Rx*cos th, cy + Ry*sin th),  Ry = Rx*tilt
   A toroidal-field coil at th is a circle of minor radius `a`
   lying in the plane of the vertical axis and the local radial
   direction; projected, it traces an ellipse. Coils whose
   center sits in the lower half (sin th > 0) are nearer the
   viewer and are drawn in front of the plasma.
   =========================================================== */
function reactorGeometry(w, h) {
  const cx = w * 0.46;
  const cy = h * 0.42;
  const size = Math.min(w, h);
  const Rx = Math.min(w * 0.255, size * 0.32); // plasma centerline major radius
  const tilt = 0.56;
  const Ry = Rx * tilt;
  const a = Rx * 0.34;        // tube minor radius
  const zScale = a * 0.95;    // vertical projection of poloidal direction
  const tx = w * 0.87;        // turbine, lower-right
  const ty = h * 0.80;
  const turbineR = size * 0.05;
  const hxW = clamp(size * 0.075, 42, 66);   // steam-generator drum
  const hxH = hxW * 1.7;
  const hxX = w * 0.70;
  const hxY = h * 0.78;
  return { cx, cy, Rx, Ry, a, tilt, zScale, size, w, h, tx, ty, turbineR, hxX, hxY, hxW, hxH };
}

function drawReactor(time) {
  const rect = resizeCanvas(reactorCanvas, reactorCtx);
  const ctx = reactorCtx;
  const w = rect.width;
  const h = rect.height;
  const g = reactorGeometry(w, h);
  const intensity = clamp(model.fusionPower / 1250, 0.05, 1);

  ctx.clearRect(0, 0, w, h);
  drawGrid(ctx, w, h, time);
  drawCoolantPipe(ctx, g, time);
  drawHeatExchanger(ctx, g, time, intensity);
  drawTurbine(ctx, g, time);
  drawCoils(ctx, g, time, false);   // back coils (behind plasma)
  drawBlanket(ctx, g, intensity);
  drawFluxSurfaces(ctx, g, time);
  drawSolenoid(ctx, g, time, intensity);
  drawPlasma(ctx, g, intensity, time);
  drawParticles(ctx, g, intensity, time);
  drawNeutrons(ctx, g, intensity, time);
  drawDivertor(ctx, g, intensity, time);
  drawCoils(ctx, g, time, true);    // front coils (over plasma)
  drawLabels(ctx, w, h);
}

function drawGrid(ctx, w, h, time) {
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = "#5e6878";
  ctx.lineWidth = 1;
  const offset = (time * 0.006) % 44;
  for (let x = -44 + offset; x < w + 44; x += 44) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = -44; y < h + 44; y += 44) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawCoils(ctx, g, time, front) {
  const N = 18;
  const strength = clamp(model.magneticField / 8.8, 0.25, 1);
  ctx.save();
  for (let i = 0; i < N; i += 1) {
    const th = (i / N) * Math.PI * 2;
    const isFront = Math.sin(th) > 0.0001;
    if (isFront !== front) continue;
    const Cx = g.cx + g.Rx * Math.cos(th);
    const Cy = g.cy + g.Ry * Math.sin(th);
    const ax = g.a * Math.cos(th);          // radial screen-x component
    const ayIn = g.a * Math.sin(th) * g.tilt; // radial screen-y component
    ctx.beginPath();
    for (let p = 0; p <= 32; p += 1) {
      const phi = (p / 32) * Math.PI * 2;
      const x = Cx + ax * Math.cos(phi);
      const y = Cy + ayIn * Math.cos(phi) - g.zScale * Math.sin(phi);
      if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const alpha = (front ? 0.5 : 0.22) * (0.6 + strength * 0.5);
    ctx.strokeStyle = `rgba(168, 150, 255, ${clamp(alpha, 0, 0.85)})`;
    ctx.lineWidth = front ? 2.4 : 1.6;
    if (front) { ctx.shadowColor = "rgba(168,150,255,0.6)"; ctx.shadowBlur = 6; }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawBlanket(ctx, g, intensity) {
  const oRx = g.Rx + g.a;
  const oRy = g.Ry + g.a * g.tilt;
  ctx.save();
  // structural vessel ring
  ctx.lineWidth = g.a * 0.85;
  ctx.strokeStyle = "rgba(40, 46, 58, 0.9)";
  ctx.beginPath();
  ctx.ellipse(g.cx, g.cy, oRx * 1.16, oRy * 1.16, 0, 0, Math.PI * 2);
  ctx.stroke();
  // breeding blanket (amber)
  ctx.lineWidth = g.a * 0.5;
  ctx.strokeStyle = `rgba(255, 194, 75, ${0.16 + intensity * 0.14})`;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.cy, oRx * 1.08, oRy * 1.08, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFluxSurfaces(ctx, g, time) {
  // nested magnetic flux surfaces inside the torus hole
  const holeRx = g.Rx - g.a;
  const holeRy = g.Ry - g.a * g.tilt;
  ctx.save();
  ctx.strokeStyle = "rgba(92, 200, 255, 0.16)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i += 1) {
    const f = i / 5;
    ctx.beginPath();
    ctx.ellipse(g.cx, g.cy, holeRx * f, holeRy * f, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSolenoid(ctx, g, time, intensity) {
  // central solenoid stack running through the torus hole
  const wd = g.a * 0.42;
  const ht = g.Ry * 1.5;
  ctx.save();
  ctx.translate(g.cx, g.cy);
  const grad = ctx.createLinearGradient(-wd, 0, wd, 0);
  grad.addColorStop(0, "rgba(120,128,150,0.25)");
  grad.addColorStop(0.5, "rgba(196,204,224,0.5)");
  grad.addColorStop(1, "rgba(120,128,150,0.25)");
  ctx.fillStyle = grad;
  roundedRect(ctx, -wd, -ht, wd * 2, ht * 2, wd * 0.6);
  ctx.fill();
  // winding segments
  ctx.strokeStyle = "rgba(20,24,32,0.55)";
  ctx.lineWidth = 1;
  const segs = 9;
  for (let i = 1; i < segs; i += 1) {
    const y = -ht + (2 * ht * i) / segs;
    ctx.beginPath(); ctx.moveTo(-wd, y); ctx.lineTo(wd, y); ctx.stroke();
  }
  ctx.restore();
}

function drawPlasma(ctx, g, intensity, time) {
  const tNorm = clamp((model.temperature - 6) / 20, 0, 1);
  const pulse = 0.5 + Math.sin(time * 0.003) * 0.5;
  const edgeColor = [34, 120, 150];
  const coreColor = mixColor([90, 235, 215], [255, 246, 220], tNorm * 0.85 + intensity * 0.15);

  ctx.save();
  // soft outer bloom (controlled, gradient based rather than heavy shadowBlur)
  const bloom = ctx.createRadialGradient(g.cx, g.cy, g.Rx * 0.3, g.cx, g.cy, g.Rx + g.a * 2.4);
  const sc = hexToRgb(model.stateColor);
  bloom.addColorStop(0, `rgba(${sc[0]},${sc[1]},${sc[2]},${0.05 + intensity * 0.12})`);
  bloom.addColorStop(0.55, `rgba(${sc[0]},${sc[1]},${sc[2]},${0.03 + intensity * 0.06})`);
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.cy, g.Rx + g.a * 2.4, (g.Ry + g.a * 2.4) * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();

  // tube band: concentric ellipses across the minor radius, hot center to cool edge
  ctx.globalCompositeOperation = "lighter";
  const steps = 26;
  for (let k = 0; k <= steps; k += 1) {
    const off = (k / steps - 0.5) * 2;          // -1..1 across tube
    const edgeIntensity = 1 - Math.abs(off);     // 1 at center, 0 at edges
    const ringRx = g.Rx + off * g.a;
    const ringRy = g.Ry + off * g.a * g.tilt;
    const c = mixColor(edgeColor, coreColor, Math.pow(edgeIntensity, 0.8));
    const alpha = (0.04 + intensity * 0.10) * (0.25 + edgeIntensity * 0.85);
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    ctx.lineWidth = (2 * g.a) / steps + 2.2 + pulse * 1.5;
    ctx.beginPath();
    ctx.ellipse(g.cx, g.cy, ringRx, ringRy, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // bright separatrix highlight along the tube centerline
  ctx.strokeStyle = `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},${0.35 + intensity * 0.4})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.cy, g.Rx, g.Ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, g, intensity, time) {
  // Ion motion tracks plasma temperature; brightness and trail length track
  // fusion intensity, so the core is calm/dim at startup and fast/bright near ignition.
  const speedScale = 0.42 + model.temperature / 9.5;
  const inner = g.Rx - g.a * 0.78;
  const span = g.a * 1.56;
  const streakAmt = (0.5 + intensity * 1.1) * (0.6 + speedScale * 0.4);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const p of particles) {
    p.angle += 0.0047 * p.speed * speedScale;
    const wobble = Math.sin(time * 0.004 + p.phase) * g.a * 0.12;
    const rad = inner + span * p.lane + wobble;
    const cosA = Math.cos(p.angle);
    const sinA = Math.sin(p.angle);
    const x = g.cx + cosA * rad;
    const y = g.cy + sinA * rad * g.tilt;
    // tangential velocity direction in screen space, for the motion trail
    const vx = -sinA;
    const vy = cosA * g.tilt;
    const vlen = Math.hypot(vx, vy) || 1;
    const len = (3 + p.speed * 4.8) * streakAmt;
    const tailX = x - (vx / vlen) * len;
    const tailY = y - (vy / vlen) * len;
    const col = p.lane > 0.5 ? "154, 246, 255" : "255, 208, 120";
    const alpha = 0.22 + intensity * 0.6;
    // comet trail
    ctx.strokeStyle = `rgba(${col}, ${alpha * 0.55})`;
    ctx.lineWidth = (p.size + intensity * 1.1) * 0.9;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(x, y);
    ctx.stroke();
    // bright head
    ctx.fillStyle = `rgba(${col}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, p.size + intensity * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNeutrons(ctx, g, intensity, time) {
  const oRx = g.Rx + g.a;
  const oRy = g.Ry + g.a * g.tilt;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 210, 122, ${0.1 + intensity * 0.38})`;
  ctx.lineWidth = 1.1;
  for (const spark of sparks) {
    spark.life += 0.006 * spark.speed * (0.4 + intensity);
    if (spark.life > 1) { spark.life = 0; spark.angle = Math.random() * Math.PI * 2; }
    const ca = Math.cos(spark.angle);
    const sa = Math.sin(spark.angle);
    const sX = g.cx + ca * oRx * 0.9;
    const sY = g.cy + sa * oRy * 0.9;
    const eX = g.cx + ca * oRx * (1.02 + spark.life * 0.5);
    const eY = g.cy + sa * oRy * (1.02 + spark.life * 0.5);
    ctx.globalAlpha = (1 - spark.life) * intensity;
    ctx.beginPath();
    ctx.moveTo(sX, sY);
    ctx.lineTo(eX, eY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDivertor(ctx, g, intensity, time) {
  // Attached to the underside of the vessel at the bottom (theta = PI/2).
  const oRx = g.Rx + g.a;
  const oRy = g.Ry + g.a * g.tilt;
  const sweep = model.divertorSweep ? Math.sin(time * 0.006) * 0.22 : 0;
  const base = Math.PI / 2 + sweep;
  const span = 0.5;
  ctx.save();
  // target plate (dark metallic arc hugging the vessel)
  ctx.lineCap = "round";
  ctx.lineWidth = g.a * 0.42;
  ctx.strokeStyle = "rgba(58, 64, 78, 0.95)";
  ctx.beginPath();
  ctx.ellipse(g.cx, g.cy, oRx * 1.04, oRy * 1.04, 0, base - span, base + span);
  ctx.stroke();
  // strike-point glow on the plasma-facing side
  const load = clamp(0.25 + model.wallLoad / 12, 0.25, 1) * intensity;
  ctx.lineWidth = g.a * 0.2;
  ctx.strokeStyle = `rgba(255, 122, 102, ${0.35 + load * 0.5})`;
  ctx.shadowColor = "#ff7a66";
  ctx.shadowBlur = 12 * load;
  ctx.beginPath();
  ctx.ellipse(g.cx, g.cy, oRx * 0.99, oRy * 0.99, 0, base - span * 0.7, base + span * 0.7);
  ctx.stroke();
  ctx.restore();
}

function drawCoolantPipe(ctx, g, time) {
  const flow = clamp(model.coolingFlow / 100, 0, 1);
  const oRx = g.Rx + g.a;
  const oRy = g.Ry + g.a * g.tilt;

  // Vessel taps on the lower-outboard side.
  const hot = { x: g.cx + Math.cos(Math.PI * 0.42) * oRx * 1.04, y: g.cy + Math.sin(Math.PI * 0.42) * oRy * 1.04 };
  const cold = { x: g.cx + Math.cos(Math.PI * 0.28) * oRx * 1.04, y: g.cy + Math.sin(Math.PI * 0.28) * oRy * 1.04 };

  // Steam-generator connection points.
  const hxL = g.hxX - g.hxW / 2;
  const hxR = g.hxX + g.hxW / 2;
  const inletHot = { x: hxL, y: g.hxY + g.hxH * 0.22 };
  const outletCool = { x: hxL, y: g.hxY - g.hxH * 0.18 };
  const steamOut = { x: hxR, y: g.hxY - g.hxH * 0.12 };
  const turbineIn = { x: g.tx - g.turbineR * 1.1, y: g.ty - g.turbineR * 0.2 };

  const strand = (p0, c1, c2, p3, color, speed) => {
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
    ctx.setLineDash([]);
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(36, 42, 54, 0.9)";
    ctx.stroke();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = color;
    ctx.setLineDash([15, 12]);
    ctx.lineDashOffset = -time * speed;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  ctx.save();
  ctx.lineCap = "round";
  // Primary hot: blanket -> steam generator (amber)
  strand(
    hot,
    { x: hot.x + 24, y: hot.y + 46 },
    { x: inletHot.x - 40, y: inletHot.y + 10 },
    inletHot,
    `rgba(255, 150, 90, ${0.42 + flow * 0.5})`,
    0.04 + flow * 0.16
  );
  // Primary cooled: steam generator -> blanket (teal)
  strand(
    outletCool,
    { x: outletCool.x - 44, y: outletCool.y - 6 },
    { x: cold.x + 22, y: cold.y + 46 },
    cold,
    `rgba(56, 225, 198, ${0.42 + flow * 0.5})`,
    0.04 + flow * 0.16
  );
  // Secondary steam: steam generator -> turbine (pale, faster)
  strand(
    steamOut,
    { x: steamOut.x + 26, y: steamOut.y - 4 },
    { x: turbineIn.x - 22, y: turbineIn.y - 18 },
    turbineIn,
    `rgba(214, 240, 255, ${0.45 + flow * 0.45})`,
    0.12 + flow * 0.22
  );

  // tap flanges
  ctx.fillStyle = "rgba(196, 204, 224, 0.75)";
  for (const p of [hot, cold]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHeatExchanger(ctx, g, time, intensity) {
  const { hxX, hxY, hxW, hxH } = g;
  const left = hxX - hxW / 2;
  const top = hxY - hxH / 2;
  const heat = clamp(0.3 + intensity * 0.7, 0, 1) * clamp(model.coolingFlow / 60, 0.3, 1);

  ctx.save();

  // outer heat glow
  const glow = ctx.createRadialGradient(hxX, hxY, hxW * 0.2, hxX, hxY, hxW * 1.6);
  glow.addColorStop(0, `rgba(255, 150, 90, ${0.18 * heat})`);
  glow.addColorStop(1, "rgba(255, 150, 90, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hxX, hxY, hxW * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // drum body with hot-to-cool vertical gradient
  const body = ctx.createLinearGradient(0, top, 0, top + hxH);
  body.addColorStop(0, "rgba(40, 120, 130, 0.95)");   // cool top
  body.addColorStop(0.5, "rgba(70, 92, 110, 0.95)");
  body.addColorStop(1, `rgba(${Math.round(180 + heat * 60)}, ${Math.round(90 + heat * 30)}, 60, 0.97)`); // hot bottom
  ctx.fillStyle = body;
  roundedRect(ctx, left, top, hxW, hxH, hxW * 0.32);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(214, 224, 240, 0.45)";
  ctx.stroke();

  // internal U-tubes (heat-transfer bundle)
  ctx.save();
  roundedRect(ctx, left, top, hxW, hxH, hxW * 0.32);
  ctx.clip();
  ctx.lineWidth = 2;
  const tubes = 3;
  for (let i = 0; i < tubes; i += 1) {
    const tx = left + hxW * (0.28 + (i / (tubes - 1)) * 0.44);
    const tg = ctx.createLinearGradient(0, top, 0, top + hxH);
    tg.addColorStop(0, "rgba(120, 230, 220, 0.7)");
    tg.addColorStop(1, "rgba(255, 170, 110, 0.8)");
    ctx.strokeStyle = tg;
    ctx.beginPath();
    ctx.moveTo(tx, top + hxH * 0.92);
    for (let s = 0; s <= 1; s += 0.1) {
      const yy = top + hxH * (0.92 - s * 0.78);
      const xx = tx + Math.sin(s * Math.PI * 3 + time * 0.003) * 2.4;
      ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }

  // rising boil bubbles
  ctx.fillStyle = `rgba(230, 246, 255, ${0.5 + heat * 0.4})`;
  for (let i = 0; i < 7; i += 1) {
    const phase = (time * 0.04 * (0.6 + (i % 3) * 0.3) + i * 90) % (hxH * 0.8);
    const by = top + hxH * 0.85 - phase;
    const bx = left + hxW * (0.25 + ((i * 37) % 100) / 100 * 0.5);
    ctx.globalAlpha = clamp((by - top) / (hxH * 0.5), 0, 1) * heat;
    ctx.beginPath();
    ctx.arc(bx, by, 1.3 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // steam wisps venting from the top
  ctx.strokeStyle = `rgba(220, 240, 255, ${0.3 * heat})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const sx = left + hxW * (0.3 + i * 0.2);
    ctx.beginPath();
    ctx.moveTo(sx, top);
    for (let s = 0; s <= 1; s += 0.2) {
      const yy = top - s * hxH * 0.5;
      const xx = sx + Math.sin(s * Math.PI * 2 + time * 0.004 + i) * 5;
      ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }

  // label
  ctx.fillStyle = "rgba(238, 242, 248, 0.7)";
  ctx.font = "700 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("STEAM GENERATOR", hxX, top + hxH + 14);
  ctx.textAlign = "left";
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

function drawTurbine(ctx, g, time) {
  const x = g.tx;
  const y = g.ty;
  const radius = g.turbineR;
  const spin = time * 0.004 * (0.2 + model.turbineLoad / 100);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "rgba(238, 242, 248, 0.26)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(spin);
  ctx.fillStyle = "rgba(255, 194, 75, 0.8)";
  for (let i = 0; i < 8; i += 1) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(radius * 0.6, -radius * 0.16, radius * 1.26, -radius * 0.05);
    ctx.quadraticCurveTo(radius * 0.5, radius * 0.24, 0, 0);
    ctx.fill();
  }
  ctx.fillStyle = "#eef2f8";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLabels(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(238, 242, 248, 0.55)";
  ctx.font = "700 11px Inter, system-ui, sans-serif";
  ctx.fillText("MAGNETIC CONFINEMENT VESSEL", Math.max(16, w * 0.05), Math.max(26, h * 0.07));
  ctx.restore();
}

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
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
