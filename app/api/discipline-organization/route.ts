import { apiJson, apiOptions } from "@/lib/api-response";
import { isSuperAdmin, requireUser } from "@/lib/auth";
import { database } from "@/lib/cases-db";
import { sessionForYear } from "@/lib/school";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

type MemberRow = {
  id: string; academic_year: number; teacher_id: string | null; display_name: string;
  position: string; level: string; session: string | null; sort_order: number;
  image_key: string | null; active: number;
};

type ClassRow = {
  id: string; academic_year: number; year: string; name: string; session: string | null;
  class_teacher_id: string | null; class_teacher: string; active: number;
};

const levels = new Set(["guru_besar", "pk_hem", "setiausaha", "penyelaras", "sidang"]);
const sessions = new Set(["Pagi", "Petang"]);

function numberYear(value: unknown, fallback = 2026) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : fallback;
}

async function payload(year: number) {
  const [memberResult, classResult, teacherResult, yearResult] = await Promise.all([
    database().prepare("SELECT id, academic_year, teacher_id, display_name, position, level, session, sort_order, image_key, active FROM discipline_organization_members WHERE academic_year = ? ORDER BY CASE level WHEN 'guru_besar' THEN 1 WHEN 'pk_hem' THEN 2 WHEN 'setiausaha' THEN 3 WHEN 'penyelaras' THEN 4 ELSE 5 END, session, sort_order, display_name").bind(year).all<MemberRow>(),
    database().prepare("SELECT id, academic_year, year, name, session, class_teacher_id, class_teacher, active FROM classes WHERE academic_year = ? ORDER BY CAST(year AS INTEGER), name").bind(year).all<ClassRow>(),
    database().prepare("SELECT id, name, position FROM teachers WHERE active = 1 ORDER BY name").all<{ id: string; name: string; position: string }>(),
    database().prepare("SELECT year, active FROM discipline_organization_years ORDER BY year DESC").all<{ year: number; active: number }>(),
  ]);
  return {
    year,
    years: yearResult.results.map(item => ({ year: item.year, active: Boolean(item.active) })),
    members: memberResult.results.map(item => ({
      id: item.id, academicYear: item.academic_year, teacherId: item.teacher_id,
      displayName: item.display_name, position: item.position, level: item.level,
      session: item.session, sortOrder: item.sort_order, active: Boolean(item.active),
      hasPhoto: Boolean(item.image_key),
    })),
    classes: classResult.results.map(item => ({
      id: item.id, academicYear: item.academic_year, year: item.year, name: item.name,
      session: item.session || sessionForYear(item.year), classTeacherId: item.class_teacher_id,
      classTeacher: item.class_teacher, active: Boolean(item.active),
    })),
    teachers: teacherResult.results,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = numberYear(url.searchParams.get("year"), new Date().getFullYear());
  try { await requireUser(request); return apiJson(await payload(year), request); }
  catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    console.error("Organization load failed", error);
    return apiJson({ error: "Carta organisasi belum dapat dimuatkan." }, request, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!isSuperAdmin(user)) return apiJson({ error: "Akses Super Admin diperlukan." }, request, { status: 403 });
  } catch (error) {
    if (error instanceof Response) return apiJson({ error: "Sesi tidak sah." }, request, { status: error.status });
    return apiJson({ error: "Pengesahan akses gagal." }, request, { status: 503 });
  }
  let input: Record<string, unknown>;
  try { input = await request.json(); }
  catch { return apiJson({ error: "Format data tidak sah." }, request, { status: 400 }); }

  const action = String(input.action || "");
  const year = numberYear(input.academicYear, new Date().getFullYear());
  const now = new Date().toISOString();
  try {
    if (action === "saveMember") {
      const id = String(input.id || crypto.randomUUID());
      const displayName = String(input.displayName || "").trim().slice(0, 160);
      const position = String(input.position || "").trim().slice(0, 160);
      const level = String(input.level || "sidang");
      const session = level === "sidang" ? String(input.session || "") : null;
      const teacherId = String(input.teacherId || "") || null;
      const sortOrder = Math.max(0, Math.min(999, Number(input.sortOrder) || 0));
      const active = input.active === false ? 0 : 1;
      if (!displayName || !position || !levels.has(level) || (level === "sidang" && !sessions.has(String(session)))) return apiJson({ error: "Lengkapkan nama, jawatan, aras carta dan sidang." }, request, { status: 400 });
      await database().prepare("INSERT INTO discipline_organization_years (year, active, created_at, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(year) DO UPDATE SET updated_at = excluded.updated_at").bind(year, now, now).run();
      const exists = await database().prepare("SELECT id FROM discipline_organization_members WHERE id = ?").bind(id).first();
      if (exists) {
        await database().prepare("UPDATE discipline_organization_members SET teacher_id = ?, display_name = ?, position = ?, level = ?, session = ?, sort_order = ?, active = ?, updated_at = ? WHERE id = ? AND academic_year = ?")
          .bind(teacherId, displayName, position, level, session, sortOrder, active, now, id, year).run();
      } else {
        await database().prepare("INSERT INTO discipline_organization_members (id, academic_year, teacher_id, display_name, position, level, session, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(id, year, teacherId, displayName, position, level, session, sortOrder, active, now, now).run();
      }
    } else if (action === "createYear") {
      const sourceYear = numberYear(input.sourceYear, year - 1);
      const exists = await database().prepare("SELECT year FROM discipline_organization_years WHERE year = ?").bind(year).first();
      if (exists) return apiJson({ error: `Carta tahun ${year} sudah tersedia.` }, request, { status: 409 });
      const [members, classes] = await Promise.all([
        database().prepare("SELECT teacher_id, display_name, position, level, session, sort_order, image_key, image_content_type, active FROM discipline_organization_members WHERE academic_year = ?").bind(sourceYear).all<Omit<MemberRow, "id" | "academic_year"> & { image_content_type: string | null }>(),
        database().prepare("SELECT year, name, session, class_teacher_id, class_teacher, active FROM classes WHERE academic_year = ?").bind(sourceYear).all<Omit<ClassRow, "id" | "academic_year">>(),
      ]);
      const statements = [database().prepare("INSERT INTO discipline_organization_years (year, active, created_at, updated_at) VALUES (?, 1, ?, ?)").bind(year, now, now)];
      for (const item of members.results) statements.push(database().prepare("INSERT INTO discipline_organization_members (id, academic_year, teacher_id, display_name, position, level, session, sort_order, image_key, image_content_type, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), year, item.teacher_id, item.display_name, item.position, item.level, item.session, item.sort_order, item.image_key, item.image_content_type, item.active, now, now));
      for (const item of classes.results) statements.push(database().prepare("INSERT INTO classes (id, academic_year, year, name, session, class_teacher_id, class_teacher, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), year, item.year, item.name, item.session, item.class_teacher_id, item.class_teacher, item.active));
      await database().batch(statements);
    } else if (action === "saveClass") {
      const id = String(input.id || crypto.randomUUID());
      const classYear = String(input.year || "").trim().slice(0, 30);
      const name = String(input.name || "").trim().slice(0, 120);
      const session = String(input.session || sessionForYear(classYear));
      const teacherId = String(input.classTeacherId || "") || null;
      const active = input.active === false ? 0 : 1;
      if (!classYear || !name || !sessions.has(session)) return apiJson({ error: "Lengkapkan tahun, nama kelas dan sidang." }, request, { status: 400 });
      let classTeacher = String(input.classTeacher || "").trim().slice(0, 160);
      if (teacherId) {
        const teacher = await database().prepare("SELECT name FROM teachers WHERE id = ? AND active = 1").bind(teacherId).first<{ name: string }>();
        if (!teacher) return apiJson({ error: "Guru kelas yang dipilih tidak ditemui." }, request, { status: 400 });
        classTeacher = teacher.name;
      }
      const exists = await database().prepare("SELECT id FROM classes WHERE id = ?").bind(id).first();
      if (exists) await database().prepare("UPDATE classes SET year = ?, name = ?, session = ?, class_teacher_id = ?, class_teacher = ?, active = ? WHERE id = ? AND academic_year = ?").bind(classYear, name, session, teacherId, classTeacher, active, id, year).run();
      else await database().prepare("INSERT INTO classes (id, academic_year, year, name, session, class_teacher_id, class_teacher, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, year, classYear, name, session, teacherId, classTeacher, active).run();
    } else if (action === "setYearActive") {
      await database().prepare("UPDATE discipline_organization_years SET active = ?, updated_at = ? WHERE year = ?").bind(input.active === false ? 0 : 1, now, year).run();
    } else return apiJson({ error: "Tindakan tidak dikenali." }, request, { status: 400 });

    return apiJson(await payload(year), request);
  } catch (error) {
    console.error("Organization update failed", error);
    return apiJson({ error: "Perubahan carta belum dapat disimpan." }, request, { status: 503 });
  }
}
