import { addEvent, database, getCase } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { hasValidDisciplineCode } from "@/lib/admin-access";
import { disciplineActionOptions } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  if (!(await hasValidDisciplineCode(request.headers.get("X-Access-Code") || ""))) return apiJson({ error: "Akses Guru Disiplin diperlukan." }, request, { status: 403 });
  const officerId = String(input.officerId || ""); const officerName = String(input.officerName || "").trim(); const actionType = String(input.actionType || ""); const otherAction = String(input.otherAction || "").trim(); const details = String(input.details || "").trim();
  if (!disciplineActionOptions.includes(actionType as never) || (actionType === "Lain-lain" && !otherAction) || details.length < 5 || details.length > 2000) return apiJson({ error: "Lengkapkan jenis dan butiran tindakan Guru Disiplin." }, request, { status: 400 });
  try { const [teacher, record] = await Promise.all([database().prepare("SELECT id, name FROM teachers WHERE id = ? AND active = 1").bind(officerId).first<{id:string;name:string}>(), getCase(id)]); if (!teacher || teacher.name !== officerName) return apiJson({ error: "Identiti Guru Disiplin tidak sah." }, request, { status: 403 }); if (!record || record.deletedAt) return apiJson({ error: "Kes aktif tidak ditemui." }, request, { status: 404 }); const now = new Date().toISOString(); await database().batch([database().prepare("INSERT INTO discipline_actions (id, case_id, action_type, other_action, details, officer_id, officer_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, actionType, otherAction, details, officerId, officerName, now), database().prepare("UPDATE cases SET traffic_status = 'yellow', updated_at = ? WHERE id = ?").bind(now, id)]); await addEvent(id, officerId, officerName, "Guru Disiplin", "tindakan_disiplin", `${actionType}${otherAction ? ` — ${otherAction}` : ""}: ${details}`, { trafficStatus: record.trafficStatus }, { trafficStatus: "yellow" }); return apiJson({ record: await getCase(id) }, request); }
  catch (error) { console.error(error); return apiJson({ error: "Tindakan belum dapat disimpan." }, request, { status: 503 }); }
}
