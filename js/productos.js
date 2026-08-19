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

let selectedFile = null;
let currentFotoUrl = null;
let cachedSettings = null;

async function refreshSettingsCache() {
  cachedSettings = await getSettings();
}

function openModal(product = null) {
  form.reset();
  selectedFile = null;
  currentFotoUrl = product?.fotoUrl || null;
  inputId.value = product?.id ?? "";
  inputNombre.value = product?.nombre || "";
  inputPrecio.value = product?.precioVenta ?? "";
  inputGramos.value = product?.gramosFilamento ?? "";
  inputHoras.value = product?.horas ?? "";
  modalTitle.textContent = product ? "Editar producto" : "Nuevo producto";
  productoError.hidden = true;

  if (currentFotoUrl) {
    fotoPreview.src = currentFotoUrl;
    fotoPreview.hidden = false;
  } else {
    fotoPreview.hidden = true;
  }

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

async function renderProductos() {
  await refreshSettingsCache();
  const products = await getProducts();

  emptyState.hidden = products.length > 0;
  grid.innerHTML = "";

  products.forEach((product) => {
    const { costoTotal } = calcularCosto(
      { gramos: product.gramosFilamento, horas: product.horas },
      cachedSettings
    );
    const { margen, margenPct } = calcularMargen(product.precioVenta, costoTotal);
    const esPositivo = margen >= 0;

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
        <div class="producto-stats">
          <span>Costo de creación: ${formatCLP(costoTotal)}</span>
          <span>${product.gramosFilamento} g · ${product.horas} h</span>
        </div>
        <span class="badge ${esPositivo ? "badge-positivo" : "badge-negativo"}">
          Margen: ${formatCLP(margen)} (${formatPct(margenPct)})
        </span>
        <div class="producto-actions">
          <button class="btn btn-ghost btn-editar">Editar</button>
          <button class="btn btn-eliminar">Eliminar</button>
        </div>
      </div>
    `;

    card.querySelector(".btn-editar").addEventListener("click", () => openModal(product));
    card.querySelector(".btn-eliminar").addEventListener("click", async () => {
      if (!confirm(`¿Eliminar "${product.nombre}"?`)) return;
      try {
        await deleteProduct(product.id);
        await renderProductos();
      } catch (err) {
        alert("No se pudo eliminar el producto: " + err.message);
      }
    });

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
