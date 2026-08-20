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

  schemaReady = true;
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
