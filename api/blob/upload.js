import { handleUpload } from "@vercel/blob/client";
import { isAuthenticated } from "../_lib/auth.js";

export default async function handler(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!isAuthenticated(request.headers.get("cookie"))) {
          throw new Error("No autenticado");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
