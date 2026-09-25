import { sql, ensureSchema } from "./_lib/db.js";

function toCamel(row) {
  return {
    precioKiloFilamento: Number(row.precio_kilo_filamento),
    consumoKw: Number(row.consumo_kw),
    precioKwh: Number(row.precio_kwh),
    desgastePorHora: Number(row.desgaste_por_hora),
    ivaPct: Number(row.iva_pct),
  };
}

export default async function handler(req, res) {
  await ensureSchema();

  if (req.method === "GET") {
    await sql`INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
    const rows = await sql`SELECT * FROM settings WHERE id = 1`;
    res.status(200).json(toCamel(rows[0]));
    return;
  }

  if (req.method === "PUT") {
    const { precioKiloFilamento, consumoKw, precioKwh, desgastePorHora, ivaPct } = req.body || {};
    const rows = await sql`
      INSERT INTO settings (id, precio_kilo_filamento, consumo_kw, precio_kwh, desgaste_por_hora, iva_pct)
      VALUES (1, ${precioKiloFilamento || 0}, ${consumoKw || 0}, ${precioKwh || 0}, ${desgastePorHora || 0}, ${ivaPct ?? 19})
      ON CONFLICT (id) DO UPDATE SET
        precio_kilo_filamento = EXCLUDED.precio_kilo_filamento,
        consumo_kw = EXCLUDED.consumo_kw,
        precio_kwh = EXCLUDED.precio_kwh,
        desgaste_por_hora = EXCLUDED.desgaste_por_hora,
        iva_pct = EXCLUDED.iva_pct
      RETURNING *
    `;
    res.status(200).json(toCamel(rows[0]));
    return;
  }

  res.status(405).json({ error: "Metodo no permitido" });
}
