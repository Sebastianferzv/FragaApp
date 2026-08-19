import { initAjustesPanel } from "./ajustes.js";
import { initProductosPanel, refreshProductos } from "./productos.js";
import { checkAuth, login, logout } from "./storage.js";

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const loginForm = document.getElementById("login-form");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const btnLogout = document.getElementById("btn-logout");

let appStarted = false;

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

function showLogin() {
  loginScreen.hidden = false;
  appShell.hidden = true;
}

function showApp() {
  loginScreen.hidden = true;
  appShell.hidden = false;
}

async function startApp() {
  showApp();
  if (appStarted) return;
  appStarted = true;
  initTabs();
  await initProductosPanel();
  await initAjustesPanel(() => refreshProductos());
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  try {
    await login(loginPassword.value);
    loginPassword.value = "";
    await startApp();
  } catch (err) {
    loginError.textContent = "Contraseña incorrecta.";
    loginError.hidden = false;
  }
});

btnLogout.addEventListener("click", async () => {
  await logout();
  showLogin();
});

(async function init() {
  const authenticated = await checkAuth();
  if (authenticated) {
    await startApp();
  } else {
    showLogin();
  }
})();
