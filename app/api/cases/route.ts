import { addEvent, database, getCase, toRecord } from "@/lib/cases-db";
import { categories, type Role } from "@/lib/school";
export const runtime = "edge";

export async function GET(request: Request) {
  try { const includeDeleted = new URL(request.url).searchParams.get("deleted") === "1"; const result = await database().prepare(`SELECT * FROM cases ${includeDeleted ? "" : "WHERE deleted_at IS NULL"} ORDER BY updated_at DESC, created_at DESC LIMIT 1000`).all(); return Response.json({ records: await Promise.all(result.results.map(row => toRecord(row as never))) }); }
  catch (error) { console.error("Cases load failed", error); return Response.json({ error: "Rekod tidak tersedia sekarang." }, { status: 503 }); }
}

export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return Response.json({ error: "Format laporan tidak sah." }, { status: 400 }); }
  const reporterId = String(input.reporterId || ""); const reporter = String(input.reporter || "").trim(); const role = String(input.role || "Pelapor") as Role; const session = String(input.session || ""); const classId = String(input.classId || ""); const studentId = String(input.studentId || ""); const date = String(input.date || ""); const time = String(input.time || ""); const category = String(input.category || ""); const notes = String(input.notes || "").trim(); const initialAction = String(input.initialAction || "").trim();
  if (!reporterId || !reporter || !classId || !studentId || !categories.includes(category as never) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0, 10) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || notes.length < 10 || notes.length > 2000 || initialAction.length > 1000) return Response.json({ error: "Semak semula semua medan wajib." }, { status: 400 });
  try {
    const teacher = await database().prepare("SELECT id, name FROM teachers WHERE id = ? AND active = 1").bind(reporterId).first<{ id: string; name: string }>(); const schoolClass = await database().prepare("SELECT id, name, session FROM classes WHERE id = ? AND active = 1").bind(classId).first<{ id: string; name: string; session: string }>(); const student = await database().prepare("SELECT id, name FROM students WHERE id = ? AND class_id = ? AND active = 1").bind(studentId, classId).first<{ id: string; name: string }>();
    if (!teacher || teacher.name !== reporter || !schoolClass || !student || schoolClass.session !== session) return Response.json({ error: "Pilihan guru, kelas atau murid tidak sepadan dengan daftar sekolah." }, { status: 400 });
    const id = `SD-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; const now = new Date().toISOString();
    await database().prepare("INSERT INTO cases (id, reporter, reporter_id, session, class_id, class_name, student, student_id, date, time, category, notes, initial_action, status, created_at, updated_at, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disiplin', ?, ?, '[]')").bind(id, reporter, reporterId, session, classId, schoolClass.name, student.name, studentId, date, time, category, notes, initialAction, now, now).run();
    await addEvent(id, reporterId, reporter, role, "cipta", "Laporan dicipta dan disimpan.", null, { session, classId, studentId, date, time, category, notes, initialAction }); return Response.json({ record: await getCase(id) }, { status: 201 });
  } catch (error) { console.error("Case save failed", error); return Response.json({ error: "Laporan belum dapat disimpan. Sila cuba lagi." }, { status: 503 }); }
}
