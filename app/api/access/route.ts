import { apiJson, apiOptions } from "@/lib/api-response";
import { hasValidAdminCode, hasValidDisciplineCode } from "@/lib/admin-access";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return apiJson({ error: "Format tidak sah." }, request, { status: 400 }); }
  const kind = String(input.kind || ""); const code = String(input.code || "");
  const valid = kind === "discipline" ? await hasValidDisciplineCode(code) : kind === "admin" ? await hasValidAdminCode(code) : false;
  return valid ? apiJson({ ok: true }, request) : apiJson({ error: "Kod akses tidak sah." }, request, { status: 403 });
}
