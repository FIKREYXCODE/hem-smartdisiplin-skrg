import { addEvent, database, getCase } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { hasRole, requireUser } from "@/lib/auth";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  try {
    const user = await requireUser(request); if (!hasRole(user, "school_admin")) return apiJson({ error: "Akses Pentadbir Sekolah diperlukan." }, request, { status: 403 });
    const position = user.roles.find(r => r.role === "school_admin")?.position || user.position; const decision = String(input.decision || ""); const notes = String(input.notes || "").trim();
    if (!["acknowledged", "further_action"].includes(decision) || (decision === "further_action" && notes.length < 5) || notes.length > 1500) return apiJson({ error: "Catatan sekurang-kurangnya 5 aksara diwajibkan untuk tindakan lanjut." }, request, { status: 400 });
    const record = await getCase(id); if (!record || record.deletedAt) return apiJson({ error: "Kes aktif tidak ditemui." }, request, { status: 404 }); if (!record.adminReviewRequested) return apiJson({ error: "Kes ini belum dihantar oleh Guru Disiplin untuk pengesahan." }, request, { status: 409 }); const now = new Date().toISOString(); const next = decision === "acknowledged" ? "green" : "yellow";
    await database().batch([database().prepare("INSERT INTO admin_confirmations (id, case_id, decision, admin_id, admin_name, position, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, decision, user.id, user.name, position, notes, now), database().prepare("UPDATE cases SET traffic_status = ?, admin_review_requested = 0, updated_at = ? WHERE id = ?").bind(next, now, id)]);
    await addEvent(id, user.id, user.name, "Pentadbir Sekolah", "pengesahan_admin", decision === "acknowledged" ? `Kes disahkan / diambil maklum sebagai ${position}. ${notes}` : `Tindakan lanjut diminta sebagai ${position}. ${notes}`, { trafficStatus: record.trafficStatus }, { trafficStatus: next, decision, position }); return apiJson({ record: await getCase(id) }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status }); console.error(error); return apiJson({ error: "Pengesahan belum dapat disimpan." }, request, { status: 503 }); }
}
