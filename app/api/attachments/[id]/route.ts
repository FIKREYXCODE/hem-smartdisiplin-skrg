import { bucket, database } from "@/lib/cases-db";
import { apiJson, apiOptions, corsHeaders } from "@/lib/api-response";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const attachment = await database().prepare("SELECT object_key, filename, content_type FROM case_attachments WHERE id = ?").bind(id).first<{ object_key: string; filename: string; content_type: string }>();
    if (!attachment) return apiJson({ error: "Gambar tidak ditemui." }, request, { status: 404 });
    const object = await bucket().get(attachment.object_key);
    if (!object) return apiJson({ error: "Fail gambar tidak ditemui." }, request, { status: 404 });
    const safeFilename = attachment.filename.replace(/["\r\n]/g, "_");
    return new Response(object.body, { headers: {
      ...corsHeaders(request),
      "Content-Type": attachment.content_type,
      "Content-Length": String(object.size),
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    console.error("Attachment load failed", error);
    return apiJson({ error: "Gambar tidak tersedia sekarang." }, request, { status: 503 });
  }
}
