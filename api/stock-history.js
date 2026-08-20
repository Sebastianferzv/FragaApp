import { sql, ensureSchema } from "./_lib/db.js";

function toCamel(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productoNombre: row.producto_nombre,
    color: row.color,
    cantidad: Number(row.cantidad),
    origen: row.origen,
    registradoEn: row.registrado_en,
  };
}

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method !== "GET") {
    res.status(405).json({ error: "Metodo no permitido" });
    return;
  }

  const rows = await sql`SELECT * FROM stock_history ORDER BY registrado_en DESC`;
  res.status(200).json(rows.map(toCamel));
}
