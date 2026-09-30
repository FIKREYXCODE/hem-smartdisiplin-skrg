import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, requireUser, revokeSession } from "@/lib/auth";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request) { try { const user = await requireUser(request); await revokeSession(request); await auditAccess(user, "logout", "Logout."); return apiJson({ ok: true }, request); } catch { return apiJson({ ok: true }, request); } }
