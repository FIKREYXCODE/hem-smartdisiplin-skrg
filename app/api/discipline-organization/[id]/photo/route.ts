import { apiJson, apiOptions, corsHeaders } from "@/lib/api-response";
import { bucket, database } from "@/lib/cases-db";
import { auditAccess, isSuperAdmin, requireUser } from "@/lib/auth";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await requireUser(request);
    const member = await database().prepare(`SELECT image_key, image_content_type FROM discipline_organization_members WHERE id = ?${isSuperAdmin(user) ? "" : " AND active = 1"}`).bind(id).first<{ image_key: string | null; image_content_type: string | null }>();
    if (!member?.image_key) return apiJson({ error: "Gambar profil belum tersedia." }, request, { status: 404 });
    const object = await bucket().get(member.image_key);
    if (!object) return apiJson({ error: "Fail gambar tidak ditemui." }, request, { status: 404 });
    return new Response(object.body, { headers: { ...corsHeaders(request), "Content-Type": member.image_content_type || "image/webp", "Content-Length": String(object.size), "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    console.error("Organization photo load failed", error);
    return apiJson({ error: "Gambar profil tidak tersedia sekarang." }, request, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireUser>>;
  try {
    actor = await requireUser(request);
    if (!isSuperAdmin(actor)) return apiJson({ error: "Akses Super Admin diperlukan." }, request, { status: 403 });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    return apiJson({ error: "Pengesahan akses gagal." }, request, { status: 503 });
  }
  const { id } = await params;
  let form: FormData;
  try { form = await request.formData(); }
  catch { return apiJson({ error: "Fail gambar tidak dapat dibaca." }, request, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || !file.size || file.size > 4 * 1024 * 1024) return apiJson({ error: "Gunakan gambar JPG, PNG atau WebP sehingga 4 MB." }, request, { status: 400 });
  try {
    const member = await database().prepare("SELECT image_key FROM discipline_organization_members WHERE id = ?").bind(id).first<{ image_key: string | null }>();
    if (!member) return apiJson({ error: "Pegawai tidak ditemui." }, request, { status: 404 });
    const objectKey = `discipline-organization/${id}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp"}`;
    await bucket().put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
    try { await database().prepare("UPDATE discipline_organization_members SET image_key = ?, image_content_type = ?, updated_at = ? WHERE id = ?").bind(objectKey, file.type, new Date().toISOString(), id).run(); }
    catch (error) { await bucket().delete(objectKey); throw error; }
    if (member.image_key && member.image_key !== objectKey) {
      const reference = await database().prepare("SELECT id FROM discipline_organization_members WHERE image_key = ? AND id <> ? LIMIT 1").bind(member.image_key, id).first();
      if (!reference) await bucket().delete(member.image_key);
    }
    await auditAccess(actor, "organization_photo_uploaded", id);
    return apiJson({ ok: true }, request);
  } catch (error) {
    console.error("Organization photo upload failed", error);
    return apiJson({ error: "Gambar profil belum dapat disimpan." }, request, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof requireUser>>;
  try {
    actor = await requireUser(request);
    if (!isSuperAdmin(actor)) return apiJson({ error: "Akses Super Admin diperlukan." }, request, { status: 403 });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    return apiJson({ error: "Pengesahan akses gagal." }, request, { status: 503 });
  }
  const { id } = await params;
  try {
    const member = await database().prepare("SELECT image_key FROM discipline_organization_members WHERE id = ?").bind(id).first<{ image_key: string | null }>();
    if (!member) return apiJson({ error: "Pegawai tidak ditemui." }, request, { status: 404 });
    await database().prepare("UPDATE discipline_organization_members SET image_key = NULL, image_content_type = NULL, updated_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run();
    if (member.image_key) {
      const reference = await database().prepare("SELECT id FROM discipline_organization_members WHERE image_key = ? LIMIT 1").bind(member.image_key).first();
      if (!reference) await bucket().delete(member.image_key);
    }
    await auditAccess(actor, "organization_photo_deleted", id);
    return apiJson({ ok: true }, request);
  } catch (error) {
    console.error("Organization photo delete failed", error);
    return apiJson({ error: "Gambar profil belum dapat dipadam." }, request, { status: 503 });
  }
}
