import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, hasRole, issueActivationCode, requireUser } from "@/lib/auth";
import { database } from "@/lib/cases-db";
import type { AccessRole } from "@/lib/school";
export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }
const allowedRoles = new Set<AccessRole>(["reporter", "class_teacher", "discipline", "school_admin", "system_admin"]);

async function requireSystemAdmin(request: Request) {
  const user = await requireUser(request); if (!hasRole(user, "system_admin")) throw new Response("Akses System Admin diperlukan.", { status: 403 }); return user;
}

export async function GET(request: Request) {
  try {
    await requireSystemAdmin(request);
    const [users, roles, classes] = await Promise.all([
      database().prepare(`SELECT t.id, t.name, t.position, t.active AS teacher_active, a.active AS account_active, a.password_hash IS NOT NULL AS password_set, a.reset_at, COALESCE(a.status,'needs_setup') AS account_status,
        EXISTS(SELECT 1 FROM account_activation_tokens x WHERE x.user_id=t.id AND x.used_at IS NULL AND x.expires_at>?) AS activation_ready
        FROM teachers t LEFT JOIN user_accounts a ON a.user_id = t.id ORDER BY t.name`).bind(new Date().toISOString()).all<{id:string;name:string;position:string;teacher_active:number;account_active:number|null;password_set:number;reset_at:string|null;account_status:string;activation_ready:number}>(),
      database().prepare("SELECT id, user_id, role, scope_id, position FROM user_roles ORDER BY role, scope_id").all<{id:string;user_id:string;role:AccessRole;scope_id:string|null;position:string}>(),
      database().prepare("SELECT id, name, year, class_teacher FROM classes WHERE active = 1 ORDER BY CAST(year AS INTEGER), name").all<{id:string;name:string;year:string;class_teacher:string}>(),
    ]);
    return apiJson({ users: users.results.map(u => ({ id:u.id,name:u.name,position:u.position,active:!!u.teacher_active && u.account_active !== 0,passwordSet:!!u.password_set,resetAt:u.reset_at,accountStatus:u.account_status,activationReady:!!u.activation_ready,roles:roles.results.filter(r=>r.user_id===u.id).map(r=>({role:r.role,scopeId:r.scope_id,position:r.position})) })), classes: classes.results }, request);
  } catch (error) { if (error instanceof Response) return apiJson({ error: await error.text() }, request, { status:error.status }); return apiJson({ error:"Pengurusan pengguna tidak tersedia." }, request, { status:503 }); }
}

export async function POST(request: Request) {
  let input:Record<string,unknown>; try{input=await request.json();}catch{return apiJson({error:"Format tidak sah."},request,{status:400});}
  try {
    const admin=await requireSystemAdmin(request); const name=String(input.name||"").trim().toUpperCase(); const position=String(input.position||"Guru").trim(); if(name.length<3||name.length>150||position.length>100)return apiJson({error:"Nama atau jawatan tidak sah."},request,{status:400});
    const existing=await database().prepare("SELECT id FROM teachers WHERE UPPER(name)=?").bind(name).first(); if(existing)return apiJson({error:"Nama pengguna sudah wujud."},request,{status:409});
    const id=`teacher-${crypto.randomUUID()}`;const now=new Date().toISOString();await database().batch([database().prepare("INSERT INTO teachers (id,name,position,role,active) VALUES (?,?,?,'pelapor',1)").bind(id,name,position),database().prepare("INSERT INTO user_accounts (user_id,password_iterations,status,active,created_at,updated_at) VALUES (?,210000,'needs_setup',1,?,?)").bind(id,now,now),database().prepare("INSERT INTO user_roles (id,user_id,role,scope_id,position,created_at,created_by) VALUES (?,?,'reporter',NULL,'',?,?)").bind(`${id}:reporter:all`,id,now,admin.id)]);
    const activation=await issueActivationCode(id,admin.id);await auditAccess(admin,"user_created",`Pengguna ${name} ditambah dan kod pengaktifan dijana.`,id);return apiJson({ok:true,id,activationCode:activation.code,expiresAt:activation.expiresAt},request,{status:201});
  }catch(error){if(error instanceof Response)return apiJson({error:await error.text()},request,{status:error.status});return apiJson({error:"Pengguna belum dapat ditambah."},request,{status:503});}
}

export async function PATCH(request: Request) {
  let input:Record<string,unknown>;try{input=await request.json();}catch{return apiJson({error:"Format tidak sah."},request,{status:400});}
  try{
    const admin=await requireSystemAdmin(request);const targetId=String(input.userId||"");const action=String(input.action||"");const target=await database().prepare("SELECT id,name,position FROM teachers WHERE id=?").bind(targetId).first<{id:string;name:string;position:string}>();if(!target)return apiJson({error:"Pengguna tidak ditemui."},request,{status:404});const now=new Date().toISOString();
    if(action==="update_profile"){
      const name=String(input.name||"").trim().replace(/\s+/g," ").toUpperCase();const position=String(input.position||"").trim().replace(/\s+/g," ");
      if(name.length<3||name.length>150||position.length<1||position.length>100)return apiJson({error:"Nama atau jawatan tidak sah."},request,{status:400});
      const duplicate=await database().prepare("SELECT id FROM teachers WHERE UPPER(name)=? AND id<>?").bind(name,targetId).first();if(duplicate)return apiJson({error:"Nama pengguna sudah wujud."},request,{status:409});
      await database().batch([database().prepare("UPDATE teachers SET name=?,position=? WHERE id=?").bind(name,position,targetId),database().prepare("UPDATE classes SET class_teacher=? WHERE class_teacher=?").bind(name,target.name)]);
      await auditAccess(admin,"user_profile_updated",JSON.stringify({before:{name:target.name,position:target.position},after:{name,position}}),targetId);
      return apiJson({ok:true},request);
    }
    if(action==="reset_password"||action==="generate_activation"){const activation=await issueActivationCode(targetId,admin.id);await auditAccess(admin,action==="reset_password"?"password_reset":"activation_generated",`Kod sementara ${target.name} dijana; tamat ${activation.expiresAt}.`,targetId);return apiJson({ok:true,activationCode:activation.code,expiresAt:activation.expiresAt,message:"Akses telah direset. Pengguna perlu mencipta password baharu pada login seterusnya."},request);}
    if(action==="set_active"){
      const active=input.active?1:0;
      if(!active){const targetIsSystemAdmin=await database().prepare("SELECT 1 AS found FROM user_roles WHERE user_id=? AND role='system_admin' LIMIT 1").bind(targetId).first();if(targetIsSystemAdmin){const remaining=await database().prepare("SELECT COUNT(DISTINCT ur.user_id) AS count FROM user_roles ur JOIN user_accounts ua ON ua.user_id=ur.user_id JOIN teachers t ON t.id=ur.user_id WHERE ur.role='system_admin' AND ur.user_id<>? AND ua.active=1 AND t.active=1").bind(targetId).first<{count:number}>();if(!remaining?.count)return apiJson({error:"System Admin terakhir tidak boleh dinyahaktifkan."},request,{status:409});}}
      await database().batch([database().prepare("UPDATE teachers SET active=? WHERE id=?").bind(active,targetId),database().prepare("UPDATE user_accounts SET active=?,updated_at=? WHERE user_id=?").bind(active,now,targetId),...(active?[]:[database().prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(targetId)])]);await auditAccess(admin,active?"account_activated":"account_deactivated",target.name,targetId);return apiJson({ok:true},request);
    }
    if(action==="set_roles"){
      const roleInputs=Array.isArray(input.roles)?input.roles as Array<Record<string,unknown>>:[];const clean=roleInputs.map(r=>({role:String(r.role||"") as AccessRole,scopeId:r.scopeId?String(r.scopeId):null,position:String(r.position||"")})).filter(r=>allowedRoles.has(r.role));if(!clean.some(r=>r.role==="reporter"))clean.unshift({role:"reporter",scopeId:null,position:""});
      const targetIsSystemAdmin=await database().prepare("SELECT 1 AS found FROM user_roles WHERE user_id=? AND role='system_admin' LIMIT 1").bind(targetId).first();if(targetIsSystemAdmin&&!clean.some(r=>r.role==="system_admin")){const remaining=await database().prepare("SELECT COUNT(DISTINCT ur.user_id) AS count FROM user_roles ur JOIN user_accounts ua ON ua.user_id=ur.user_id JOIN teachers t ON t.id=ur.user_id WHERE ur.role='system_admin' AND ur.user_id<>? AND ua.active=1 AND t.active=1").bind(targetId).first<{count:number}>();if(!remaining?.count)return apiJson({error:"Role System Admin terakhir tidak boleh dibuang."},request,{status:409});}
      const oldRoles=await database().prepare("SELECT role,scope_id,position FROM user_roles WHERE user_id=?").bind(targetId).all<{role:AccessRole;scope_id:string|null;position:string}>();
      const statements:D1PreparedStatement[]=[database().prepare("DELETE FROM user_roles WHERE user_id=?").bind(targetId)];
      for(const old of oldRoles.results.filter(r=>r.role==="class_teacher"&&r.scope_id))statements.push(database().prepare("UPDATE classes SET class_teacher='' WHERE id=? AND class_teacher=?").bind(old.scope_id,target.name));
      for(const r of clean){if(r.role==="class_teacher"&&!r.scopeId)continue;const id=`${targetId}:${r.role}:${r.scopeId||"all"}`;if(r.role==="class_teacher"&&r.scopeId)statements.push(database().prepare("DELETE FROM user_roles WHERE role='class_teacher' AND scope_id=?").bind(r.scopeId));statements.push(database().prepare("INSERT INTO user_roles (id,user_id,role,scope_id,position,created_at,created_by) VALUES (?,?,?,?,?,?,?)").bind(id,targetId,r.role,r.scopeId,r.position,now,admin.id));if(r.role==="class_teacher"&&r.scopeId)statements.push(database().prepare("UPDATE classes SET class_teacher=? WHERE id=?").bind(target.name,r.scopeId));}
      await database().batch(statements);await auditAccess(admin,"roles_updated",JSON.stringify({before:oldRoles.results,after:clean}),targetId);const oldClass=oldRoles.results.find(r=>r.role==="class_teacher")?.scope_id||null;const newClass=clean.find(r=>r.role==="class_teacher")?.scopeId||null;if(oldClass!==newClass)await auditAccess(admin,"class_teacher_changed",JSON.stringify({oldClass,newClass}),targetId);return apiJson({ok:true},request);
    }
    return apiJson({error:"Tindakan tidak dikenali."},request,{status:400});
  }catch(error){if(error instanceof Response)return apiJson({error:await error.text()},request,{status:error.status});console.error(error);return apiJson({error:"Perubahan belum dapat disimpan."},request,{status:503});}
}
