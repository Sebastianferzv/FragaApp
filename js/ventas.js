import { getSales, updateSale, deleteSale } from "./storage.js";
import { formatCLP } from "./calculator.js";

const emptyState = document.getElementById("ventas-empty");
const tablaWrap = document.getElementById("ventas-tabla-wrap");
const tbody = document.getElementById("ventas-tbody");

const editarOverlay = document.getElementById("venta-editar-overlay");
const formEditar = document.getElementById("form-venta-editar");
const inputFecha = document.getElementById("venta-editar-fecha");
const inputPrecio = document.getElementById("venta-editar-precio");
const inputComentario = document.getElementById("venta-editar-comentario");
const editarError = document.getElementById("venta-editar-error");
const editarClose = document.getElementById("venta-editar-close");
const editarCancel = document.getElementById("venta-editar-cancel");
const btnEliminarVenta = document.getElementById("venta-editar-eliminar");

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
  inputPrecio.value = venta.precioVenta;
  inputComentario.value = venta.comentario || "";
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
          <td>${escapeHtml(v.productoNombre)}</td>
          <td>${escapeHtml(v.color)}</td>
          <td>${formatCLP(v.precioVenta)}</td>
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
        precioVenta: Number(inputPrecio.value) || 0,
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

  await renderVentas();
}

export async function refreshVentas() {
  await renderVentas();
}
