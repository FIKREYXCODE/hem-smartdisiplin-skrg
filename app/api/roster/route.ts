import { database } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { sessionForYear, type Role } from "@/lib/school";
import { requireUser } from "@/lib/auth";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function GET(request: Request) {
  try {
    await requireUser(request);
    const currentYear = new Date().getFullYear();
    const [teacherResult, classResult, studentResult] = await Promise.all([
      database().prepare("SELECT id, name, position, role FROM teachers WHERE active = 1 ORDER BY name").all<{ id: string; name: string; position: string; role: string }>(),
      database().prepare("SELECT id, year, name, session, class_teacher FROM classes WHERE active = 1 AND academic_year = COALESCE((SELECT MAX(academic_year) FROM classes WHERE academic_year <= ?), 2026) ORDER BY CAST(year AS INTEGER), name").bind(currentYear).all<{ id: string; year: string; name: string; session: string; class_teacher: string }>(),
      database().prepare("SELECT id, name, class_id FROM students WHERE active = 1 ORDER BY name").all<{ id: string; name: string; class_id: string }>(),
    ]);
    const studentsByClass = new Map<string, { id: string; name: string }[]>(); for (const student of studentResult.results) studentsByClass.set(student.class_id, [...(studentsByClass.get(student.class_id) || []), { id: student.id, name: student.name }]);
    return apiJson({ teachers: teacherResult.results.map(t => ({ ...t, role: (t.role === "guru_disiplin" ? "Guru Disiplin" : t.role === "pk_hem" ? "PK HEM" : t.role === "guru_besar" ? "Guru Besar" : "Pelapor") as Role })), classes: classResult.results.map(c => ({ id: c.id, year: c.year, name: c.name, session: sessionForYear(c.year), classTeacher: c.class_teacher, students: studentsByClass.get(c.id) || [] })) }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status }); console.error("Roster load failed", error); return apiJson({ error: "Daftar guru dan murid tidak tersedia." }, request, { status: 503 }); }
}
