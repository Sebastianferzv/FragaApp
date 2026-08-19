import { getProducts, upsertProduct, deleteProduct, generateId, getSettings } from "./storage.js";
import { calcularCosto, calcularMargen, formatCLP, formatPct } from "./calculator.js";

const grid = document.getElementById("productos-grid");
const emptyState = document.getElementById("productos-empty");

const overlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const form = document.getElementById("form-producto");
const inputId = document.getElementById("producto-id");
const inputNombre = document.getElementById("producto-nombre");
const inputFoto = document.getElementById("producto-foto");
const fotoPreview = document.getElementById("producto-foto-preview");
const inputPrecio = document.getElementById("producto-precio");
const inputGramos = document.getElementById("producto-gramos");
const inputHoras = document.getElementById("producto-horas");
const productoDesglose = document.getElementById("producto-desglose");

let fotoDataUrl = null;

function openModal(product = null) {
  form.reset();
  fotoDataUrl = product?.fotoDataUrl || null;
  inputId.value = product?.id || "";
  inputNombre.value = product?.nombre || "";
  inputPrecio.value = product?.precioVenta ?? "";
  inputGramos.value = product?.gramosFilamento ?? "";
  inputHoras.value = product?.horas ?? "";
  modalTitle.textContent = product ? "Editar producto" : "Nuevo producto";

  if (fotoDataUrl) {
    fotoPreview.src = fotoDataUrl;
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
  const settings = getSettings();
  const gramos = Number(inputGramos.value) || 0;
  const horas = Number(inputHoras.value) || 0;
  const precioVenta = Number(inputPrecio.value) || 0;
  const { costoFilamento, costoLuz, costoDesgaste, costoTotal } = calcularCosto(
    { gramos, horas },
    settings
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

function renderProductos() {
  const products = getProducts();
  const settings = getSettings();

  emptyState.hidden = products.length > 0;
  grid.innerHTML = "";

  products.forEach((product) => {
    const { costoTotal } = calcularCosto(
      { gramos: product.gramosFilamento, horas: product.horas },
      settings
    );
    const { margen, margenPct } = calcularMargen(product.precioVenta, costoTotal);
    const esPositivo = margen >= 0;

    const card = document.createElement("article");
    card.className = "producto-card";
    card.innerHTML = `
      ${
        product.fotoDataUrl
          ? `<img class="producto-foto" src="${product.fotoDataUrl}" alt="${product.nombre}">`
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
    card.querySelector(".btn-eliminar").addEventListener("click", () => {
      if (confirm(`¿Eliminar "${product.nombre}"?`)) {
        deleteProduct(product.id);
        renderProductos();
      }
    });

    grid.appendChild(card);
  });
}

export function initProductosPanel() {
  document.getElementById("btn-nuevo-producto").addEventListener("click", () => openModal());
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  inputFoto.addEventListener("change", () => {
    const file = inputFoto.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fotoDataUrl = reader.result;
      fotoPreview.src = fotoDataUrl;
      fotoPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  [inputPrecio, inputGramos, inputHoras].forEach((input) =>
    input.addEventListener("input", updateDesglosePreview)
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const product = {
      id: inputId.value || generateId(),
      nombre: inputNombre.value.trim(),
      fotoDataUrl,
      precioVenta: Number(inputPrecio.value) || 0,
      gramosFilamento: Number(inputGramos.value) || 0,
      horas: Number(inputHoras.value) || 0,
      creadoEn: Date.now(),
    };
    upsertProduct(product);
    closeModal();
    renderProductos();
  });

  renderProductos();
}

export function refreshProductos() {
  renderProductos();
}
