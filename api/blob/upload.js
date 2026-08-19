import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo no permitido" });
    return;
  }

  try {
    const { filename, dataUrl } = req.body || {};
    const match = /^data:(image\/[a-z.+-]+);base64,(.*)$/i.exec(dataUrl || "");
    if (!match) {
      res.status(400).json({ error: "La imagen no tiene un formato valido" });
      return;
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    const blob = await put(filename || "foto.jpg", buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });

    res.status(200).json({ url: blob.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
