import { apiJson, corsHeaders } from "@/lib/api-response";
import { bucket, database } from "@/lib/cases-db";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const row = await database().prepare("SELECT header_image_key, header_image_content_type FROM site_branding WHERE id = 'default'").first<{ header_image_key: string | null; header_image_content_type: string | null }>();
    if (!row?.header_image_key) return apiJson({ error: "Gambar header belum ditetapkan." }, request, { status: 404 });
    const object = await bucket().get(row.header_image_key);
    if (!object) return apiJson({ error: "Gambar header tidak ditemui." }, request, { status: 404 });
    return new Response(object.body, { headers: { ...corsHeaders(request), "Content-Type": row.header_image_content_type || "image/webp", "Content-Length": String(object.size), "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return apiJson({ error: "Gambar header tidak tersedia." }, request, { status: 404 });
  }
}
