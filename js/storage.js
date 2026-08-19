const SETTINGS_KEY = "frag_settings";
const PRODUCTS_KEY = "frag_products";

const DEFAULT_SETTINGS = {
  precioKiloFilamento: 0,
  consumoKw: 0,
  precioKwh: 0,
  desgastePorHora: 100,
};

export function getSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getProducts() {
  const raw = localStorage.getItem(PRODUCTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function upsertProduct(product) {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }
  saveProducts(products);
  return products;
}

export function deleteProduct(id) {
  const products = getProducts().filter((p) => p.id !== id);
  saveProducts(products);
  return products;
}

export function generateId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}
