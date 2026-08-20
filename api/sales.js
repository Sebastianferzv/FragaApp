import { sql, ensureSchema, getProductById, sellOneUnit } from "./_lib/db.js";

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

function parseFecha(fecha) {
  if (!fecha) return new Date();
  return new Date(`${fecha}T12:00:00Z`);
}

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === "GET") {
    const rows = await sql`SELECT * FROM sales ORDER BY vendido_en DESC`;
    res.status(200).json(rows.map(toCamel));
    return;
  }

  if (req.method === "POST") {
    const { productId, color, comentario, fecha, pagado } = req.body || {};
    const id = Number(productId);
    const nombreColor = (color || "").trim();

    if (!Number.isInteger(id) || !nombreColor) {
      res.status(400).json({ error: "Falta el producto o el color" });
      return;
    }

    const product = await getProductById(id);
    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const updatedColor = await sellOneUnit(id, nombreColor);
    if (!updatedColor) {
      res.status(400).json({ error: "Sin stock disponible para ese color" });
      return;
    }

    const rows = await sql`
      INSERT INTO sales (product_id, producto_nombre, color, precio_venta, comentario, vendido_en, pagado)
      VALUES (${id}, ${product.nombre}, ${nombreColor}, ${product.precio_venta}, ${comentario || null}, ${parseFecha(fecha)}, ${!!pagado})
      RETURNING *
    `;
    res.status(201).json(toCamel(rows[0]));
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
