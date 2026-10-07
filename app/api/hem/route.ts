import { database } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";
import { auditAccess, requireUser } from "@/lib/auth";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

type LateRow = { id:string;student_id:string;student_name:string;class_id:string;class_name:string;date:string;time:string;reason:string;notes:string;duty_teacher_id:string;duty_teacher_name:string;created_at:string;updated_at:string };
type ProgramRow = { id:string;name:string;unit:string;date:string;start_time:string;end_time:string;location:string;coordinator_id:string;coordinator_name:string;target_group:string;participant_count:number;objective:string;activities:string;impact:string;summary:string;status:string;created_at:string;updated_at:string };

const lateRecord = (r: LateRow) => ({ id:r.id,studentId:r.student_id,studentName:r.student_name,classId:r.class_id,className:r.class_name,date:r.date,time:r.time,reason:r.reason,notes:r.notes,dutyTeacherId:r.duty_teacher_id,dutyTeacherName:r.duty_teacher_name,createdAt:r.created_at,updatedAt:r.updated_at });
const programRecord = (r: ProgramRow) => ({ id:r.id,name:r.name,unit:r.unit,date:r.date,startTime:r.start_time,endTime:r.end_time,location:r.location,coordinatorId:r.coordinator_id,coordinatorName:r.coordinator_name,targetGroup:r.target_group,participantCount:r.participant_count,objective:r.objective,activities:r.activities,impact:r.impact,summary:r.summary,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at });

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const feature = new URL(request.url).searchParams.get("module");
    if (feature === "late") {
      const rows = await database().prepare("SELECT * FROM late_records ORDER BY date DESC, time DESC, created_at DESC").all<LateRow>();
      return apiJson({ records: rows.results.map(lateRecord) }, request);
    }
    if (feature === "programs") {
      const rows = await database().prepare("SELECT * FROM hem_programs ORDER BY date DESC, created_at DESC").all<ProgramRow>();
      return apiJson({ records: rows.results.map(programRecord) }, request);
    }
    return apiJson({ error: "Modul tidak sah." }, request, { status: 400 });
  } catch (error) { return error instanceof Response ? error : apiJson({ error:"Data HEM gagal dimuatkan." }, request, { status:500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const feature = String(body.module || "");
    const now = new Date().toISOString();
    if (feature === "late") {
      const studentId=String(body.studentId||""); const date=String(body.date||""); const time=String(body.time||""); const reason=String(body.reason||"").trim();
      if(!studentId||!date||!time||reason.length<2)return apiJson({error:"Lengkapkan murid, tarikh, masa dan sebab lewat."},request,{status:400});
      const pupil=await database().prepare("SELECT s.id,s.name,s.class_id,c.name AS class_name FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=? AND s.active=1 AND c.active=1").bind(studentId).first<{id:string;name:string;class_id:string;class_name:string}>();
      if(!pupil)return apiJson({error:"Murid tidak ditemui."},request,{status:404});
      const id=crypto.randomUUID(); const notes=String(body.notes||"").trim();
      await database().prepare("INSERT INTO late_records (id,student_id,student_name,class_id,class_name,date,time,reason,notes,duty_teacher_id,duty_teacher_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,pupil.id,pupil.name,pupil.class_id,pupil.class_name,date,time,reason,notes,user.id,user.name,now,now).run();
      await auditAccess(user,"late_record_created",`${pupil.name} · ${date} ${time}`);
      const row=await database().prepare("SELECT * FROM late_records WHERE id=?").bind(id).first<LateRow>();
      return apiJson({record:lateRecord(row!)},request,{status:201});
    }
    if(feature === "programs"){
      if(!user.superAdmin&&!['discipline','school_admin'].includes(user.activeRole||''))return apiJson({error:"Program HEM hanya boleh ditambah oleh Guru Disiplin atau Pentadbir."},request,{status:403});
      const name=String(body.name||"").trim(),unit=String(body.unit||"").trim(),date=String(body.date||""),location=String(body.location||"").trim();
      if(name.length<3||!unit||!date||!location)return apiJson({error:"Lengkapkan nama program, unit, tarikh dan tempat."},request,{status:400});
      const id=crypto.randomUUID();
      await database().prepare("INSERT INTO hem_programs (id,name,unit,date,start_time,end_time,location,coordinator_id,coordinator_name,target_group,participant_count,objective,activities,impact,summary,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,name,unit,date,String(body.startTime||""),String(body.endTime||""),location,user.id,user.name,String(body.targetGroup||"").trim(),Math.max(0,Number(body.participantCount)||0),String(body.objective||"").trim(),String(body.activities||"").trim(),String(body.impact||"").trim(),String(body.summary||"").trim(),String(body.status||"planned"),now,now).run();
      await auditAccess(user,"hem_program_created",`${name} · ${date}`);
      const row=await database().prepare("SELECT * FROM hem_programs WHERE id=?").bind(id).first<ProgramRow>();
      return apiJson({record:programRecord(row!)},request,{status:201});
    }
    return apiJson({error:"Modul tidak sah."},request,{status:400});
  } catch(error){return error instanceof Response?error:apiJson({error:"Rekod HEM gagal disimpan."},request,{status:500});}
}

export async function PATCH(request: Request) {
  try{
    const user=await requireUser(request); const body=await request.json() as Record<string,unknown>; const feature=String(body.module||""); const id=String(body.id||""); const now=new Date().toISOString();
    if(!id)return apiJson({error:"ID rekod diperlukan."},request,{status:400});
    if(feature==="late"){
      const reason=String(body.reason||"").trim(),notes=String(body.notes||"").trim(); if(reason.length<2)return apiJson({error:"Sebab lewat diperlukan."},request,{status:400});
      await database().prepare("UPDATE late_records SET reason=?,notes=?,updated_at=? WHERE id=?").bind(reason,notes,now,id).run(); await auditAccess(user,"late_record_updated",id);
      const row=await database().prepare("SELECT * FROM late_records WHERE id=?").bind(id).first<LateRow>(); return apiJson({record:lateRecord(row!)},request);
    }
    if(feature==="programs"){
      if(!user.superAdmin&&!['discipline','school_admin'].includes(user.activeRole||''))return apiJson({error:"Akses tidak dibenarkan."},request,{status:403});
      const status=String(body.status||""); if(!['planned','ongoing','completed'].includes(status))return apiJson({error:"Status tidak sah."},request,{status:400});
      await database().prepare("UPDATE hem_programs SET impact=?,summary=?,status=?,updated_at=? WHERE id=?").bind(String(body.impact||"").trim(),String(body.summary||"").trim(),status,now,id).run(); await auditAccess(user,"hem_program_updated",id);
      const row=await database().prepare("SELECT * FROM hem_programs WHERE id=?").bind(id).first<ProgramRow>(); return apiJson({record:programRecord(row!)},request);
    }
    return apiJson({error:"Modul tidak sah."},request,{status:400});
  }catch(error){return error instanceof Response?error:apiJson({error:"Kemas kini gagal."},request,{status:500});}
}

export async function DELETE(request: Request) {
  try {
    const user=await requireUser(request);
    if(!user.superAdmin)return apiJson({error:"Hanya System Admin boleh memadam rekod HEM."},request,{status:403});
    const body=await request.json() as Record<string,unknown>;const feature=String(body.module||"");const id=String(body.id||"");
    if(!id)return apiJson({error:"ID rekod diperlukan."},request,{status:400});
    if(feature==="late"){
      const row=await database().prepare("SELECT * FROM late_records WHERE id=?").bind(id).first<LateRow>();
      if(!row)return apiJson({error:"Rekod lewat tidak ditemui."},request,{status:404});
      await database().prepare("DELETE FROM late_records WHERE id=?").bind(id).run();
      await auditAccess(user,"late_record_deleted",`${row.student_name} · ${row.date} ${row.time}`);
      return apiJson({ok:true},request);
    }
    return apiJson({error:"Modul tidak sah."},request,{status:400});
  } catch(error){return error instanceof Response?error:apiJson({error:"Rekod gagal dipadam."},request,{status:500});}
}
