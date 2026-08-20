import { sql, ensureSchema } from "../_lib/db.js";

function toCamel(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productoNombre: row.producto_nombre,
    color: row.color,
    precioVenta: Number(row.precio_venta),
    comentario: row.comentario,
    vendidoEn: row.vendido_en,
    editado: row.editado,
  };
}

export default async function handler(req, res) {
  await ensureSchema();

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id invalido" });
    return;
  }

  if (req.method !== "PUT") {
    res.status(405).json({ error: "Metodo no permitido" });
    return;
  }

  const existente = await sql`SELECT * FROM sales WHERE id = ${id}`;
  const venta = existente[0];
  if (!venta) {
    res.status(404).json({ error: "Venta no encontrada" });
    return;
  }

  const { precioVenta, comentario } = req.body || {};
  const nuevoPrecio = Number(precioVenta);
  const comentarioTrim = (comentario || "").trim();
  const cambioPrecio = nuevoPrecio !== Number(venta.precio_venta);

  if (cambioPrecio && !comentarioTrim) {
    res.status(400).json({ error: "Debes indicar un comentario con el motivo de la rebaja" });
    return;
  }

  const rows = await sql`
    UPDATE sales SET
      precio_venta = ${nuevoPrecio || 0},
      comentario = ${comentarioTrim || null},
      editado = true
    WHERE id = ${id}
    RETURNING *
  `;
  res.status(200).json(toCamel(rows[0]));
}
