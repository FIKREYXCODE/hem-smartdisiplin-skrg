"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Camera, ChevronDown, CopyPlus, Network, Plus, Save, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrgMember = {
  id: string; academicYear: number; teacherId: string | null; displayName: string; position: string;
  level: "guru_besar" | "pk_hem" | "setiausaha" | "penyelaras" | "sidang"; session: "Pagi" | "Petang" | null;
  sortOrder: number; active: boolean; hasPhoto: boolean;
};
type OrgClass = { id: string; academicYear: number; year: string; name: string; session: "Pagi" | "Petang"; classTeacherId: string | null; classTeacher: string; active: boolean };
type OrgTeacher = { id: string; name: string; position: string };
type OrgPayload = { year: number; years: { year: number; active: boolean }[]; members: OrgMember[]; classes: OrgClass[]; teachers: OrgTeacher[]; error?: string };

const backend = "https://hem-smartdisiplin-ranggu.afiqzkablemo.chatgpt.site";
const endpoint = (path: string) => `${typeof window !== "undefined" && window.location.hostname === "fikreyxcode.github.io" ? backend : ""}${path}`;
const levelLabels: Record<OrgMember["level"], string> = { guru_besar: "Guru Besar", pk_hem: "Penolong Kanan Hal Ehwal Murid", setiausaha: "Setiausaha Disiplin", penyelaras: "Penyelaras Disiplin", sidang: "Pegawai Sidang" };

async function squareCrop(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 720;
    const context = canvas.getContext("2d"); if (!context) return file;
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 720, 720);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .88));
    return blob ? new File([blob], "profil.webp", { type: "image/webp" }) : file;
  } catch { return file; }
}

export function OrganizationChart({ adminEnabled, token, onRosterReload, notify }: { adminEnabled: boolean; token: string; onRosterReload: () => void; notify: (message: string) => void }) {
  const initialYear = new Date().getFullYear();
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<OrgPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [newYear, setNewYear] = useState(initialYear + 1);
  const [imageVersion, setImageVersion] = useState(0);

  async function load(target = year) {
    setLoading(true);
    try {
      const response = await fetch(endpoint(`/api/discipline-organization?year=${target}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const next = await response.json() as OrgPayload;
      if (!response.ok) throw new Error(next.error || "Carta tidak dapat dimuatkan.");
      setData(next);
    } catch (error) { notify(error instanceof Error ? error.message : "Carta tidak dapat dimuatkan."); }
    finally { setLoading(false); }
  }
  // Data hydration follows the year selected by the viewer.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(year); }, [year, token]);

  async function mutate(input: Record<string, unknown>, success: string) {
    setBusy(String(input.id || input.action || "save"));
    try {
      const response = await fetch(endpoint("/api/discipline-organization"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
      const next = await response.json() as OrgPayload;
      if (!response.ok) throw new Error(next.error || "Perubahan belum dapat disimpan.");
      setData(next); notify(success); onRosterReload();
    } catch (error) { notify(error instanceof Error ? error.message : "Perubahan belum dapat disimpan."); }
    finally { setBusy(""); }
  }

  async function uploadPhoto(member: OrgMember, file?: File) {
    if (!file) return;
    setBusy(`photo-${member.id}`);
    try {
      const cropped = await squareCrop(file); const form = new FormData(); form.append("file", cropped);
      const response = await fetch(endpoint(`/api/discipline-organization/${member.id}/photo`), { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Gambar belum dapat disimpan.");
      setImageVersion(value => value + 1); await load(); notify(`Gambar ${member.displayName} berjaya dikemas kini.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Gambar belum dapat disimpan."); }
    finally { setBusy(""); }
  }

  const activeMembers = (data?.members || []).filter(member => member.active);
  const top = (["guru_besar", "pk_hem", "setiausaha", "penyelaras"] as OrgMember["level"][]).map(level => activeMembers.find(member => member.level === level)).filter(Boolean) as OrgMember[];
  const yearOptions = useMemo(() => {
    const values = new Set((data?.years || []).map(item => item.year)); values.add(initialYear);
    return [...values].sort((a, b) => b - a);
  }, [data?.years, initialYear]);

  return <section className="organization-page">
    <div className="org-toolbar">
      <div><span className="org-kicker"><Network size={15}/> PENGURUSAN UNIT DISIPLIN</span><h2>Carta Organisasi</h2><p>Struktur pegawai dan guru kelas mengikut tahun persekolahan.</p></div>
      <div className="org-toolbar-actions"><label>Tahun<select value={year} onChange={event => setYear(Number(event.target.value))}>{yearOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>{adminEnabled && <Button className="org-edit-button" onClick={() => setEditing(value => !value)}><Settings2 size={17}/>{editing ? "Tutup Tetapan" : "Edit Carta"}</Button>}</div>
    </div>
    {data?.years.find(item => item.year === year)?.active === false && <div className="org-archive"><Archive size={17}/> Carta tahun {year} ialah rekod arkib.</div>}
    {loading ? <div className="org-loading">Memuatkan carta organisasi…</div> : <>
      <div className="org-hierarchy" aria-label={`Carta organisasi disiplin ${year}`}>
        <div className="org-top-chain">{top.map((member, index) => <div className="org-chain-item" key={member.id}><PersonCard member={member} year={year} imageVersion={imageVersion} token={token}/>{index < top.length - 1 && <span className="org-vertical-line"/>}</div>)}</div>
        {top.length === 0 && <div className="org-empty">Carta tahun {year} belum mempunyai pegawai aktif.</div>}
        <div className="org-branches"><SessionBranch session="Pagi" members={activeMembers} classes={data?.classes || []} year={year} imageVersion={imageVersion} token={token}/><SessionBranch session="Petang" members={activeMembers} classes={data?.classes || []} year={year} imageVersion={imageVersion} token={token}/></div>
      </div>
      {editing && adminEnabled && data && <OrganizationEditor data={data} year={year} newYear={newYear} setNewYear={setNewYear} busy={busy} mutate={mutate} uploadPhoto={uploadPhoto} token={token}/>}
    </>}
  </section>;
}

function PersonCard({ member, year, imageVersion, token, compact = false }: { member: OrgMember; year: number; imageVersion: number; token: string; compact?: boolean }) {
  return <article className={`org-person ${compact ? "compact" : ""}`}>
    <div className="org-avatar">{member.hasPhoto ? <ProfilePhoto member={member} year={year} imageVersion={imageVersion} token={token}/> : <UserRound aria-hidden="true"/>}</div>
    <div><strong>{member.displayName}</strong><span>{member.position}</span></div>
  </article>;
}

function ProfilePhoto({ member, year, imageVersion, token }: { member: OrgMember; year: number; imageVersion: number; token: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let live = true; let objectUrl = "";
    fetch(endpoint(`/api/discipline-organization/${member.id}/photo?v=${year}-${imageVersion}`), { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.blob() : Promise.reject())
      .then(blob => { objectUrl = URL.createObjectURL(blob); if (live) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl); })
      .catch(() => {});
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [member.id, year, imageVersion, token]);
  return url ? <img src={url} alt={`Gambar ${member.displayName}`}/> : <UserRound aria-hidden="true"/>;
}

function SessionBranch({ session, members, classes, year, imageVersion, token }: { session: "Pagi" | "Petang"; members: OrgMember[]; classes: OrgClass[]; year: number; imageVersion: number; token: string }) {
  const officers = members.filter(member => member.level === "sidang" && member.session === session).sort((a, b) => a.sortOrder - b.sortOrder);
  const sessionClasses = classes.filter(item => item.active && item.session === session);
  const groups = [...new Set(sessionClasses.map(item => item.year))].sort((a, b) => Number(a) - Number(b));
  return <details className={`org-session ${session.toLowerCase()}`} open>
    <summary><span><span className="org-session-icon">{session === "Pagi" ? "☀️" : "🌇"}</span><span><strong>Sidang {session}</strong><small>{officers.length} pegawai · {sessionClasses.length} kelas</small></span></span><ChevronDown size={20}/></summary>
    <div className="org-session-body"><div className="org-officers">{officers.length ? officers.map(member => <PersonCard key={member.id} member={member} year={year} imageVersion={imageVersion} token={token} compact/>) : <p className="org-muted">Belum ada pegawai sidang aktif.</p>}</div><div className="org-class-section"><h3>Guru-Guru Kelas — Sidang {session}</h3>{groups.length ? groups.map(group => <div className="org-year-group" key={group}><h4>Tahun {group}</h4><div className="org-class-list">{sessionClasses.filter(item => item.year === group).map(item => <article key={item.id}><strong>{item.name}</strong><span>{item.classTeacher || "Guru kelas belum ditetapkan"}</span></article>)}</div></div>) : <p className="org-muted">Tiada kelas aktif bagi sidang ini.</p>}</div></div>
  </details>;
}

function OrganizationEditor({ data, year, newYear, setNewYear, busy, mutate, uploadPhoto, token }: { data: OrgPayload; year: number; newYear: number; setNewYear: (value: number) => void; busy: string; mutate: (input: Record<string, unknown>, success: string) => Promise<void>; uploadPhoto: (member: OrgMember, file?: File) => Promise<void>; token: string }) {
  const [members, setMembers] = useState(data.members);
  const [classes, setClasses] = useState(data.classes);
  // Refresh editor drafts after a successful shared-data mutation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMembers(data.members); setClasses(data.classes); }, [data]);
  const updateMember = (id: string, patch: Partial<OrgMember>) => setMembers(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  const updateClass = (id: string, patch: Partial<OrgClass>) => setClasses(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  function chooseTeacher(member: OrgMember, teacherId: string) { const teacher = data.teachers.find(item => item.id === teacherId); updateMember(member.id, { teacherId: teacherId || null, displayName: teacher?.name || member.displayName }); }
  function chooseClassTeacher(item: OrgClass, teacherId: string) { const teacher = data.teachers.find(value => value.id === teacherId); updateClass(item.id, { classTeacherId: teacherId || null, classTeacher: teacher?.name || "" }); }
  return <div className="org-editor">
    <div className="org-editor-title"><div><span><ShieldCheck size={16}/> SUPER ADMIN</span><h3>Tetapan Carta Organisasi Disiplin</h3><p>Perubahan disimpan dalam data bersama dan akan kelihatan pada semua peranti.</p></div><div className="org-copy-year"><Input type="number" min={2020} max={2100} value={newYear} onChange={event => setNewYear(Number(event.target.value))}/><Button onClick={() => mutate({ action: "createYear", academicYear: newYear, sourceYear: year }, `Carta ${newYear} berjaya diwujudkan daripada ${year}.`)} disabled={Boolean(busy) || newYear === year}><CopyPlus size={16}/>Cipta Tahun Baharu</Button></div></div>
    <div className="org-editor-section"><div className="org-editor-section-head"><div><h4>Pegawai carta</h4><p>Ubah nama, jawatan, susunan, sidang, gambar dan status.</p></div><Button variant="outline" onClick={() => setMembers(items => [...items, { id: crypto.randomUUID(), academicYear: year, teacherId: null, displayName: "", position: "Guru Disiplin", level: "sidang", session: "Pagi", sortOrder: items.length + 1, active: true, hasPhoto: false }])}><Plus size={16}/>Tambah Pegawai</Button></div>
      <div className="org-admin-list">{members.map(member => <article className={!member.active ? "inactive" : ""} key={member.id}><div className="org-admin-photo"><PersonCard member={member} year={year} imageVersion={0} token={token} compact/><label><Camera size={15}/>{busy === `photo-${member.id}` ? "Menyimpan…" : "Upload / Tukar Gambar"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void uploadPhoto(member, event.target.files?.[0]); event.target.value = ""; }}/></label></div><div className="org-admin-fields"><label>Pilih daripada daftar guru<select value={member.teacherId || ""} onChange={event => chooseTeacher(member, event.target.value)}><option value="">Nama manual</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label>Nama paparan<Input value={member.displayName} onChange={event => updateMember(member.id, { displayName: event.target.value })}/></label><label>Jawatan<Input value={member.position} onChange={event => updateMember(member.id, { position: event.target.value })}/></label><label>Kedudukan<select value={member.level} onChange={event => updateMember(member.id, { level: event.target.value as OrgMember["level"], session: event.target.value === "sidang" ? member.session || "Pagi" : null })}>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{member.level === "sidang" && <label>Sidang<select value={member.session || "Pagi"} onChange={event => updateMember(member.id, { session: event.target.value as "Pagi" | "Petang" })}><option>Pagi</option><option>Petang</option></select></label>}<label>Susunan<Input type="number" min={0} value={member.sortOrder} onChange={event => updateMember(member.id, { sortOrder: Number(event.target.value) })}/></label><label className="org-check"><input type="checkbox" checked={member.active} onChange={event => updateMember(member.id, { active: event.target.checked })}/>Aktif</label><Button onClick={() => mutate({ action: "saveMember", ...member, academicYear: year }, `${member.displayName || "Pegawai"} berjaya disimpan.`)} disabled={Boolean(busy) || !member.displayName.trim() || !member.position.trim()}><Save size={16}/>Simpan</Button></div></article>)}</div>
    </div>
    <div className="org-editor-section"><div className="org-editor-section-head"><div><h4>Pengurusan kelas &amp; Guru Kelas</h4><p>Bahagian ini mengemas kini jadual kelas yang sama—tiada pangkalan data kedua.</p></div><Button variant="outline" onClick={() => setClasses(items => [...items, { id: crypto.randomUUID(), academicYear: year, year: "", name: "", session: "Petang", classTeacherId: null, classTeacher: "", active: true }])}><Plus size={16}/>Tambah Kelas</Button></div>
      <div className="org-class-admin">{classes.map(item => <article className={!item.active ? "inactive" : ""} key={item.id}><label>Tahun<Input value={item.year} onChange={event => updateClass(item.id, { year: event.target.value })}/></label><label>Nama kelas<Input value={item.name} onChange={event => updateClass(item.id, { name: event.target.value })}/></label><label>Sidang<select value={item.session} onChange={event => updateClass(item.id, { session: event.target.value as "Pagi" | "Petang" })}><option>Pagi</option><option>Petang</option></select></label><label>Guru Kelas<select value={item.classTeacherId || ""} onChange={event => chooseClassTeacher(item, event.target.value)}><option value="">Belum ditetapkan</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label className="org-check"><input type="checkbox" checked={item.active} onChange={event => updateClass(item.id, { active: event.target.checked })}/>Aktif</label><Button onClick={() => mutate({ action: "saveClass", ...item, academicYear: year }, `${item.name || "Kelas"} berjaya disimpan.`)} disabled={Boolean(busy) || !item.year.trim() || !item.name.trim()}><Save size={16}/>Simpan</Button></article>)}</div>
    </div>
  </div>;
}
