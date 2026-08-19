import { createSessionToken, buildSessionCookie } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo no permitido" });
    return;
  }

  if (!process.env.APP_PASSWORD) {
    res.status(500).json({ error: "Falta configurar APP_PASSWORD en Vercel" });
    return;
  }

  const { password } = req.body || {};
  if (password !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: "Contrasena incorrecta" });
    return;
  }

  res.setHeader("Set-Cookie", buildSessionCookie(createSessionToken()));
  res.status(200).json({ ok: true });
}
