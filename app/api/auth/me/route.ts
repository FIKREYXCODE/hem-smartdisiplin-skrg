import { apiJson, apiOptions } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
export async function GET(request: Request) { try { return apiJson({ user: await requireUser(request) }, request); } catch (error) { if (error instanceof Response) return apiJson({ error: await error.text() }, request, { status: error.status }); return apiJson({ error: "Sesi tidak sah." }, request, { status: 401 }); } }
