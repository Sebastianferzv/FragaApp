import { sql, ensureSchema, addProductStock } from "../_lib/db.js";

function toCamel(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productoNombre: row.producto_nombre,
    color: row.color,
    precioVenta: Number(row.precio_venta),
    comentario: row.comentario,
    vendidoEn: row.vendido_en,
    pagado: row.pagado,
    motivoRebaja: row.motivo_rebaja,
  };
}

export default async function handler(req, res) {
  await ensureSchema();

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id invalido" });
    return;
  }

  const existente = await sql`SELECT * FROM sales WHERE id = ${id}`;
  const venta = existente[0];
  if (!venta) {
    res.status(404).json({ error: "Venta no encontrada" });
    return;
  }

  if (req.method === "PUT") {
    const body = req.body || {};

    const finalVendidoEn = body.vendidoEn ? new Date(`${body.vendidoEn}T12:00:00Z`) : venta.vendido_en;
    const finalComentario = "comentario" in body ? (body.comentario || "").trim() || null : venta.comentario;
    const finalPagado = "pagado" in body ? !!body.pagado : venta.pagado;

    const finalPrecio = "precioVenta" in body ? Number(body.precioVenta) || 0 : Number(venta.precio_venta);

    const rows = await sql`
      UPDATE sales SET
        vendido_en = ${finalVendidoEn},
        comentario = ${finalComentario},
        pagado = ${finalPagado},
        precio_venta = ${finalPrecio}
      WHERE id = ${id}
      RETURNING *
    `;
    res.status(200).json(toCamel(rows[0]));
    return;
  }

  if (req.method === "DELETE") {
    if (venta.product_id) {
      await addProductStock(venta.product_id, venta.color, 1);
    }
    await sql`DELETE FROM sales WHERE id = ${id}`;
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
