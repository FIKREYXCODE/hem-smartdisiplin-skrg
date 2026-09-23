import { database } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import type { Role } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function GET(request: Request) {
  try {
    const [teacherResult, classResult, studentResult] = await Promise.all([
      database().prepare("SELECT id, name, position, role FROM teachers WHERE active = 1 ORDER BY name").all<{ id: string; name: string; position: string; role: string }>(),
      database().prepare("SELECT id, year, name, session, class_teacher FROM classes WHERE active = 1 ORDER BY CAST(year AS INTEGER), name").all<{ id: string; year: string; name: string; session: string; class_teacher: string }>(),
      database().prepare("SELECT id, name, class_id FROM students WHERE active = 1 ORDER BY name").all<{ id: string; name: string; class_id: string }>(),
    ]);
    const studentsByClass = new Map<string, { id: string; name: string }[]>(); for (const student of studentResult.results) studentsByClass.set(student.class_id, [...(studentsByClass.get(student.class_id) || []), { id: student.id, name: student.name }]);
    return apiJson({ teachers: teacherResult.results.map(t => ({ ...t, role: (t.role === "guru_disiplin" ? "Guru Disiplin" : t.role === "pk_hem" ? "PK HEM" : t.role === "guru_besar" ? "Guru Besar" : "Pelapor") as Role })), classes: classResult.results.map(c => ({ id: c.id, year: c.year, name: c.name, session: c.session, classTeacher: c.class_teacher, students: studentsByClass.get(c.id) || [] })) }, request);
  } catch (error) { console.error("Roster load failed", error); return apiJson({ error: "Daftar guru dan murid tidak tersedia." }, request, { status: 503 }); }
}
