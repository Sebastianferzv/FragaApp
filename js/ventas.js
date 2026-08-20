import { getSales, updateSale, deleteSale } from "./storage.js";
import { formatCLP } from "./calculator.js";

const emptyState = document.getElementById("ventas-empty");
const tablaWrap = document.getElementById("ventas-tabla-wrap");
const tbody = document.getElementById("ventas-tbody");

const editarOverlay = document.getElementById("venta-editar-overlay");
const formEditar = document.getElementById("form-venta-editar");
const inputFecha = document.getElementById("venta-editar-fecha");
const inputComentario = document.getElementById("venta-editar-comentario");
const editarError = document.getElementById("venta-editar-error");
const editarClose = document.getElementById("venta-editar-close");
const editarCancel = document.getElementById("venta-editar-cancel");
const btnEliminarVenta = document.getElementById("venta-editar-eliminar");
const btnAbrirEditarPrecio = document.getElementById("btn-abrir-editar-precio");

const precioOverlay = document.getElementById("precio-editar-overlay");
const formPrecio = document.getElementById("form-precio-editar");
const inputPrecioNuevo = document.getElementById("precio-editar-nuevo");
const inputMotivo = document.getElementById("precio-editar-motivo");
const precioError = document.getElementById("precio-editar-error");
const precioClose = document.getElementById("precio-editar-close");
const precioCancel = document.getElementById("precio-editar-cancel");

let ventaActiva = null;

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "medium" });
}

function openEditarModal(venta) {
  ventaActiva = venta;
  inputFecha.value = venta.vendidoEn.slice(0, 10);
  inputComentario.value = venta.comentario || "";
  editarError.hidden = true;
  editarOverlay.hidden = false;
}

function closeEditarModal() {
  editarOverlay.hidden = true;
}

function openPrecioModal() {
  inputPrecioNuevo.value = ventaActiva.precioVenta;
  inputMotivo.value = "";
  precioError.hidden = true;
  editarOverlay.hidden = true;
  precioOverlay.hidden = false;
}

function closePrecioModal(volverAEditar = true) {
  precioOverlay.hidden = true;
  if (volverAEditar) editarOverlay.hidden = false;
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
          <td>${escapeHtml(v.productoNombre)}</td>
          <td>${escapeHtml(v.color)}</td>
          <td>${formatCLP(v.precioVenta)}${
            v.motivoRebaja
              ? `<span class="info-icon" title="Motivo de la rebaja: ${escapeHtml(v.motivoRebaja)}">ⓘ</span>`
              : ""
          }</td>
          <td>
            <label class="toggle">
              <input type="checkbox" class="pagado-toggle" data-index="${i}" ${v.pagado ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>${escapeHtml(v.comentario) || "—"}</td>
          <td><button class="btn-icon-square btn-editar-venta" data-index="${i}" title="Editar" aria-label="Editar">✎</button></td>
        </tr>
      `
    )
    .join("");

  tbody.querySelectorAll(".btn-editar-venta").forEach((btn) => {
    btn.addEventListener("click", () => openEditarModal(ventas[Number(btn.dataset.index)]));
  });

  tbody.querySelectorAll(".pagado-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const venta = ventas[Number(checkbox.dataset.index)];
      checkbox.disabled = true;
      try {
        await updateSale(venta.id, { pagado: checkbox.checked });
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        alert("No se pudo actualizar: " + err.message);
      } finally {
        checkbox.disabled = false;
      }
    });
  });
}

export async function initVentasPanel() {
  editarClose.addEventListener("click", closeEditarModal);
  editarCancel.addEventListener("click", closeEditarModal);
  editarOverlay.addEventListener("click", (e) => {
    if (e.target === editarOverlay) closeEditarModal();
  });

  btnAbrirEditarPrecio.addEventListener("click", openPrecioModal);

  precioClose.addEventListener("click", () => closePrecioModal());
  precioCancel.addEventListener("click", () => closePrecioModal());
  precioOverlay.addEventListener("click", (e) => {
    if (e.target === precioOverlay) closePrecioModal();
  });

  btnEliminarVenta.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta venta? El stock vendido se restaurará al color correspondiente.")) return;
    try {
      await deleteSale(ventaActiva.id);
      closeEditarModal();
      await renderVentas();
    } catch (err) {
      editarError.textContent = "No se pudo eliminar: " + err.message;
      editarError.hidden = false;
    }
  });

  formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();
    editarError.hidden = true;
    const btn = formEditar.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await updateSale(ventaActiva.id, {
        vendidoEn: inputFecha.value,
        comentario: inputComentario.value.trim(),
      });
      closeEditarModal();
      await renderVentas();
    } catch (err) {
      editarError.textContent = "No se pudo guardar: " + err.message;
      editarError.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  formPrecio.addEventListener("submit", async (e) => {
    e.preventDefault();
    precioError.hidden = true;
    const btn = formPrecio.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await updateSale(ventaActiva.id, {
        precioVenta: Number(inputPrecioNuevo.value) || 0,
        motivoRebaja: inputMotivo.value.trim(),
      });
      closePrecioModal(false);
      await renderVentas();
    } catch (err) {
      precioError.textContent = "No se pudo guardar: " + err.message;
      precioError.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  await renderVentas();
}

export async function refreshVentas() {
  await renderVentas();
}
