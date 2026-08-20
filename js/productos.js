import { getProducts, createProduct, updateProduct, deleteProduct, getSettings } from "./storage.js";
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

const inputColorNombre = document.getElementById("color-nombre");
const inputColorStock = document.getElementById("color-stock");
const btnAgregarColor = document.getElementById("btn-agregar-color");
const coloresList = document.getElementById("colores-list");

const detalleOverlay = document.getElementById("detalle-overlay");
const detalleTitle = document.getElementById("detalle-title");
const detalleDesglose = document.getElementById("detalle-desglose");
const detalleClose = document.getElementById("detalle-close");

let selectedFile = null;
let currentFotoUrl = null;
let cachedSettings = null;
let pendingColores = [];

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
  pendingColores = product?.colores ? product.colores.map((c) => ({ color: c.color, stock: c.stock })) : [];
  inputId.value = product?.id ?? "";
  inputNombre.value = product?.nombre || "";
  inputPrecio.value = product?.precioVenta ?? "";
  inputGramos.value = product?.gramosFilamento ?? "";
  inputHoras.value = product?.horas ?? "";
  modalTitle.textContent = product ? "Editar producto" : "Nuevo producto";
  productoError.hidden = true;
  btnEliminar.hidden = !product;

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

async function renderProductos() {
  await refreshSettingsCache();
  const products = await getProducts();

  emptyState.hidden = products.length > 0;
  grid.innerHTML = "";

  products.forEach((product) => {
    const colores = product.colores || [];
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
          <button class="btn btn-ghost btn-detalles">Detalles</button>
          <button class="btn btn-primary btn-editar">Editar</button>
        </div>
      </div>
    `;

    card.querySelector(".btn-detalles").addEventListener("click", () => openDetalleModal(product));
    card.querySelector(".btn-editar").addEventListener("click", () => openModal(product));

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
        colores: pendingColores,
      };

      if (inputId.value) {
        await updateProduct(Number(inputId.value), payload);
      } else {
        await createProduct(payload);
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

  await renderProductos();
}

export async function refreshProductos() {
  await renderProductos();
}
