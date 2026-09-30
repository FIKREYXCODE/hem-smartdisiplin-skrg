import { database } from "./cases-db";
import type { AccessRole } from "./school";

const SEED_VERSION = "access_seed_v2";
const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

const classTeacherMap: Record<string, string> = {
  "4 JAYYID": "NOZE BINTI TUKIJAN", "4 KHOIR": "MASTURAH BINTI TUDA", "4 MUMTAZ": "NURUL ANISA BINTI SAPARUDIN", "4 ILTIZAM": "ROSIDIAN BIN IDRIS",
  "5 JAYYID": "RINI BINTI DAUD", "5 KHOIR": "TAN JANG BIN TURE", "5 MUMTAZ": "HAMSIAH BINTI HAMID", "5 ILTIZAM": "WAN MUHAMAD YUSUF BIN WAN ABDUL AZIZ",
  "6 JAYYID": "MASNIYA BINTI ABDULLAH SANI", "6 KHOIR": "MOHD ALFAIZAL BIN DAUD", "6 MUMTAZ": "BAJAM BINTI LADUNG", "6 ILTIZAM": "AG KU KEMAINDDRA BIN PG MOHD TAIB",
  "1 JAYYID": "NORLINA BINTI BAGWAS", "1 KHOIR": "FARIDAH BINTI SUNU", "1 MUMTAZ": "RASMAWATI BINTI TAUSE", "1 ILTIZAM": "WAFA FARHANA BINTI ABD KADIR",
  "2 JAYYID": "MARINI BINTI LADI", "2 KHOIR": "S.LILI BINTI LADI", "2 MUMTAZ": "SITI JAWARA BINTI LUKMAN", "2 ILTIZAM": "MOHAMMAD IKHWAN BIN ABDURAIS",
  "3 JAYYID": "AINATUN NADHIRAH BINTI DHARMAWI", "3 KHOIR": "JAIBY BIN JULIAN", "3 MUMTAZ": "NUR FAEZAH BINTI BANTALANI", "3 ILTIZAM": "JAINAH BINTI SULAIMAN",
};

const disciplineNames = ["NOZE BINTI TUKIJAN", "MOHD ALFAIZAL BIN DAUD", "ZAMRIE BIN OMAR ALI"];
const adminNames: Record<string, string> = {
  "YUNUS BIN PATARAI": "Guru Besar",
  "RAHMATIAH BINTI MOHD JUDA": "Penolong Kanan Pentadbiran / PK1",
  "KOMALA BINTI JOSEPH": "Penolong Kanan HEM",
  "WARNAH BINTI SIRA": "Penolong Kanan Kokurikulum",
  "EMRAN BIN HJ SELAMAT": "Penolong Kanan Petang",
};
const systemAdminNames = ["MOHAMMAD FIKREY BIN ABDUL GAPAR"];

type TeacherRow = { id: string; name: string; position: string };
type ClassRow = { id: string; name: string };

export async function ensureAccessSeeded() {
  const seeded = await database().prepare("SELECT id FROM access_audit WHERE event_type = ? LIMIT 1").bind(SEED_VERSION).first();
  if (seeded) return;
  const now = new Date().toISOString();
  const [teacherResult, classResult] = await Promise.all([
    database().prepare("SELECT id, name, position FROM teachers").all<TeacherRow>(),
    database().prepare("SELECT id, name FROM classes WHERE active = 1").all<ClassRow>(),
  ]);
  const teachers = [...teacherResult.results];
  if (!teachers.some(t => normalize(t.name) === normalize("MASNIYA BINTI ABDULLAH SANI"))) {
    const id = "teacher-masniya-abdullah-sani";
    await database().prepare("INSERT OR IGNORE INTO teachers (id, name, position, role, active) VALUES (?, ?, 'Guru', 'pelapor', 1)").bind(id, "MASNIYA BINTI ABDULLAH SANI").run();
    teachers.push({ id, name: "MASNIYA BINTI ABDULLAH SANI", position: "Guru" });
  }
  const byName = new Map(teachers.map(t => [normalize(t.name), t]));
  const statements: D1PreparedStatement[] = [];
  const addRole = (teacher: TeacherRow | undefined, role: AccessRole, scopeId: string | null = null, position = "") => {
    if (!teacher) return;
    const id = `${teacher.id}:${role}:${scopeId || "all"}`;
    statements.push(database().prepare("INSERT OR IGNORE INTO user_roles (id, user_id, role, scope_id, position, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, 'system')").bind(id, teacher.id, role, scopeId, position, now));
  };
  for (const teacher of teachers) {
    statements.push(database().prepare("INSERT OR IGNORE INTO user_accounts (user_id, password_iterations, active, created_at, updated_at) VALUES (?, 210000, 1, ?, ?)").bind(teacher.id, now, now));
    addRole(teacher, "reporter");
  }
  for (const [className, teacherName] of Object.entries(classTeacherMap)) {
    const cls = classResult.results.find(c => normalize(c.name) === normalize(className));
    const teacher = byName.get(normalize(teacherName));
    if (cls && teacher) {
      addRole(teacher, "class_teacher", cls.id, "Guru Kelas");
      statements.push(database().prepare("UPDATE classes SET class_teacher = ? WHERE id = ?").bind(teacher.name, cls.id));
    }
  }
  for (const name of disciplineNames) addRole(byName.get(normalize(name)), "discipline", null, "Guru Disiplin");
  for (const [name, position] of Object.entries(adminNames)) addRole(byName.get(normalize(name)), "school_admin", null, position);
  for (const name of systemAdminNames) addRole(byName.get(normalize(name)), "system_admin", null, "System Admin");
  statements.push(database().prepare("INSERT INTO access_audit (id, user_id, actor_name, event_type, details, created_at) VALUES (?, NULL, 'SYSTEM', ?, 'Role dan hubungan Guru Kelas dimulakan.', ?)").bind(crypto.randomUUID(), SEED_VERSION, now));
  for (let i = 0; i < statements.length; i += 80) await database().batch(statements.slice(i, i + 80));
}
