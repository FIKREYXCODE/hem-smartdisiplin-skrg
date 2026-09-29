import { addEvent, database, getCase, toRecord } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { hasValidAdminCode, hasValidDisciplineCode } from "@/lib/admin-access";
import { categories, sessionForYear, type Role } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

export async function GET(request: Request) {
  const url = new URL(request.url); const scope = url.searchParams.get("scope") || "own"; const includeDeleted = url.searchParams.get("deleted") === "1"; const reporterId = url.searchParams.get("reporterId") || ""; const code = request.headers.get("X-Access-Code") || "";
  try {
    let where = includeDeleted ? "" : "WHERE deleted_at IS NULL"; const binds: string[] = [];
    if (scope === "own") {
      if (!reporterId) return apiJson({ error: "Pilih nama pelapor untuk melihat rekod sendiri." }, request, { status: 400 });
      const teacher = await database().prepare("SELECT id FROM teachers WHERE id = ? AND active = 1").bind(reporterId).first(); if (!teacher) return apiJson({ error: "Identiti guru tidak sah." }, request, { status: 403 });
      where = `${where ? `${where} AND` : "WHERE"} reporter_id = ?`; binds.push(reporterId);
    } else if (scope === "discipline") {
      if (!(await hasValidDisciplineCode(code))) return apiJson({ error: "Akses Guru Disiplin diperlukan." }, request, { status: 403 });
    } else if (scope === "admin") {
      if (!(await hasValidAdminCode(code))) return apiJson({ error: "Akses Pentadbir diperlukan." }, request, { status: 403 });
    } else return apiJson({ error: "Skop rekod tidak sah." }, request, { status: 400 });
    const statement = database().prepare(`SELECT * FROM cases ${where} ORDER BY updated_at DESC, created_at DESC LIMIT 1000`); const result = await (binds.length ? statement.bind(...binds) : statement).all();
    return apiJson({ records: await Promise.all(result.results.map(row => toRecord(row as never))) }, request);
  } catch (error) { console.error("Cases load failed", error); return apiJson({ error: "Rekod tidak tersedia sekarang." }, request, { status: 503 }); }
}

export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format laporan tidak sah." }, request, { status: 400 }); }
  const reporterId = String(input.reporterId || ""); const reporter = String(input.reporter || "").trim(); const role = String(input.role || "Pelapor") as Role; const session = String(input.session || ""); const classId = String(input.classId || ""); const studentId = String(input.studentId || ""); const date = String(input.date || ""); const time = String(input.time || ""); const category = String(input.category || ""); const location = String(input.location || "").trim(); const notes = String(input.notes || "").trim(); const initialAction = String(input.initialAction || "").trim();
  if (!reporterId || !reporter || !classId || !studentId || !location || location.length > 200 || !categories.includes(category as never) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0, 10) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || notes.length < 10 || notes.length > 3000 || initialAction.length > 1500) return apiJson({ error: "Semak semula semua medan wajib." }, request, { status: 400 });
  try {
    const teacher = await database().prepare("SELECT id, name FROM teachers WHERE id = ? AND active = 1").bind(reporterId).first<{ id: string; name: string }>(); const schoolClass = await database().prepare("SELECT id, name, year FROM classes WHERE id = ? AND active = 1").bind(classId).first<{ id: string; name: string; year: string }>(); const student = await database().prepare("SELECT id, name FROM students WHERE id = ? AND class_id = ? AND active = 1").bind(studentId, classId).first<{ id: string; name: string }>();
    if (!teacher || teacher.name !== reporter || !schoolClass || !student || sessionForYear(schoolClass.year) !== session) return apiJson({ error: "Pilihan guru, kelas atau murid tidak sepadan dengan daftar sekolah." }, request, { status: 400 });
    const id = `SD-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; const now = new Date().toISOString();
    await database().prepare("INSERT INTO cases (id, reporter, reporter_id, session, class_id, class_name, student, student_id, date, time, category, location, notes, initial_action, status, traffic_status, created_at, updated_at, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disiplin', 'red', ?, ?, '[]')").bind(id, reporter, reporterId, session, classId, schoolClass.name, student.name, studentId, date, time, category, location, notes, initialAction, now, now).run();
    await addEvent(id, reporterId, reporter, role, "cipta", "Laporan dicipta dan menunggu tindakan Guru Disiplin.", null, { session, classId, studentId, date, time, category, location }); return apiJson({ record: await getCase(id) }, request, { status: 201 });
  } catch (error) { console.error("Case save failed", error); return apiJson({ error: "Laporan belum dapat disimpan. Sila cuba lagi." }, request, { status: 503 }); }
}
