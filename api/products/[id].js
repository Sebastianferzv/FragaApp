import { sql, ensureSchema } from "../_lib/db.js";

function numOrNull(value) {
  return value === null || value === undefined || value === "" ? null : Number(value);
}

function toCamel(row, colores = []) {
  return {
    id: row.id,
    nombre: row.nombre,
    fotoUrl: row.foto_url,
    precioVenta: numOrNull(row.precio_venta),
    gramosFilamento: numOrNull(row.gramos_filamento),
    horas: numOrNull(row.horas),
    descriptor: row.descriptor,
    creadoEn: row.creado_en,
    colores: colores.map((c) => ({ id: c.id, color: c.color, stock: c.stock })),
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
    const { nombre, fotoUrl, precioVenta, gramosFilamento, horas, descriptor } = req.body || {};
    const rows = await sql`
      UPDATE products SET
        nombre = ${nombre},
        foto_url = ${fotoUrl || null},
        precio_venta = ${numOrNull(precioVenta)},
        gramos_filamento = ${numOrNull(gramosFilamento)},
        horas = ${numOrNull(horas)},
        descriptor = ${(descriptor || "").trim() || null}
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows[0]) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    const colorRows = await sql`SELECT id, color, stock FROM product_colors WHERE product_id = ${id} ORDER BY id ASC`;
    res.status(200).json(toCamel(rows[0], colorRows));
    return;
  }

  if (req.method === "DELETE") {
    await sql`DELETE FROM products WHERE id = ${id}`;
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
