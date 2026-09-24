import { addEvent, database, getCase } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { hasValidAdminCode } from "@/lib/admin-access";
import { categories, type CaseStatus, type Role } from "@/lib/school";
export const runtime = "edge";
const flow: Partial<Record<Role, { from: CaseStatus; to: CaseStatus; label: string }>> = { "Guru Disiplin": { from: "disiplin", to: "pk", label: "Disemak dan disahkan Guru Disiplin" }, "PK HEM": { from: "pk", to: "besar", label: "Diambil maklum PK HEM" }, "Guru Besar": { from: "besar", to: "selesai", label: "Disahkan Guru Besar" } };
export function OPTIONS(request: Request) { return apiOptions(request); }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format perubahan tidak sah." }, request, { status: 400 }); }
  const mode = String(input.mode || "review"); const actorId = String(input.actorId || ""); const actor = String(input.actor || "").trim(); const role = String(input.role || "Pelapor") as Role;
  if (!actorId || !actor) return apiJson({ error: "Pilih identiti pengguna sebelum menyimpan perubahan." }, request, { status: 400 });
  try {
    const teacher = await database().prepare("SELECT id, name FROM teachers WHERE id = ? AND active = 1").bind(actorId).first<{ id: string; name: string }>(); if (!teacher || teacher.name !== actor) return apiJson({ error: "Identiti pengguna tidak sepadan dengan daftar guru." }, request, { status: 403 });
    const current = await getCase(id); if (!current) return apiJson({ error: "Kes tidak ditemui." }, request, { status: 404 });
    if (mode === "review") {
      const action = String(input.action || "").trim(); const next = flow[role]; if (!next || current.status !== next.from || (role === "Guru Disiplin" && !action) || action.length > 1000) return apiJson({ error: "Semakan tidak sepadan dengan peringkat kes semasa." }, request, { status: 409 });
      const now = new Date().toISOString(); const result = await database().prepare("UPDATE cases SET status = ?, updated_at = ? WHERE id = ? AND status = ? AND deleted_at IS NULL").bind(next.to, now, id, next.from).run(); if (!result.meta.changes) return apiJson({ error: "Kes telah berubah. Muat semula rekod." }, request, { status: 409 });
      await addEvent(id, actorId, actor, role, "semakan", `${next.label}${action ? ` — ${action}` : ""}`, { status: next.from }, { status: next.to, action });
    } else if (mode === "edit") {
      if (current.deletedAt) return apiJson({ error: "Rekod yang dipadam tidak boleh diubah." }, request, { status: 409 }); const category = String(input.category || ""); const notes = String(input.notes || "").trim(); const initialAction = String(input.initialAction || "").trim(); if (!categories.includes(category as never) || notes.length < 10 || notes.length > 2000 || initialAction.length > 1000) return apiJson({ error: "Butiran perubahan tidak lengkap." }, request, { status: 400 });
      const before = { category: current.category, notes: current.notes, initialAction: current.initialAction }; const after = { category, notes, initialAction }; await database().prepare("UPDATE cases SET category = ?, notes = ?, initial_action = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL").bind(category, notes, initialAction, new Date().toISOString(), id).run(); await addEvent(id, actorId, actor, role, "kemas_kini", "Butiran laporan dikemas kini.", before, after);
    } else if (mode === "delete") {
      const adminCode = String(input.adminCode || ""); if (!(await hasValidAdminCode(adminCode))) return apiJson({ error: "Kod akses admin tidak sah. Rekod tidak dipadam." }, request, { status: 403 });
      if (current.deletedAt) return apiJson({ error: "Rekod ini telah dipadam." }, request, { status: 409 }); const reason = String(input.reason || "").trim(); if (reason.length < 5 || reason.length > 500) return apiJson({ error: "Nyatakan sebab penghapusan." }, request, { status: 400 }); const now = new Date().toISOString(); await database().prepare("UPDATE cases SET deleted_at = ?, deleted_by = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL").bind(now, actor, now, id).run(); await addEvent(id, actorId, actor, role, "hapus", `Rekod dipadam secara lembut oleh admin — ${reason}`, { deletedAt: null }, { deletedAt: now, reason });
    } else if (mode === "restore") {
      if (!current.deletedAt) return apiJson({ error: "Rekod ini tidak dipadam." }, request, { status: 409 }); const now = new Date().toISOString(); await database().prepare("UPDATE cases SET deleted_at = NULL, deleted_by = NULL, updated_at = ? WHERE id = ?").bind(now, id).run(); await addEvent(id, actorId, actor, role, "pulih", "Rekod dipulihkan.", { deletedAt: current.deletedAt }, { deletedAt: null });
    } else return apiJson({ error: "Tindakan tidak dikenali." }, request, { status: 400 });
    return apiJson({ record: await getCase(id) }, request);
  } catch (error) { console.error("Case update failed", error); return apiJson({ error: "Perubahan belum dapat disimpan." }, request, { status: 503 }); }
}
