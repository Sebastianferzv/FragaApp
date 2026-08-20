import { getStockHistory } from "./storage.js";

const emptyState = document.getElementById("historial-empty");
const tablaWrap = document.getElementById("historial-tabla-wrap");
const tbody = document.getElementById("historial-tbody");

const ORIGEN_LABEL = { creacion: "Creación", agregado: "Agregado" };

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

async function renderHistorial() {
  const historial = await getStockHistory();
  const hay = historial.length > 0;
  emptyState.hidden = hay;
  tablaWrap.hidden = !hay;

  tbody.innerHTML = historial
    .map(
      (h) => `
        <tr>
          <td>${formatFecha(h.registradoEn)}</td>
          <td>${h.productoNombre}</td>
          <td>${h.color}</td>
          <td>${h.cantidad}</td>
          <td>${ORIGEN_LABEL[h.origen] || h.origen}</td>
        </tr>
      `
    )
    .join("");
}

export async function initHistorialPanel() {
  await renderHistorial();
}

export async function refreshHistorial() {
  await renderHistorial();
}
