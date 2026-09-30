import { apiJson, apiOptions } from "@/lib/api-response";
import { activationCodeHash, auditAccess, consumeActivationCode, createSession, getAuthUser, setPassword, validPassword, verifyActivationCode } from "@/lib/auth";
import { env } from "cloudflare:workers";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request) {
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  const userId = String(input.userId || ""); const activationCode = String(input.activationCode || ""); const password = String(input.password || ""); const confirm = String(input.confirm || "");
  if (!userId || !activationCode || password !== confirm || !validPassword(password)) return apiJson({ error: "Masukkan kod pengaktifan yang sah dan gunakan sekurang-kurangnya 10 aksara dengan huruf serta nombor." }, request, { status: 400 });
  try {
    const user = await getAuthUser(userId); if (!user) throw new Error("Pengguna tidak ditemui.");
    const tokenId = await verifyActivationCode(userId, activationCode);
    const bootstrap = user.roles.some(r => r.role === "system_admin") && !!env.SYSTEM_ADMIN_BOOTSTRAP_CODE && await activationCodeHash(activationCode) === await activationCodeHash(String(env.SYSTEM_ADMIN_BOOTSTRAP_CODE));
    if (!tokenId && !bootstrap) return apiJson({ error: "Kod pengaktifan tidak sah, telah digunakan atau telah tamat tempoh." }, request, { status: 403 });
    await setPassword(userId, password, true); if (tokenId) await consumeActivationCode(tokenId);
    const session = await createSession(userId); await auditAccess(user, "password_created", bootstrap ? "Password pertama System Admin dicipta melalui bootstrap selamat." : "Password dicipta menggunakan kod pengaktifan sekali guna."); return apiJson({ user, ...session }, request, { status: 201 });
  }
  catch (error) { return apiJson({ error: error instanceof Error ? error.message : "Password belum dapat dicipta." }, request, { status: 409 }); }
}
