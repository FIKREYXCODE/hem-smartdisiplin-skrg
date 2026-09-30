import { addEvent, database, getCase } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, hasActiveRole, isSuperAdmin, requireUser } from "@/lib/auth";
import { accessContext, canViewCase } from "@/lib/authorization";
import { categories } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(request); const { id } = await params; const record = await getCase(id); if (!record) return apiJson({ error: "Kes tidak ditemui." }, request, { status: 404 }); if (!canViewCase(user, record, request)) return apiJson({ error: "Akses kepada kes ini ditolak." }, request, { status: 403 }); const role=accessContext(user,request).role; const actorRole = isSuperAdmin(user) ? "Super Admin" : role==="discipline" ? "Guru Disiplin" : role==="school_admin" ? "Pentadbir Sekolah" : role==="class_teacher" ? "Guru Kelas" : "Pelapor"; const preview=request.headers.get("X-View-As"); await addEvent(id, user.id, user.name, actorRole, "semakan", `${isSuperAdmin(user)&&preview?`Super Admin melalui View As ${preview}: `:""}Butiran kes dibuka.`, null, null); await auditAccess(user, "case_opened", id); return apiJson({ record: await getCase(id) }, request); }
  catch (error) { if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status }); return apiJson({ error: "Kes tidak dapat dibuka." }, request, { status: 503 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format perubahan tidak sah." }, request, { status: 400 }); }
  try {
    const user = await requireUser(request); const mode = String(input.mode || "edit"); const current = await getCase(id); if (!current) return apiJson({ error: "Kes tidak ditemui." }, request, { status: 404 });
    if (mode === "edit") {
      if (current.deletedAt) return apiJson({ error: "Rekod yang dipadam tidak boleh diubah." }, request, { status: 409 });
      if ((current.reporterId !== user.id || !hasActiveRole(user,"reporter")) && !hasActiveRole(user, "discipline") && !isSuperAdmin(user)) return apiJson({ error: "Guru hanya boleh mengubah laporan sendiri." }, request, { status: 403 });
      const category = String(input.category || ""); const location = String(input.location || "").trim(); const notes = String(input.notes || "").trim(); const initialAction = String(input.initialAction || "").trim(); if (!categories.includes(category as never) || !location || location.length > 200 || notes.length < 10 || notes.length > 3000 || initialAction.length > 1500) return apiJson({ error: "Butiran perubahan tidak lengkap." }, request, { status: 400 });
      const before = { category: current.category, location: current.location, notes: current.notes, initialAction: current.initialAction }; const after = { category, location, notes, initialAction }; await database().prepare("UPDATE cases SET category = ?, location = ?, notes = ?, initial_action = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL").bind(category, location, notes, initialAction, new Date().toISOString(), id).run(); await addEvent(id, user.id, user.name, isSuperAdmin(user)?"Super Admin":hasActiveRole(user, "discipline") ? "Guru Disiplin" : "Pelapor", "kemas_kini", `${isSuperAdmin(user)?"Super Admin melalui View As: ":""}Butiran laporan dikemas kini.`, before, after);
    } else if (mode === "delete") {
      if (!hasActiveRole(user, "school_admin") || !canViewCase(user, current, request)) return apiJson({ error: "Hanya Pentadbir yang dibenarkan memadam kes di bawah semakannya." }, request, { status: 403 });
      if (current.deletedAt) return apiJson({ error: "Rekod ini telah dipadam." }, request, { status: 409 }); const reason = String(input.reason || "").trim(); if (reason.length < 5 || reason.length > 500) return apiJson({ error: "Nyatakan sebab penghapusan." }, request, { status: 400 }); const now = new Date().toISOString(); await database().prepare("UPDATE cases SET deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL").bind(now, user.name, now, id).run(); await addEvent(id, user.id, user.name, "PK HEM", "hapus", `Rekod dipadam secara lembut oleh Pentadbir — ${reason}`, { deletedAt: null }, { deletedAt: now, reason });
    } else return apiJson({ error: "Tindakan tidak dikenali." }, request, { status: 400 });
    return apiJson({ record: await getCase(id) }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status }); console.error(error); return apiJson({ error: "Perubahan belum dapat disimpan." }, request, { status: 503 }); }
}
