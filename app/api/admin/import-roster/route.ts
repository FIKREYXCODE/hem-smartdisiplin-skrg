import { env } from "cloudflare:workers";
import { apiJson, apiOptions } from "@/lib/api-response";
import { database } from "@/lib/cases-db";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

type TeacherInput = { id: string; name: string; position: string; role: string };
type ClassInput = { id: string; year: string; name: string; session: string; classTeacher: string };
type StudentInput = { id: string; name: string; classId: string };

async function runBatches(statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 80) {
    await database().batch(statements.slice(index, index + 80));
  }
}

export async function POST(request: Request) {
  const secret = (env as unknown as { ROSTER_IMPORT_SECRET?: string }).ROSTER_IMPORT_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) return apiJson({ error: "Tidak dibenarkan." }, request, { status: 401 });

  try {
    const input = await request.json() as { teachers?: TeacherInput[]; classes?: ClassInput[]; students?: StudentInput[] };
    const teachers = input.teachers || []; const classes = input.classes || []; const students = input.students || [];
    if (!teachers.length || !classes.length || !students.length) return apiJson({ error: "Data daftar tidak lengkap." }, request, { status: 400 });
    const caseCount = await database().prepare("SELECT COUNT(*) AS total FROM cases").first<{ total: number }>();
    if ((caseCount?.total || 0) > 0) return apiJson({ error: "Import dihentikan kerana rekod kes sudah wujud." }, request, { status: 409 });

    await database().batch([
      database().prepare("DELETE FROM students"),
      database().prepare("DELETE FROM classes"),
      database().prepare("DELETE FROM teachers"),
    ]);
    await runBatches(classes.map(item => database().prepare("INSERT INTO classes (id, year, name, session, class_teacher, active) VALUES (?, ?, ?, ?, ?, 1)").bind(item.id, item.year, item.name, item.session, item.classTeacher)));
    await runBatches(teachers.map(item => database().prepare("INSERT INTO teachers (id, name, position, email, role, active) VALUES (?, ?, ?, NULL, ?, 1)").bind(item.id, item.name, item.position, item.role)));
    await runBatches(students.map(item => database().prepare("INSERT INTO students (id, name, class_id, active) VALUES (?, ?, ?, 1)").bind(item.id, item.name, item.classId)));
    return apiJson({ imported: { teachers: teachers.length, classes: classes.length, students: students.length } }, request);
  } catch (error) {
    console.error("Roster import failed", error);
    return apiJson({ error: "Import daftar gagal." }, request, { status: 500 });
  }
}
