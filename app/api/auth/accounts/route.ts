import { database } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { ensureAccessSeeded } from "@/lib/access-seed";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category") || "reporter";
  const allowed = new Set(["reporter", "class_teacher", "discipline", "school_admin"]);
  if (!allowed.has(category)) return apiJson({ error: "Kategori akses tidak sah." }, request, { status: 400 });
  try {
    await ensureAccessSeeded();
    const rows = await database().prepare(`SELECT DISTINCT t.id, t.name, t.position, a.status = 'ready' AS password_set
      FROM teachers t JOIN user_accounts a ON a.user_id = t.id JOIN user_roles r ON r.user_id = t.id
      WHERE t.active = 1 AND a.active = 1 AND r.role = ? ORDER BY t.name`).bind(category).all<{id:string;name:string;position:string;password_set:number}>();
    return apiJson({ accounts: rows.results.map(r => ({ id: r.id, name: category === "school_admin" ? r.position : r.name, position: r.position, passwordSet: !!r.password_set })) }, request);
  } catch (error) { console.error(error); return apiJson({ error: "Senarai akaun tidak tersedia." }, request, { status: 503 }); }
}
