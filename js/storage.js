const JSON_HEADERS = { "Content-Type": "application/json" };

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });

  if (response.status === 401) {
    const error = new Error("No autenticado");
    error.code = "UNAUTHORIZED";
    throw error;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function login(password) {
  return request("/api/auth/login", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function checkAuth() {
  const result = await request("/api/auth/status");
  return result.authenticated;
}

export async function getSettings() {
  return request("/api/settings");
}

export async function saveSettings(settings) {
  return request("/api/settings", {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(settings),
  });
}

export async function getProducts() {
  return request("/api/products");
}

export async function createProduct(product) {
  return request("/api/products", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id, product) {
  return request(`/api/products/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id) {
  return request(`/api/products/${id}`, { method: "DELETE" });
}
