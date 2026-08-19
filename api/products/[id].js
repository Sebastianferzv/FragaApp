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

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id invalido" });
    return;
  }

  if (req.method === "PUT") {
    const { nombre, fotoUrl, precioVenta, gramosFilamento, horas } = req.body || {};
    const rows = await sql`
      UPDATE products SET
        nombre = ${nombre},
        foto_url = ${fotoUrl || null},
        precio_venta = ${precioVenta || 0},
        gramos_filamento = ${gramosFilamento || 0},
        horas = ${horas || 0}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows[0]) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    res.status(200).json(toCamel(rows[0]));
    return;
  }

  if (req.method === "DELETE") {
    await sql`DELETE FROM products WHERE id = ${id}`;
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
