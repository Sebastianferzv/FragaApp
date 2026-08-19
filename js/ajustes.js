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

export async function initAjustesPanel(onSettingsChanged) {
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

  let currentSettings = await getSettings();

  function loadIntoForm() {
    inputs.precioKiloFilamento.value = currentSettings.precioKiloFilamento;
    inputs.consumoKw.value = currentSettings.consumoKw;
    inputs.precioKwh.value = currentSettings.precioKwh;
    inputs.desgastePorHora.value = currentSettings.desgastePorHora;
  }

  function updateSimulador() {
    const gramos = Number(simGramos.value) || 0;
    const horas = Number(simHoras.value) || 0;
    renderDesglose(simDesglose, gramos, horas, currentSettings);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nextSettings = {
      precioKiloFilamento: Number(inputs.precioKiloFilamento.value) || 0,
      consumoKw: Number(inputs.consumoKw.value) || 0,
      precioKwh: Number(inputs.precioKwh.value) || 0,
      desgastePorHora: Number(inputs.desgastePorHora.value) || 0,
    };

    try {
      currentSettings = await saveSettings(nextSettings);
      confirm.textContent = "Ajustes guardados ✓";
      confirm.classList.remove("error");
      confirm.hidden = false;
      setTimeout(() => (confirm.hidden = true), 2500);
      updateSimulador();
      onSettingsChanged?.();
    } catch (err) {
      confirm.textContent = "No se pudo guardar: " + err.message;
      confirm.classList.add("error");
      confirm.hidden = false;
    }
  });

  simGramos.addEventListener("input", updateSimulador);
  simHoras.addEventListener("input", updateSimulador);

  loadIntoForm();
  updateSimulador();
}
