import { addEvent, database, getCase, toRecord } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { categories, type Role } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

export async function GET(request: Request) {
  try { const includeDeleted = new URL(request.url).searchParams.get("deleted") === "1"; const result = await database().prepare(`SELECT * FROM cases ${includeDeleted ? "" : "WHERE deleted_at IS NULL"} ORDER BY updated_at DESC, created_at DESC LIMIT 1000`).all(); return apiJson({ records: await Promise.all(result.results.map(row => toRecord(row as never))) }, request); }
  catch (error) { console.error("Cases load failed", error); return apiJson({ error: "Rekod tidak tersedia sekarang." }, request, { status: 503 }); }
}

export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format laporan tidak sah." }, request, { status: 400 }); }
  const reporterId = String(input.reporterId || ""); const reporter = String(input.reporter || "").trim(); const role = String(input.role || "Pelapor") as Role; const session = String(input.session || ""); const classId = String(input.classId || ""); const studentId = String(input.studentId || ""); const date = String(input.date || ""); const time = String(input.time || ""); const category = String(input.category || ""); const notes = String(input.notes || "").trim(); const initialAction = String(input.initialAction || "").trim();
  if (!reporterId || !reporter || !classId || !studentId || !categories.includes(category as never) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0, 10) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || notes.length < 10 || notes.length > 2000 || initialAction.length > 1000) return apiJson({ error: "Semak semula semua medan wajib." }, request, { status: 400 });
  try {
    const teacher = await database().prepare("SELECT id, name FROM teachers WHERE id = ? AND active = 1").bind(reporterId).first<{ id: string; name: string }>(); const schoolClass = await database().prepare("SELECT id, name, session FROM classes WHERE id = ? AND active = 1").bind(classId).first<{ id: string; name: string; session: string }>(); const student = await database().prepare("SELECT id, name FROM students WHERE id = ? AND class_id = ? AND active = 1").bind(studentId, classId).first<{ id: string; name: string }>();
    if (!teacher || teacher.name !== reporter || !schoolClass || !student || schoolClass.session !== session) return apiJson({ error: "Pilihan guru, kelas atau murid tidak sepadan dengan daftar sekolah." }, request, { status: 400 });
    const id = `SD-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; const now = new Date().toISOString();
    await database().prepare("INSERT INTO cases (id, reporter, reporter_id, session, class_id, class_name, student, student_id, date, time, category, notes, initial_action, status, created_at, updated_at, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disiplin', ?, ?, '[]')").bind(id, reporter, reporterId, session, classId, schoolClass.name, student.name, studentId, date, time, category, notes, initialAction, now, now).run();
    await addEvent(id, reporterId, reporter, role, "cipta", "Laporan dicipta dan disimpan.", null, { session, classId, studentId, date, time, category, notes, initialAction }); return apiJson({ record: await getCase(id) }, request, { status: 201 });
  } catch (error) { console.error("Case save failed", error); return apiJson({ error: "Laporan belum dapat disimpan. Sila cuba lagi." }, request, { status: 503 }); }
}
