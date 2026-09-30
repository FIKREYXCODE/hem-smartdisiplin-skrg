import { bucket, database } from "@/lib/cases-db";
import { apiJson, apiOptions, corsHeaders } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { canViewCase } from "@/lib/authorization";
import { getCase } from "@/lib/cases-db";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser(request);
    const attachment = await database().prepare("SELECT case_id, object_key, filename, content_type FROM case_attachments WHERE id = ?").bind(id).first<{ case_id:string; object_key: string; filename: string; content_type: string }>();
    if (!attachment) return apiJson({ error: "Gambar tidak ditemui." }, request, { status: 404 });
    const record = await getCase(attachment.case_id); if (!record || !canViewCase(user, record)) return apiJson({ error: "Akses gambar ditolak." }, request, { status: 403 });
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
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    console.error("Attachment load failed", error);
    return apiJson({ error: "Gambar tidak tersedia sekarang." }, request, { status: 503 });
  }
}
