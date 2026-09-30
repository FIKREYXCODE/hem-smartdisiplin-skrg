import { addEvent, bucket, database, getCase, toAttachment } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import type { Role } from "@/lib/school";
import { hasActiveRole, requireUser } from "@/lib/auth";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const maxImageBytes = 12 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/heic": "heic", "image/heif": "heif",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params;
  let form: FormData;
  try { form = await request.formData(); }
  catch { return apiJson({ error: "Fail gambar tidak dapat dibaca." }, request, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) return apiJson({ error: "Gambar diperlukan." }, request, { status: 400 });
  if (!allowedTypes.has(file.type)) return apiJson({ error: "Format gambar tidak disokong. Gunakan JPG, PNG, WebP, GIF, HEIC atau HEIF." }, request, { status: 415 });
  if (!file.size || file.size > maxImageBytes) return apiJson({ error: "Setiap gambar mestilah tidak melebihi 12 MB." }, request, { status: 413 });

  try {
    const user = await requireUser(request); const actorId = user.id; const actor = user.name; const role = (hasActiveRole(user, "discipline", request) ? "Guru Disiplin" : "Pelapor") as Role;
    const current = await getCase(caseId);
    if (!current) return apiJson({ error: "Kes tidak ditemui." }, request, { status: 404 });
    if ((current.reporterId !== actorId || !hasActiveRole(user,"reporter",request)) && !hasActiveRole(user, "discipline",request)) return apiJson({ error: "Gambar hanya boleh ditambah oleh pelapor atau Guru Disiplin." }, request, { status: 403 });
    if (current.deletedAt) return apiJson({ error: "Gambar tidak boleh ditambah pada rekod yang dipadam." }, request, { status: 409 });

    const attachmentId = crypto.randomUUID();
    const objectKey = `cases/${caseId}/${attachmentId}.${extensions[file.type]}`;
    const now = new Date().toISOString();
    await bucket().put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
    try {
      await database().prepare("INSERT INTO case_attachments (id, case_id, object_key, filename, content_type, size, uploaded_by_id, uploaded_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(attachmentId, caseId, objectKey, file.name.slice(0, 240) || `gambar.${extensions[file.type]}`, file.type, file.size, actorId, actor, now).run();
    } catch (error) {
      await bucket().delete(objectKey);
      throw error;
    }
    await addEvent(caseId, actorId, actor, role, "lampiran", `Gambar ${file.name.slice(0, 120) || "lampiran"} ditambah.`, null, { attachmentId, filename: file.name, size: file.size });
    const row = await database().prepare("SELECT id, filename, content_type, size, uploaded_by_name, created_at FROM case_attachments WHERE id = ?").bind(attachmentId).first<{ id: string; filename: string; content_type: string; size: number; uploaded_by_name: string; created_at: string }>();
    return apiJson({ attachment: row ? toAttachment(row) : null, record: await getCase(caseId) }, request, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    console.error("Attachment upload failed", error);
    return apiJson({ error: "Gambar belum dapat dimuat naik. Sila cuba lagi." }, request, { status: 503 });
  }
}
