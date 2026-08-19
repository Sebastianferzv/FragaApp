import { getSettings, saveSettings } from "./storage.js";
import { calcularCosto, formatCLP } from "./calculator.js";

function renderDesglose(container, gramos, horas, settings) {
  const { costoFilamento, costoLuz, costoDesgaste, costoTotal } = calcularCosto(
    { gramos, horas },
    settings
  );
  container.innerHTML = `
    <div class="desglose-row"><span>Costo filamento</span><span>${formatCLP(costoFilamento)}</span></div>
    <div class="desglose-row"><span>Costo luz</span><span>${formatCLP(costoLuz)}</span></div>
    <div class="desglose-row"><span>Costo desgaste</span><span>${formatCLP(costoDesgaste)}</span></div>
    <div class="desglose-row total"><span>Costo total</span><span>${formatCLP(costoTotal)}</span></div>
  `;
}

export function initAjustesPanel(onSettingsChanged) {
  const form = document.getElementById("form-ajustes");
  const confirm = document.getElementById("ajustes-confirm");
  const inputs = {
    precioKiloFilamento: document.getElementById("precioKiloFilamento"),
    consumoKw: document.getElementById("consumoKw"),
    precioKwh: document.getElementById("precioKwh"),
    desgastePorHora: document.getElementById("desgastePorHora"),
  };

  const simGramos = document.getElementById("sim-gramos");
  const simHoras = document.getElementById("sim-horas");
  const simDesglose = document.getElementById("sim-desglose");

  function loadIntoForm() {
    const settings = getSettings();
    inputs.precioKiloFilamento.value = settings.precioKiloFilamento;
    inputs.consumoKw.value = settings.consumoKw;
    inputs.precioKwh.value = settings.precioKwh;
    inputs.desgastePorHora.value = settings.desgastePorHora;
  }

  function updateSimulador() {
    const settings = getSettings();
    const gramos = Number(simGramos.value) || 0;
    const horas = Number(simHoras.value) || 0;
    renderDesglose(simDesglose, gramos, horas, settings);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const settings = {
      precioKiloFilamento: Number(inputs.precioKiloFilamento.value) || 0,
      consumoKw: Number(inputs.consumoKw.value) || 0,
      precioKwh: Number(inputs.precioKwh.value) || 0,
      desgastePorHora: Number(inputs.desgastePorHora.value) || 0,
    };
    saveSettings(settings);
    confirm.hidden = false;
    setTimeout(() => (confirm.hidden = true), 2500);
    updateSimulador();
    onSettingsChanged?.();
  });

  simGramos.addEventListener("input", updateSimulador);
  simHoras.addEventListener("input", updateSimulador);

  loadIntoForm();
  updateSimulador();
}
