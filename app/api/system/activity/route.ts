import { apiJson, apiOptions } from "@/lib/api-response";
import { isSuperAdmin, requireUser } from "@/lib/auth";
import { database } from "@/lib/cases-db";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
type AccessRow={id:string;actor_name:string;actor_role:string;event_type:string;details:string;created_at:string;target_user_id:string|null};
type CaseRow={id:string;case_id:string;actor_name:string;actor_role:string;event_type:string;action:string;created_at:string};

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!isSuperAdmin(user)) return apiJson({ error: "Sesi Pentadbir Sistem diperlukan." }, request, { status: 403 });
    const [access, cases] = await Promise.all([
      database().prepare("SELECT id,actor_name,actor_role,event_type,details,created_at,target_user_id FROM access_audit ORDER BY created_at DESC LIMIT 120").all<AccessRow>(),
      database().prepare("SELECT id,case_id,actor_name,actor_role,event_type,action,created_at FROM case_events ORDER BY created_at DESC LIMIT 120").all<CaseRow>(),
    ]);
    const events = [
      ...access.results.map(r => ({ id:r.id,caseId:null,user:r.actor_name,role:r.actor_role||"Sistem",type:r.event_type,action:r.details,createdAt:r.created_at })),
      ...cases.results.map(r => ({ id:r.id,caseId:r.case_id,user:r.actor_name,role:r.actor_role,type:r.event_type,action:r.action,createdAt:r.created_at })),
    ].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,150);
    return apiJson({ events }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: await error.text() }, request, { status:error.status }); return apiJson({ error:"Aktiviti sistem tidak tersedia." }, request, { status:503 }); }
}
