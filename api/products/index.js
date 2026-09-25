import { sql, ensureSchema, getAllProductColors, replaceProductColors, logStockHistory } from "../_lib/db.js";

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
    creadoEn: row.creado_en,
    colores: colores.map((c) => ({ id: c.id, color: c.color, stock: c.stock })),
  };
}

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === "GET") {
    const [rows, colorRows] = await Promise.all([
      sql`SELECT * FROM products ORDER BY id ASC`,
      getAllProductColors(),
    ]);
    const colorsByProduct = new Map();
    for (const c of colorRows) {
      if (!colorsByProduct.has(c.product_id)) colorsByProduct.set(c.product_id, []);
      colorsByProduct.get(c.product_id).push(c);
    }
    res.status(200).json(rows.map((row) => toCamel(row, colorsByProduct.get(row.id) || [])));
    return;
  }

  if (req.method === "POST") {
    const { nombre, fotoUrl, precioVenta, gramosFilamento, horas, colores } = req.body || {};
    if (!nombre) {
      res.status(400).json({ error: "Falta el nombre del producto" });
      return;
    }
    const rows = await sql`
      INSERT INTO products (nombre, foto_url, precio_venta, gramos_filamento, horas)
      VALUES (${nombre}, ${fotoUrl || null}, ${numOrNull(precioVenta)}, ${numOrNull(gramosFilamento)}, ${numOrNull(horas)})
      RETURNING *
    `;
    const product = rows[0];
    await replaceProductColors(product.id, colores);
    for (const item of Array.isArray(colores) ? colores : []) {
      const color = (item?.color || "").trim();
      if (!color) continue;
      const stock = Math.max(0, Math.trunc(Number(item?.stock) || 0));
      await logStockHistory(product.id, product.nombre, color, stock, "creacion");
    }
    const colorRows = await sql`SELECT id, color, stock FROM product_colors WHERE product_id = ${product.id} ORDER BY id ASC`;
    res.status(201).json(toCamel(product, colorRows));
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
