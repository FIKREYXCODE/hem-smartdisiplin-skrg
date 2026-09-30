import { addEvent, database, getCase, toRecord } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, hasActiveRole, isSuperAdmin, requireUser } from "@/lib/auth";
import { accessContext, canUseView, type CaseView } from "@/lib/authorization";
import { categories, sessionForYear } from "@/lib/school";
import { normalizeParticipants } from "@/lib/participant-rules";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

function authError(error: unknown, request: Request) {
  if (error instanceof Response) return apiJson({ error: "Sesi tidak sah atau telah tamat." }, request, { status: error.status });
  console.error(error); return apiJson({ error: "Rekod tidak tersedia sekarang." }, request, { status: 503 });
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request); const url = new URL(request.url); const view = (url.searchParams.get("view") || "mine") as CaseView;
    if (!["mine", "class", "discipline", "admin"].includes(view) || !canUseView(user, view, request)) return apiJson({ error: "Anda tidak mempunyai kebenaran untuk paparan ini." }, request, { status: 403 });
    let where = "c.deleted_at IS NULL"; const binds: string[] = [];
    if (view === "mine") { where += " AND c.reporter_id = ?"; binds.push(user.id); }
    else if (view === "class") {
      const scopes = accessContext(user, request).classIds;
      if (!scopes.length) return apiJson({ records: [], scopeWarning: "Kelas belum ditetapkan untuk akaun ini. Sila hubungi Pentadbir Sistem." }, request);
      const places = scopes.map(() => "?").join(",");
      where += ` AND (EXISTS (SELECT 1 FROM case_participants cp WHERE cp.case_id = c.id AND cp.class_id IN (${places})) OR (NOT EXISTS (SELECT 1 FROM case_participants cp0 WHERE cp0.case_id = c.id) AND c.class_id IN (${places})))`; binds.push(...scopes, ...scopes);
    }
    const statement = database().prepare(`SELECT c.* FROM cases c WHERE ${where} ORDER BY c.updated_at DESC, c.created_at DESC LIMIT 1000`);
    const result = await (binds.length ? statement.bind(...binds) : statement).all();
    await auditAccess(user, "case_list_view", `Paparan: ${view}`);
    return apiJson({ records: await Promise.all(result.results.map(row => toRecord(row as never))) }, request);
  } catch (error) { return authError(error, request); }
}

export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format laporan tidak sah." }, request, { status: 400 }); }
  try {
    const user = await requireUser(request); if (!hasActiveRole(user, "reporter", request)) return apiJson({ error: "Akses pelapor diperlukan." }, request, { status: 403 });
    const date = String(input.date || ""); const time = String(input.time || ""); const category = String(input.category || ""); const location = String(input.location || "").trim(); const notes = String(input.notes || "").trim(); const initialAction = String(input.initialAction || "").trim();
    const legacy = input.studentId && input.classId ? { studentId: String(input.studentId), classId: String(input.classId) } : undefined;
    const participants = normalizeParticipants(input.participants, legacy);
    const requestedCount = Array.isArray(input.participants) ? input.participants.length : legacy ? 1 : 0;
    if (!participants.length || participants.length > 50 || participants.length !== requestedCount || !location || location.length > 200 || !categories.includes(category as never) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0, 10) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || notes.length < 10 || notes.length > 3000 || initialAction.length > 1500) return apiJson({ error: "Semak semula semua medan wajib dan senarai murid." }, request, { status: 400 });
    const resolved = await Promise.all(participants.map(item => database().prepare("SELECT s.id, s.name, c.id AS class_id, c.name AS class_name, c.year FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ? AND s.class_id = ? AND s.active = 1 AND c.active = 1").bind(item.studentId, item.classId).first<{ id: string; name: string; class_id: string; class_name: string; year: string }>()));
    if (resolved.some(item => !item)) return apiJson({ error: "Salah satu pilihan murid tidak sepadan dengan daftar sekolah." }, request, { status: 400 });
    const pupils = resolved as { id: string; name: string; class_id: string; class_name: string; year: string }[];
    const sessions = [...new Set(pupils.map(item => sessionForYear(item.year)))]; const session = sessions.length === 1 ? sessions[0] : "Campuran";
    const first = pupils[0]; const classId = first.class_id; const studentId = first.id;
    const id = `SD-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; const now = new Date().toISOString();
    await database().batch([
      database().prepare("INSERT INTO cases (id, reporter, reporter_id, session, class_id, class_name, student, student_id, date, time, category, location, notes, initial_action, status, traffic_status, admin_review_requested, created_at, updated_at, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disiplin', 'red', 0, ?, ?, '[]')").bind(id, user.name, user.id, session, classId, first.class_name, first.name, studentId, date, time, category, location, notes, initialAction, now, now),
      ...pupils.map(pupil => database().prepare("INSERT INTO case_participants (id, case_id, student_id, class_id, student_name, class_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, pupil.id, pupil.class_id, pupil.name, pupil.class_name, now)),
    ]);
    const viaViewAs = isSuperAdmin(user) && request.headers.get("X-View-As") === "reporter";
    await addEvent(id, user.id, user.name, viaViewAs ? "Super Admin" : "Pelapor", "cipta", `${viaViewAs ? "Super Admin melalui View As Guru Pelapor: " : ""}Laporan dicipta untuk ${pupils.length} murid dan dihantar kepada Guru Disiplin.`, null, { session, participantCount: pupils.length, participantIds: pupils.map(item => item.id), date, time, category, location }); return apiJson({ record: await getCase(id) }, request, { status: 201 });
  } catch (error) { return authError(error, request); }
}
