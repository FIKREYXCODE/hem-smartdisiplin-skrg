import { env } from "cloudflare:workers";
import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, createSession, getAuthUser } from "@/lib/auth";
import { database } from "@/lib/cases-db";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function POST(request: Request) {
  let input: { code?: string };
  try { input = await request.json(); } catch { return apiJson({ error: "Kod akses tidak sah." }, request, { status: 400 }); }
  const expected = env.SUPER_ADMIN_ACCESS_CODE || "";
  if (!expected || !safeEqual(String(input.code || ""), expected)) {
    await auditAccess(null, "super_admin_login_failed", "Percubaan akses Pentadbir Sistem gagal.");
    return apiJson({ error: "Kod akses tidak sah." }, request, { status: 401 });
  }
  const row = await database().prepare(`SELECT t.id FROM teachers t JOIN user_roles r ON r.user_id=t.id JOIN user_accounts a ON a.user_id=t.id
    WHERE r.role='system_admin' AND t.active=1 AND a.active=1 ORDER BY t.id LIMIT 1`).first<{ id: string }>();
  if (!row) return apiJson({ error: "Akses Pentadbir Sistem belum dikonfigurasi." }, request, { status: 503 });
  const user = await getAuthUser(row.id);
  if (!user) return apiJson({ error: "Akses Pentadbir Sistem belum dikonfigurasi." }, request, { status: 503 });
  const session = await createSession(row.id, true);
  const superUser = { ...user, superAdmin: true };
  await auditAccess(superUser, "super_admin_login", "Sesi Pentadbir Sistem dimulakan.");
  return apiJson({ ...session, user: superUser }, request);
}
