import { addEvent, database, getCase } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { hasRole, requireUser } from "@/lib/auth";
import { ssdmRecommendationOptions } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  try {
    const user = await requireUser(request); if (!hasRole(user, "discipline")) return apiJson({ error: "Akses Guru Disiplin diperlukan." }, request, { status: 403 });
    const feedback = String(input.pupilParentFeedback || "").trim(); const recommendation = String(input.recommendation || ""); const otherRecommendation = String(input.otherRecommendation || "").trim(); const extraNotes = String(input.extraNotes || "").trim();
    if (!ssdmRecommendationOptions.includes(recommendation as never) || (recommendation === "Lain-lain" && !otherRecommendation) || feedback.length > 2500 || extraNotes.length > 2000) return apiJson({ error: "Maklumat permohonan SSDM tidak lengkap." }, request, { status: 400 });
    const record = await getCase(id); if (!record || record.deletedAt) return apiJson({ error: "Kes aktif tidak ditemui." }, request, { status: 404 }); if (!record.disciplineActions.length) return apiJson({ error: "Rekodkan tindakan Guru Disiplin sebelum memohon kelulusan SSDM." }, request, { status: 409 }); if (record.ssdmRequest && ["pending", "approved"].includes(record.ssdmRequest.status)) return apiJson({ error: "Permohonan SSDM ini masih menunggu atau telah diluluskan." }, request, { status: 409 }); const now = new Date().toISOString();
    await database().prepare("INSERT INTO ssdm_requests (id, case_id, pupil_parent_feedback, recommendation, other_recommendation, extra_notes, status, requested_by_id, requested_by_name, requested_at, admin_notes) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, '')").bind(crypto.randomUUID(), id, feedback, recommendation, otherRecommendation, extraNotes, user.id, user.name, now).run(); await addEvent(id, user.id, user.name, "Guru Disiplin", "permohonan_ssdm", `Permohonan kelulusan SSDM dihantar — ${recommendation}${otherRecommendation ? `: ${otherRecommendation}` : ""}.`, null, { recommendation, status: "pending" }); return apiJson({ record: await getCase(id) }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status }); console.error(error); return apiJson({ error: "Permohonan SSDM belum dapat disimpan." }, request, { status: 503 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  try {
    const user = await requireUser(request); if (!hasRole(user, "school_admin")) return apiJson({ error: "Akses Pentadbir Sekolah diperlukan." }, request, { status: 403 });
    const position = user.roles.find(r => r.role === "school_admin")?.position || user.position; const decision = String(input.decision || ""); const notes = String(input.notes || "").trim(); if (!["approved", "rejected", "returned"].includes(decision) || notes.length > 2000) return apiJson({ error: "Keputusan SSDM tidak lengkap." }, request, { status: 400 });
    const record = await getCase(id); if (!record?.ssdmRequest || record.ssdmRequest.status !== "pending") return apiJson({ error: "Tiada permohonan SSDM yang sedang menunggu." }, request, { status: 409 }); const now = new Date().toISOString();
    await database().prepare("UPDATE ssdm_requests SET status = ?, decided_by_id = ?, decided_by_name = ?, decided_by_position = ?, decided_at = ?, admin_notes = ? WHERE id = ? AND status = 'pending'").bind(decision, user.id, user.name, position, now, notes, record.ssdmRequest.id).run(); await addEvent(id, user.id, user.name, "PK HEM", "keputusan_ssdm", `Keputusan SSDM oleh ${position}: ${decision}. ${notes}`, { status: "pending" }, { status: decision }); return apiJson({ record: await getCase(id) }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status }); console.error(error); return apiJson({ error: "Keputusan SSDM belum dapat disimpan." }, request, { status: 503 }); }
}
