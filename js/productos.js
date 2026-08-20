import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSettings,
  addStock,
  createSale,
} from "./storage.js";
import { calcularCosto, calcularMargen, formatCLP, formatPct } from "./calculator.js";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadFoto(file) {
  const compressed = await compressImage(file);
  const dataUrl = await blobToDataURL(compressed);
  const response = await fetch("/api/blob/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: "foto.jpg", dataUrl }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "No se pudo subir la foto");
  return body.url;
}

const grid = document.getElementById("productos-grid");
const emptyState = document.getElementById("productos-empty");

const overlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("form-producto");
const submitBtn = form.querySelector('button[type="submit"]');
const inputId = document.getElementById("producto-id");
const inputNombre = document.getElementById("producto-nombre");
const inputFoto = document.getElementById("producto-foto");
const fotoPreview = document.getElementById("producto-foto-preview");
const inputPrecio = document.getElementById("producto-precio");
const inputGramos = document.getElementById("producto-gramos");
const inputHoras = document.getElementById("producto-horas");
const productoDesglose = document.getElementById("producto-desglose");
const productoError = document.getElementById("producto-error");
const btnEliminar = document.getElementById("producto-eliminar");

const coloresCrearWrapper = document.getElementById("colores-crear-wrapper");
const inputColorNombre = document.getElementById("color-nombre");
const inputColorStock = document.getElementById("color-stock");
const btnAgregarColor = document.getElementById("btn-agregar-color");
const coloresList = document.getElementById("colores-list");

const detalleOverlay = document.getElementById("detalle-overlay");
const detalleTitle = document.getElementById("detalle-title");
const detalleDesglose = document.getElementById("detalle-desglose");
const detalleClose = document.getElementById("detalle-close");

const stockOverlay = document.getElementById("stock-overlay");
const formStock = document.getElementById("form-stock");
const stockColor = document.getElementById("stock-color");
const stockColoresDatalist = document.getElementById("stock-colores-datalist");
const stockCantidad = document.getElementById("stock-cantidad");
const stockError = document.getElementById("stock-error");
const stockClose = document.getElementById("stock-close");
const stockCancel = document.getElementById("stock-cancel");

const ventaOverlay = document.getElementById("venta-overlay");
const formVenta = document.getElementById("form-venta");
const ventaColorSelect = document.getElementById("venta-color");
const ventaComentario = document.getElementById("venta-comentario");
const ventaError = document.getElementById("venta-error");
const ventaConfirmar = document.getElementById("venta-confirmar");
const ventaClose = document.getElementById("venta-close");
const ventaCancel = document.getElementById("venta-cancel");

let selectedFile = null;
let currentFotoUrl = null;
let cachedSettings = null;
let pendingColores = [];
let productoActivo = null;

async function refreshSettingsCache() {
  cachedSettings = await getSettings();
}

function renderColoresList() {
  coloresList.innerHTML = pendingColores
    .map(
      (c, i) => `
        <div class="color-row">
          <span>${c.color} — ${c.stock} unidades</span>
          <button type="button" class="btn-icon color-row-remove" data-index="${i}" aria-label="Quitar">×</button>
        </div>
      `
    )
    .join("");

  coloresList.querySelectorAll(".color-row-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingColores.splice(Number(btn.dataset.index), 1);
      renderColoresList();
    });
  });
}

function agregarColor() {
  const nombre = inputColorNombre.value.trim();
  const stock = Math.max(0, Math.trunc(Number(inputColorStock.value) || 0));
  if (!nombre) return;

  const existente = pendingColores.find((c) => c.color.toLowerCase() === nombre.toLowerCase());
  if (existente) {
    existente.stock = stock;
  } else {
    pendingColores.push({ color: nombre, stock });
  }

  inputColorNombre.value = "";
  inputColorStock.value = "";
  inputColorNombre.focus();
  renderColoresList();
}

function openModal(product = null) {
  form.reset();
  selectedFile = null;
  currentFotoUrl = product?.fotoUrl || null;
  pendingColores = [];
  inputId.value = product?.id ?? "";
  inputNombre.value = product?.nombre || "";
  inputPrecio.value = product?.precioVenta ?? "";
  inputGramos.value = product?.gramosFilamento ?? "";
  inputHoras.value = product?.horas ?? "";
  modalTitle.textContent = product ? "Editar producto" : "Nuevo producto";
  productoError.hidden = true;
  btnEliminar.hidden = !product;
  coloresCrearWrapper.hidden = !!product;

  if (currentFotoUrl) {
    fotoPreview.src = currentFotoUrl;
    fotoPreview.hidden = false;
  } else {
    fotoPreview.hidden = true;
  }

  renderColoresList();
  updateDesglosePreview();
  overlay.hidden = false;
}

function closeModal() {
  overlay.hidden = true;
}

function updateDesglosePreview() {
  if (!cachedSettings) return;
  const gramos = Number(inputGramos.value) || 0;
  const horas = Number(inputHoras.value) || 0;
  const precioVenta = Number(inputPrecio.value) || 0;
  const { costoFilamento, costoLuz, costoDesgaste, costoTotal } = calcularCosto(
    { gramos, horas },
    cachedSettings
  );
  const { margen, margenPct } = calcularMargen(precioVenta, costoTotal);
  productoDesglose.innerHTML = `
    <div class="desglose-row"><span>Costo filamento</span><span>${formatCLP(costoFilamento)}</span></div>
    <div class="desglose-row"><span>Costo luz</span><span>${formatCLP(costoLuz)}</span></div>
    <div class="desglose-row"><span>Costo desgaste</span><span>${formatCLP(costoDesgaste)}</span></div>
    <div class="desglose-row total"><span>Costo total</span><span>${formatCLP(costoTotal)}</span></div>
    <div class="desglose-row"><span>Margen</span><span>${formatCLP(margen)} (${formatPct(margenPct)})</span></div>
  `;
}

function openDetalleModal(product) {
  const { costoFilamento, costoLuz, costoDesgaste, costoTotal } = calcularCosto(
    { gramos: product.gramosFilamento, horas: product.horas },
    cachedSettings
  );
  const { margen, margenPct } = calcularMargen(product.precioVenta, costoTotal);
  detalleTitle.textContent = `Detalles — ${product.nombre}`;
  detalleDesglose.innerHTML = `
    <div class="desglose-row"><span>Costo filamento</span><span>${formatCLP(costoFilamento)}</span></div>
    <div class="desglose-row"><span>Costo luz</span><span>${formatCLP(costoLuz)}</span></div>
    <div class="desglose-row"><span>Costo desgaste</span><span>${formatCLP(costoDesgaste)}</span></div>
    <div class="desglose-row total"><span>Costo total</span><span>${formatCLP(costoTotal)}</span></div>
    <div class="desglose-row"><span>Margen</span><span>${formatCLP(margen)} (${formatPct(margenPct)})</span></div>
  `;
  detalleOverlay.hidden = false;
}

function closeDetalleModal() {
  detalleOverlay.hidden = true;
}

function openStockModal(product) {
  productoActivo = product;
  stockError.hidden = true;
  formStock.reset();
  stockColoresDatalist.innerHTML = (product.colores || [])
    .map((c) => `<option value="${c.color}"></option>`)
    .join("");
  stockOverlay.hidden = false;
  stockColor.focus();
}

function closeStockModal() {
  stockOverlay.hidden = true;
}

function openVentaModal(product) {
  productoActivo = product;
  ventaError.hidden = true;
  formVenta.reset();
  const disponibles = (product.colores || []).filter((c) => c.stock > 0);

  if (!disponibles.length) {
    ventaColorSelect.innerHTML = "";
    ventaError.textContent = "Este producto no tiene stock disponible para vender.";
    ventaError.hidden = false;
    ventaConfirmar.disabled = true;
  } else {
    ventaColorSelect.innerHTML = disponibles
      .map((c) => `<option value="${c.color}">${c.color} (${c.stock} disponibles)</option>`)
      .join("");
    ventaConfirmar.disabled = false;
  }

  ventaOverlay.hidden = false;
}

function closeVentaModal() {
  ventaOverlay.hidden = true;
}

async function renderProductos() {
  await refreshSettingsCache();
  const products = await getProducts();

  emptyState.hidden = products.length > 0;
  grid.innerHTML = "";

  products.forEach((product) => {
    const colores = product.colores || [];
    const hayStock = colores.some((c) => c.stock > 0);
    const card = document.createElement("article");
    card.className = "producto-card";
    card.innerHTML = `
      ${
        product.fotoUrl
          ? `<img class="producto-foto" src="${product.fotoUrl}" alt="${product.nombre}">`
          : `<div class="producto-foto-placeholder">🖨️</div>`
      }
      <div class="producto-body">
        <p class="producto-nombre">${product.nombre}</p>
        <p class="producto-precio">${formatCLP(product.precioVenta)}</p>
        <div class="color-chips">
          ${
            colores.length
              ? colores.map((c) => `<span class="color-chip">${c.color}: ${c.stock}</span>`).join("")
              : `<span class="muted">Sin colores registrados</span>`
          }
        </div>
        <div class="producto-actions">
          <div class="producto-actions-row">
            <button class="btn-icon-square btn-detalles" title="Detalles" aria-label="Detalles">ⓘ</button>
            <button class="btn-icon-square btn-editar" title="Editar" aria-label="Editar">✎</button>
            <button class="btn-icon-square btn-agregar-stock" title="Agregar stock" aria-label="Agregar stock">📦</button>
          </div>
          <button class="btn btn-primary btn-vender" ${hayStock ? "" : "disabled"}>Vender</button>
        </div>
      </div>
    `;

    card.querySelector(".btn-detalles").addEventListener("click", () => openDetalleModal(product));
    card.querySelector(".btn-editar").addEventListener("click", () => openModal(product));
    card.querySelector(".btn-agregar-stock").addEventListener("click", () => openStockModal(product));
    card.querySelector(".btn-vender").addEventListener("click", () => openVentaModal(product));

    grid.appendChild(card);
  });
}

export async function initProductosPanel() {
  document.getElementById("btn-nuevo-producto").addEventListener("click", () => openModal());
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  detalleClose.addEventListener("click", closeDetalleModal);
  detalleOverlay.addEventListener("click", (e) => {
    if (e.target === detalleOverlay) closeDetalleModal();
  });

  stockClose.addEventListener("click", closeStockModal);
  stockCancel.addEventListener("click", closeStockModal);
  stockOverlay.addEventListener("click", (e) => {
    if (e.target === stockOverlay) closeStockModal();
  });

  ventaClose.addEventListener("click", closeVentaModal);
  ventaCancel.addEventListener("click", closeVentaModal);
  ventaOverlay.addEventListener("click", (e) => {
    if (e.target === ventaOverlay) closeVentaModal();
  });

  btnAgregarColor.addEventListener("click", agregarColor);

  btnEliminar.addEventListener("click", async () => {
    const id = Number(inputId.value);
    if (!id) return;
    if (!confirm(`¿Eliminar "${inputNombre.value}"?`)) return;
    try {
      await deleteProduct(id);
      closeModal();
      await renderProductos();
    } catch (err) {
      productoError.textContent = "No se pudo eliminar: " + err.message;
      productoError.hidden = false;
    }
  });

  inputFoto.addEventListener("change", () => {
    const file = inputFoto.files[0];
    if (!file) return;
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      fotoPreview.src = reader.result;
      fotoPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  [inputPrecio, inputGramos, inputHoras].forEach((input) =>
    input.addEventListener("input", updateDesglosePreview)
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    productoError.hidden = true;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    const esNuevo = !inputId.value;

    try {
      let fotoUrl = currentFotoUrl;
      if (selectedFile) {
        submitBtn.textContent = "Subiendo foto...";
        fotoUrl = await uploadFoto(selectedFile);
      }

      submitBtn.textContent = "Guardando...";
      const payload = {
        nombre: inputNombre.value.trim(),
        fotoUrl,
        precioVenta: Number(inputPrecio.value) || 0,
        gramosFilamento: Number(inputGramos.value) || 0,
        horas: Number(inputHoras.value) || 0,
      };
      if (esNuevo) {
        payload.colores = pendingColores;
      }

      if (esNuevo) {
        await createProduct(payload);
      } else {
        await updateProduct(Number(inputId.value), payload);
      }

      closeModal();
      await renderProductos();
    } catch (err) {
      productoError.textContent = "No se pudo guardar: " + err.message;
      productoError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  formStock.addEventListener("submit", async (e) => {
    e.preventDefault();
    stockError.hidden = true;
    const btn = formStock.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await addStock(productoActivo.id, {
        color: stockColor.value.trim(),
        cantidad: Number(stockCantidad.value) || 0,
      });
      closeStockModal();
      await renderProductos();
    } catch (err) {
      stockError.textContent = "No se pudo agregar: " + err.message;
      stockError.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  formVenta.addEventListener("submit", async (e) => {
    e.preventDefault();
    ventaError.hidden = true;
    ventaConfirmar.disabled = true;
    try {
      await createSale({
        productId: productoActivo.id,
        color: ventaColorSelect.value,
        comentario: ventaComentario.value.trim(),
      });
      closeVentaModal();
      await renderProductos();
    } catch (err) {
      ventaError.textContent = "No se pudo registrar la venta: " + err.message;
      ventaError.hidden = false;
      ventaConfirmar.disabled = false;
    }
  });

  await renderProductos();
}

export async function refreshProductos() {
  await renderProductos();
}
