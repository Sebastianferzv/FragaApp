import { sql, ensureSchema } from "../_lib/db.js";

function toCamel(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    fotoUrl: row.foto_url,
    precioVenta: Number(row.precio_venta),
    gramosFilamento: Number(row.gramos_filamento),
    horas: Number(row.horas),
    creadoEn: row.creado_en,
  };
}

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM products ORDER BY id ASC`;
    res.status(200).json(rows.map(toCamel));
    return;
  }

  if (req.method === "POST") {
    const { nombre, fotoUrl, precioVenta, gramosFilamento, horas } = req.body || {};
    if (!nombre) {
      res.status(400).json({ error: "Falta el nombre del producto" });
      return;
    }
    const rows = await sql`
      INSERT INTO products (nombre, foto_url, precio_venta, gramos_filamento, horas)
      VALUES (${nombre}, ${fotoUrl || null}, ${precioVenta || 0}, ${gramosFilamento || 0}, ${horas || 0})
      RETURNING *
    `;
    res.status(201).json(toCamel(rows[0]));
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
