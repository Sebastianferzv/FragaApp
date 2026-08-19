import { initAjustesPanel } from "./ajustes.js";
import { initProductosPanel, refreshProductos } from "./productos.js";

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

initTabs();
initProductosPanel();
initAjustesPanel(() => refreshProductos());
