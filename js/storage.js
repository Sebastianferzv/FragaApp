const JSON_HEADERS = { "Content-Type": "application/json" };

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
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

export async function addStock(productId, payload) {
  return request(`/api/products/${productId}/stock`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function getSales() {
  return request("/api/sales");
}

export async function createSale(payload) {
  return request("/api/sales", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function getStockHistory() {
  return request("/api/stock-history");
}

export async function updateSale(id, payload) {
  return request(`/api/sales/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export async function deleteSale(id) {
  return request(`/api/sales/${id}`, { method: "DELETE" });
}
