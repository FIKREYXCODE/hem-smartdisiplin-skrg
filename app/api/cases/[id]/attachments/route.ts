import { addEvent, bucket, database, getCase, toAttachment } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import type { Role } from "@/lib/school";
import { hasActiveRole, requireUser } from "@/lib/auth";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm", "video/mpeg", "video/x-m4v"]);
const allowedTypes = new Set([...imageTypes, ...videoTypes]);
const maxImageBytes = 12 * 1024 * 1024;
const maxVideoBytes = 80 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/heic": "heic", "image/heif": "heif",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
  "video/mpeg": "mpeg", "video/x-m4v": "m4v",
};
const filenameTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mpeg: "video/mpeg", mpg: "video/mpeg", m4v: "video/x-m4v" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: caseId } = await params;
  let form: FormData;
  try { form = await request.formData(); }
  catch { return apiJson({ error: "Fail lampiran tidak dapat dibaca." }, request, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) return apiJson({ error: "Fail gambar atau video diperlukan." }, request, { status: 400 });
  const filenameExtension = file.name.split(".").pop()?.toLowerCase() || "";
  const contentType = allowedTypes.has(file.type) ? file.type : filenameTypes[filenameExtension];
  if (!contentType) return apiJson({ error: "Format tidak disokong. Gunakan gambar JPG, PNG, WebP, GIF, HEIC/HEIF atau video MP4, MOV, WebM, MPEG/M4V." }, request, { status: 415 });
  const isVideo = videoTypes.has(contentType);
  const sizeLimit = isVideo ? maxVideoBytes : maxImageBytes;
  if (!file.size || file.size > sizeLimit) return apiJson({ error: isVideo ? "Setiap video mestilah tidak melebihi 80 MB." : "Setiap gambar mestilah tidak melebihi 12 MB." }, request, { status: 413 });

  try {
    const user = await requireUser(request); const actorId = user.id; const actor = user.name; const role = (hasActiveRole(user, "school_admin", request) ? "Pentadbir Sekolah" : hasActiveRole(user, "discipline", request) ? "Guru Disiplin" : "Pelapor") as Role;
    const current = await getCase(caseId);
    if (!current) return apiJson({ error: "Kes tidak ditemui." }, request, { status: 404 });
    const isOwnReporter = current.reporterId === actorId && hasActiveRole(user, "reporter", request);
    if (!isOwnReporter && !hasActiveRole(user, "discipline", request) && !hasActiveRole(user, "school_admin", request)) return apiJson({ error: "Lampiran hanya boleh ditambah oleh Guru Pelapor kes ini, Guru Disiplin atau Pentadbir Sekolah." }, request, { status: 403 });
    if (current.deletedAt) return apiJson({ error: "Lampiran tidak boleh ditambah pada rekod yang dipadam." }, request, { status: 409 });

    const attachmentId = crypto.randomUUID();
    const objectKey = `cases/${caseId}/${attachmentId}.${extensions[contentType]}`;
    const now = new Date().toISOString();
    await bucket().put(objectKey, file.stream(), { httpMetadata: { contentType } });
    try {
      await database().prepare("INSERT INTO case_attachments (id, case_id, object_key, filename, content_type, size, uploaded_by_id, uploaded_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(attachmentId, caseId, objectKey, file.name.slice(0, 240) || `lampiran.${extensions[contentType]}`, contentType, file.size, actorId, actor, now).run();
    } catch (error) {
      await bucket().delete(objectKey);
      throw error;
    }
    await addEvent(caseId, actorId, actor, role, "lampiran", `${isVideo ? "Video" : "Gambar"} ${file.name.slice(0, 120) || "lampiran"} ditambah.`, null, { attachmentId, filename: file.name, contentType, size: file.size });
    const row = await database().prepare("SELECT id, filename, content_type, size, uploaded_by_name, created_at FROM case_attachments WHERE id = ?").bind(attachmentId).first<{ id: string; filename: string; content_type: string; size: number; uploaded_by_name: string; created_at: string }>();
    return apiJson({ attachment: row ? toAttachment(row) : null, record: await getCase(caseId) }, request, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    console.error("Attachment upload failed", error);
    return apiJson({ error: "Lampiran belum dapat dimuat naik. Sila cuba lagi." }, request, { status: 503 });
  }
}
