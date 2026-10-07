import { addEvent, database, getCase } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { hasActiveRole, isSuperAdmin, requireUser } from "@/lib/auth";
import { disciplineActionOptions } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  try {
    const user = await requireUser(request); if (!hasActiveRole(user, "discipline", request)) return apiJson({ error: "Akses Guru Disiplin diperlukan." }, request, { status: 403 });
    const actorRole = isSuperAdmin(user) ? "Super Admin" : "Guru Disiplin"; const actorPrefix = isSuperAdmin(user) ? "Super Admin melalui View As Guru Disiplin: " : "";
    const mode = String(input.mode || "action"); const record = await getCase(id); if (!record || record.deletedAt) return apiJson({ error: "Kes aktif tidak ditemui." }, request, { status: 404 }); const now = new Date().toISOString();
    if (mode === "submit_admin") {
      if (!record.disciplineActions.length) return apiJson({ error: "Rekodkan tindakan awal dahulu." }, request, { status: 409 });
      await database().prepare("UPDATE cases SET admin_review_requested = 1, admin_review_requested_at = ?, updated_at = ? WHERE id = ?").bind(now, now, id).run();
      await addEvent(id, user.id, user.name, actorRole, "semakan", `${actorPrefix}Kes dihantar untuk pengesahan / makluman Pentadbir.`, { adminReviewRequested: record.adminReviewRequested }, { adminReviewRequested: true });
    } else {
      const rawTypes = Array.isArray(input.actionTypes) ? input.actionTypes.map(String) : [String(input.actionType || "")]; const actionTypes = [...new Set(rawTypes)].filter(v => disciplineActionOptions.includes(v as never)); const actionType = actionTypes.join(", "); const otherAction = String(input.otherAction || "").trim(); const details = String(input.details || "").trim(); const actionDate = String(input.actionDate || ""); const actionTime = String(input.actionTime || ""); const plainAdditionalNotes = String(input.additionalNotes || "").trim(); const witnessDetails = String(input.witnessDetails || "").trim(); const investigationDetails = String(input.investigationDetails || "").trim(); const additionalNotes = `[[DISCIPLINE_DETAIL_V1]]${JSON.stringify({ additionalNotes: plainAdditionalNotes, witnessDetails, investigationDetails })}`; const pupilFeedback = String(input.pupilFeedback || "").trim(); const parentFeedback = String(input.parentFeedback || "").trim();
      if (!actionTypes.length || actionTypes.length !== rawTypes.length || (actionTypes.includes("Lain-lain") && !otherAction) || details.length < 5 || details.length > 3000 || !/^\d{4}-\d{2}-\d{2}$/.test(actionDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(actionTime) || plainAdditionalNotes.length > 2000 || witnessDetails.length > 2000 || investigationDetails.length > 4000 || pupilFeedback.length > 2000 || parentFeedback.length > 2000) return apiJson({ error: "Lengkapkan tarikh, masa, jenis dan butiran tindakan. Setiap ruangan perlu berada dalam had yang dibenarkan." }, request, { status: 400 });
      await database().batch([database().prepare("INSERT INTO discipline_actions (id, case_id, action_type, action_types, other_action, details, action_date, action_time, additional_notes, pupil_feedback, parent_feedback, officer_id, officer_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, actionType, JSON.stringify(actionTypes), otherAction, details, actionDate, actionTime, additionalNotes, pupilFeedback, parentFeedback, user.id, user.name, now), database().prepare("UPDATE cases SET traffic_status = 'yellow', admin_review_requested = 0, admin_review_requested_at = NULL, updated_at = ? WHERE id = ?").bind(now, id)]);
      await addEvent(id, user.id, user.name, actorRole, "tindakan_disiplin", `${actorPrefix}${actionType}${otherAction ? ` — ${otherAction}` : ""}: ${details}`, { trafficStatus: record.trafficStatus }, { trafficStatus: "yellow", actionTypes, actionDate, actionTime, witnessDetails, investigationDetails });
    }
    return apiJson({ record: await getCase(id) }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status }); console.error(error); return apiJson({ error: "Tindakan belum dapat disimpan." }, request, { status: 503 }); }
}
