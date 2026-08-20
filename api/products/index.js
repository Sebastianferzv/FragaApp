import { sql, ensureSchema, getAllProductColors, replaceProductColors } from "../_lib/db.js";

function toCamel(row, colores = []) {
  return {
    id: row.id,
    nombre: row.nombre,
    fotoUrl: row.foto_url,
    precioVenta: Number(row.precio_venta),
    gramosFilamento: Number(row.gramos_filamento),
    horas: Number(row.horas),
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
      VALUES (${nombre}, ${fotoUrl || null}, ${precioVenta || 0}, ${gramosFilamento || 0}, ${horas || 0})
      RETURNING *
    `;
    const product = rows[0];
    await replaceProductColors(product.id, colores);
    const colorRows = await sql`SELECT id, color, stock FROM product_colors WHERE product_id = ${product.id} ORDER BY id ASC`;
    res.status(201).json(toCamel(product, colorRows));
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
