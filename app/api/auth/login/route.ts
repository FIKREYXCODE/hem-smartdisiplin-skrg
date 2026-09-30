import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, createSession, getAuthUser, verifyPassword } from "@/lib/auth";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  const userId = String(input.userId || ""); const password = String(input.password || ""); const category = String(input.category || "") as "reporter"|"class_teacher"|"discipline"|"school_admin";
  try { if (!(await verifyPassword(userId, password))) { await auditAccess(null, "login_failed", "Cubaan login tidak berjaya.", userId || null); return apiJson({ error: "Nama pengguna atau password tidak sah." }, request, { status: 403 }); } const user = await getAuthUser(userId); if (!user) return apiJson({ error: "Akaun tidak ditemui." }, request, { status: 404 }); const session = await createSession(userId, false, category); const sessionUser = { ...user, activeRole: category }; await auditAccess(sessionUser, "login", `Login berjaya sebagai ${category}.`); return apiJson({ user: sessionUser, ...session }, request); }
  catch (error) { console.error(error); return apiJson({ error: "Login belum dapat diproses." }, request, { status: 503 }); }
}
