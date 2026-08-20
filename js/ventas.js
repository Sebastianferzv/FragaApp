import { getSales, updateSale } from "./storage.js";
import { formatCLP } from "./calculator.js";

const emptyState = document.getElementById("ventas-empty");
const tablaWrap = document.getElementById("ventas-tabla-wrap");
const tbody = document.getElementById("ventas-tbody");

const editarOverlay = document.getElementById("venta-editar-overlay");
const formEditar = document.getElementById("form-venta-editar");
const inputPrecio = document.getElementById("venta-editar-precio");
const inputComentario = document.getElementById("venta-editar-comentario");
const comentarioReq = document.getElementById("venta-editar-comentario-req");
const editarError = document.getElementById("venta-editar-error");
const editarClose = document.getElementById("venta-editar-close");
const editarCancel = document.getElementById("venta-editar-cancel");

let ventaActiva = null;

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function openEditarModal(venta) {
  ventaActiva = venta;
  inputPrecio.value = venta.precioVenta;
  inputComentario.value = venta.comentario || "";
  comentarioReq.hidden = true;
  editarError.hidden = true;
  editarOverlay.hidden = false;
}

function closeEditarModal() {
  editarOverlay.hidden = true;
}

async function renderVentas() {
  const ventas = await getSales();
  const hay = ventas.length > 0;
  emptyState.hidden = hay;
  tablaWrap.hidden = !hay;

  tbody.innerHTML = ventas
    .map(
      (v, i) => `
        <tr>
          <td>${formatFecha(v.vendidoEn)}</td>
          <td>${v.productoNombre}</td>
          <td>${v.color}</td>
          <td>${formatCLP(v.precioVenta)}${v.editado ? `<span class="badge-editado">Editado</span>` : ""}</td>
          <td>${v.comentario || "—"}</td>
          <td><button class="btn-icon-square btn-editar-venta" data-index="${i}" title="Editar" aria-label="Editar">✎</button></td>
        </tr>
      `
    )
    .join("");

  tbody.querySelectorAll(".btn-editar-venta").forEach((btn) => {
    btn.addEventListener("click", () => openEditarModal(ventas[Number(btn.dataset.index)]));
  });
}

export async function initVentasPanel() {
  editarClose.addEventListener("click", closeEditarModal);
  editarCancel.addEventListener("click", closeEditarModal);
  editarOverlay.addEventListener("click", (e) => {
    if (e.target === editarOverlay) closeEditarModal();
  });

  inputPrecio.addEventListener("input", () => {
    const cambio = Number(inputPrecio.value) !== ventaActiva.precioVenta;
    comentarioReq.hidden = !cambio;
  });

  formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();
    editarError.hidden = true;

    const nuevoPrecio = Number(inputPrecio.value) || 0;
    const comentario = inputComentario.value.trim();
    const cambioPrecio = nuevoPrecio !== ventaActiva.precioVenta;

    if (cambioPrecio && !comentario) {
      editarError.textContent = "Debes indicar un comentario con el motivo de la rebaja.";
      editarError.hidden = false;
      return;
    }

    const btn = formEditar.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await updateSale(ventaActiva.id, { precioVenta: nuevoPrecio, comentario });
      closeEditarModal();
      await renderVentas();
    } catch (err) {
      editarError.textContent = "No se pudo guardar: " + err.message;
      editarError.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  await renderVentas();
}

export async function refreshVentas() {
  await renderVentas();
}
