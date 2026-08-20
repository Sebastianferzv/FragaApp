import { ensureSchema, getProductById, addProductStock, logStockHistory } from "../../_lib/db.js";

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo no permitido" });
    return;
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Id invalido" });
    return;
  }

  const { color, cantidad } = req.body || {};
  const nombreColor = (color || "").trim();
  const cantidadNum = Math.max(0, Math.trunc(Number(cantidad) || 0));

  if (!nombreColor || cantidadNum <= 0) {
    res.status(400).json({ error: "Falta el color o la cantidad a agregar" });
    return;
  }

  const product = await getProductById(id);
  if (!product) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  await addProductStock(id, nombreColor, cantidadNum);
  await logStockHistory(id, product.nombre, nombreColor, cantidadNum, "agregado");

  res.status(200).json({ ok: true });
}
