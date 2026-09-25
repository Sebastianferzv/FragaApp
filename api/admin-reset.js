import { sql, ensureSchema } from "./_lib/db.js";

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method !== "POST" || req.query.confirm !== "SI") {
    res.status(400).json({ error: "Confirmacion requerida" });
    return;
  }

  await sql`DELETE FROM product_colors`;
  await sql`DELETE FROM sales`;
  await sql`DELETE FROM stock_history`;

  res.status(200).json({ ok: true });
}
