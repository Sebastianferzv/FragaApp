import { getSales } from "./storage.js";
import { formatCLP } from "./calculator.js";

const emptyState = document.getElementById("ventas-empty");
const tablaWrap = document.getElementById("ventas-tabla-wrap");
const tbody = document.getElementById("ventas-tbody");

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

async function renderVentas() {
  const ventas = await getSales();
  const hay = ventas.length > 0;
  emptyState.hidden = hay;
  tablaWrap.hidden = !hay;

  tbody.innerHTML = ventas
    .map(
      (v) => `
        <tr>
          <td>${formatFecha(v.vendidoEn)}</td>
          <td>${v.productoNombre}</td>
          <td>${v.color}</td>
          <td>${formatCLP(v.precioVenta)}</td>
          <td>${v.comentario || "—"}</td>
        </tr>
      `
    )
    .join("");
}

export async function initVentasPanel() {
  await renderVentas();
}

export async function refreshVentas() {
  await renderVentas();
}
