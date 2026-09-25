const overlay = document.getElementById("confirm-overlay");
const titleEl = document.getElementById("confirm-title");
const messageEl = document.getElementById("confirm-message");
const btnAccept = document.getElementById("confirm-accept");
const btnCancel = document.getElementById("confirm-cancel");
const btnClose = document.getElementById("confirm-close");

let resolverActual = null;

function cerrar(resultado) {
  overlay.hidden = true;
  if (resolverActual) {
    resolverActual(resultado);
    resolverActual = null;
  }
}

btnAccept.addEventListener("click", () => cerrar(true));
btnCancel.addEventListener("click", () => cerrar(false));
btnClose.addEventListener("click", () => cerrar(false));
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) cerrar(false);
});

export function confirmarAccion({ titulo = "Confirmar", mensaje = "", textoConfirmar = "Confirmar" } = {}) {
  titleEl.textContent = titulo;
  messageEl.textContent = mensaje;
  btnAccept.textContent = textoConfirmar;
  overlay.hidden = false;

  return new Promise((resolve) => {
    resolverActual = resolve;
  });
}
