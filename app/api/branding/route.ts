import { apiJson, apiOptions } from "@/lib/api-response";
import { bucket, database } from "@/lib/cases-db";
import { auditAccess, isSuperAdmin, requireUser } from "@/lib/auth";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

type BrandingRow = { header_image_key: string | null; updated_at: string };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  try {
    const row = await database().prepare("SELECT header_image_key, updated_at FROM site_branding WHERE id = 'default'").first<BrandingRow>();
    return apiJson({ hasHeaderImage: Boolean(row?.header_image_key), updatedAt: row?.updated_at || null }, request);
  } catch {
    return apiJson({ hasHeaderImage: false, updatedAt: null }, request);
  }
}

export async function POST(request: Request) {
  let actor: Awaited<ReturnType<typeof requireUser>>;
  try {
    actor = await requireUser(request);
    if (!isSuperAdmin(actor) && actor.activeRole !== "school_admin") return apiJson({ error: "Hanya Pentadbir atau System Admin boleh menukar gambar header." }, request, { status: 403 });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi Pentadbir tidak sah." }, request, { status: error.status });
    return apiJson({ error: "Pengesahan akses gagal." }, request, { status: 503 });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return apiJson({ error: "Fail gambar tidak dapat dibaca." }, request, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || !file.size || file.size > 8 * 1024 * 1024) return apiJson({ error: "Gunakan gambar JPG, PNG atau WebP sehingga 8 MB." }, request, { status: 400 });
  try {
    const objectKey = `site-branding/header/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp"}`;
    await bucket().put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
    const now = new Date().toISOString();
    try {
      await database().prepare("INSERT INTO site_branding (id, header_image_key, header_image_content_type, updated_by, updated_at) VALUES ('default', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET header_image_key = excluded.header_image_key, header_image_content_type = excluded.header_image_content_type, updated_by = excluded.updated_by, updated_at = excluded.updated_at").bind(objectKey, file.type, actor.id, now).run();
    } catch (error) { await bucket().delete(objectKey); throw error; }
    await auditAccess(actor, "site_header_updated", "Gambar header sistem dikemas kini.");
    return apiJson({ hasHeaderImage: true, updatedAt: now }, request);
  } catch (error) {
    console.error("Header branding upload failed", error);
    return apiJson({ error: "Gambar header belum dapat disimpan." }, request, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  let actor: Awaited<ReturnType<typeof requireUser>>;
  try {
    actor = await requireUser(request);
    if (!isSuperAdmin(actor) && actor.activeRole !== "school_admin") return apiJson({ error: "Hanya Pentadbir atau System Admin boleh menukar gambar header." }, request, { status: 403 });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi Pentadbir tidak sah." }, request, { status: error.status });
    return apiJson({ error: "Pengesahan akses gagal." }, request, { status: 503 });
  }
  try {
    const now = new Date().toISOString();
    await database().prepare("INSERT INTO site_branding (id, header_image_key, header_image_content_type, updated_by, updated_at) VALUES ('default', NULL, NULL, ?, ?) ON CONFLICT(id) DO UPDATE SET header_image_key = NULL, header_image_content_type = NULL, updated_by = excluded.updated_by, updated_at = excluded.updated_at").bind(actor.id, now).run();
    await auditAccess(actor, "site_header_reset", "Gambar header dikembalikan kepada tema asal; fail terdahulu dikekalkan sebagai sandaran.");
    return apiJson({ hasHeaderImage: false, updatedAt: now }, request);
  } catch {
    return apiJson({ error: "Header belum dapat dikembalikan kepada tema asal." }, request, { status: 503 });
  }
}
