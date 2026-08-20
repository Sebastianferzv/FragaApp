import { initAjustesPanel } from "./ajustes.js";
import { initProductosPanel, refreshProductos } from "./productos.js";
import { initVentasPanel, refreshVentas } from "./ventas.js";
import { initHistorialPanel, refreshHistorial } from "./historial.js";

const refrescadores = {
  productos: refreshProductos,
  ventas: refreshVentas,
  historial: refreshHistorial,
};

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");

      refrescadores[btn.dataset.tab]?.();
    });
  });
}

(async function init() {
  initTabs();
  await initProductosPanel();
  await initVentasPanel();
  await initHistorialPanel();
  await initAjustesPanel(() => refreshProductos());
})();
