import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, createSession, getAuthUser, setPassword, TEMPORARY_PASSWORD, validPassword, verifyTemporaryPassword } from "@/lib/auth";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  const userId = String(input.userId || ""); const temporaryPassword = String(input.temporaryPassword || ""); const password = String(input.password || ""); const confirm = String(input.confirm || "");
  if (!userId || !temporaryPassword || password !== confirm || !validPassword(password) || password === TEMPORARY_PASSWORD) return apiJson({ error: "Masukkan kata laluan sementara dan cipta kata laluan baharu sekurang-kurangnya 10 aksara dengan huruf serta nombor." }, request, { status: 400 });
  try {
    const user = await getAuthUser(userId); if (!user) throw new Error("Pengguna tidak ditemui.");
    if (!(await verifyTemporaryPassword(userId, temporaryPassword))) return apiJson({ error: "Kata laluan sementara tidak sah. Minta System Admin menetapkan semula akses." }, request, { status: 403 });
    await setPassword(userId, password, true);
    const session = await createSession(userId); await auditAccess(user, "password_created", "Kata laluan sendiri dicipta selepas penggunaan kata laluan sementara."); return apiJson({ user, ...session }, request, { status: 201 });
  }
  catch (error) { return apiJson({ error: error instanceof Error ? error.message : "Password belum dapat dicipta." }, request, { status: 409 }); }
}
