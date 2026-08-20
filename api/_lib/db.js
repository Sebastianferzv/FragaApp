import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      precio_kilo_filamento NUMERIC NOT NULL DEFAULT 0,
      consumo_kw NUMERIC NOT NULL DEFAULT 0,
      precio_kwh NUMERIC NOT NULL DEFAULT 0,
      desgaste_por_hora NUMERIC NOT NULL DEFAULT 100
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      nombre TEXT NOT NULL,
      foto_url TEXT,
      precio_venta NUMERIC NOT NULL,
      gramos_filamento NUMERIC NOT NULL,
      horas NUMERIC NOT NULL,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS product_colors (
      id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      color TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      producto_nombre TEXT NOT NULL,
      color TEXT NOT NULL,
      precio_venta NUMERIC NOT NULL,
      comentario TEXT,
      vendido_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      producto_nombre TEXT NOT NULL,
      color TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      origen TEXT NOT NULL,
      registrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  schemaReady = true;
}

export async function getProductById(id) {
  const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getAllProductColors() {
  return sql`SELECT id, product_id, color, stock FROM product_colors ORDER BY id ASC`;
}

export async function replaceProductColors(productId, colores) {
  await sql`DELETE FROM product_colors WHERE product_id = ${productId}`;

  for (const item of Array.isArray(colores) ? colores : []) {
    const color = (item?.color || "").trim();
    if (!color) continue;
    const stock = Math.max(0, Math.trunc(Number(item?.stock) || 0));
    await sql`INSERT INTO product_colors (product_id, color, stock) VALUES (${productId}, ${color}, ${stock})`;
  }
}

export async function addProductStock(productId, color, cantidad) {
  const trimmedColor = (color || "").trim();
  const existing = await sql`
    SELECT id FROM product_colors
    WHERE product_id = ${productId} AND lower(color) = lower(${trimmedColor})
  `;

  if (existing[0]) {
    await sql`UPDATE product_colors SET stock = stock + ${cantidad} WHERE id = ${existing[0].id}`;
  } else {
    await sql`INSERT INTO product_colors (product_id, color, stock) VALUES (${productId}, ${trimmedColor}, ${cantidad})`;
  }
}

export async function sellOneUnit(productId, color) {
  const rows = await sql`
    UPDATE product_colors SET stock = stock - 1
    WHERE product_id = ${productId} AND lower(color) = lower(${color}) AND stock > 0
    RETURNING *
  `;
  return rows[0] || null;
}

export async function logStockHistory(productId, productoNombre, color, cantidad, origen) {
  await sql`
    INSERT INTO stock_history (product_id, producto_nombre, color, cantidad, origen)
    VALUES (${productId}, ${productoNombre}, ${color}, ${cantidad}, ${origen})
  `;
}
