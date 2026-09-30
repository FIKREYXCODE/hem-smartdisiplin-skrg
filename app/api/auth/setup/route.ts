import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, createSession, getAuthUser, setPassword, validPassword } from "@/lib/auth";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  const userId = String(input.userId || ""); const password = String(input.password || ""); const confirm = String(input.confirm || "");
  if (!userId || password !== confirm || !validPassword(password)) return apiJson({ error: "Gunakan sekurang-kurangnya 10 aksara dengan huruf dan nombor, serta pastikan kedua-dua password sepadan." }, request, { status: 400 });
  try { await setPassword(userId, password, true); const user = await getAuthUser(userId); if (!user) throw new Error("Pengguna tidak ditemui."); const session = await createSession(userId); await auditAccess(user, "password_created", "Password pertama dicipta."); return apiJson({ user, ...session }, request, { status: 201 }); }
  catch (error) { return apiJson({ error: error instanceof Error ? error.message : "Password belum dapat dicipta." }, request, { status: 409 }); }
}
