"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Camera, CopyPlus, Network, Plus, Save, Settings2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { positionTitle } from "@/lib/position-title";

type OrgMember = {
  id: string; academicYear: number; teacherId: string | null; displayName: string; position: string;
  unit: string; roleLabel: string; hierarchyLevel: number; level: string; session: "Pagi" | "Petang" | null;
  sortOrder: number; active: boolean; hasPhoto: boolean;
};
type OrgTeacher = { id: string; name: string; position: string };
type OrgPayload = { year: number; years: { year: number; active: boolean }[]; members: OrgMember[]; teachers: OrgTeacher[]; error?: string };

const backend = "https://hem-smartdisiplin-ranggu.afiqzkablemo.chatgpt.site";
const endpoint = (path: string) => `${typeof window !== "undefined" && window.location.hostname === "fikreyxcode.github.io" ? backend : ""}${path}`;
const hierarchyLabels: Record<number, string> = { 1: "Guru Besar", 2: "Penolong Kanan", 3: "Penyelaras / Ketua Unit", 4: "Guru Disiplin / Ahli", 5: "Sokongan Lain" };

async function squareCrop(file: File) {
  try {
    const bitmap = await createImageBitmap(file); const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 720;
    const context = canvas.getContext("2d"); if (!context) return file;
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 720, 720); bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .88));
    return blob ? new File([blob], "profil.webp", { type: "image/webp" }) : file;
  } catch { return file; }
}

export function OrganizationChart({ adminEnabled, token, onRosterReload, notify }: { adminEnabled: boolean; token: string; onRosterReload: () => void; notify: (message: string) => void }) {
  const initialYear = new Date().getFullYear();
  const [year, setYear] = useState(initialYear); const [data, setData] = useState<OrgPayload | null>(null);
  const [loading, setLoading] = useState(true); const [editing, setEditing] = useState(adminEnabled);
  const [busy, setBusy] = useState(""); const [newYear, setNewYear] = useState(initialYear + 1); const [imageVersion, setImageVersion] = useState(0);

  async function load(target = year) {
    setLoading(true);
    try {
      const response = await fetch(endpoint(`/api/discipline-organization?year=${target}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const next = await response.json() as OrgPayload; if (!response.ok) throw new Error(next.error || "Carta tidak dapat dimuatkan.");
      setData(next); if (next.year !== target) setYear(next.year);
    } catch (error) { notify(error instanceof Error ? error.message : "Carta tidak dapat dimuatkan."); }
    finally { setLoading(false); }
  }
  // Shared organization data follows the selected or server-active year.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(year); }, [year, token]);

  async function mutate(input: Record<string, unknown>, success: string) {
    setBusy(String(input.id || input.action || "save"));
    try {
      const cleanInput = typeof input.position === "string" ? { ...input, position: positionTitle(input.position) } : input;
      const response = await fetch(endpoint("/api/discipline-organization"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(cleanInput) });
      const next = await response.json() as OrgPayload; if (!response.ok) throw new Error(next.error || "Perubahan belum dapat disimpan.");
      setData(next); if (next.year !== year) setYear(next.year); notify(success); onRosterReload();
    } catch (error) { notify(error instanceof Error ? error.message : "Perubahan belum dapat disimpan."); }
    finally { setBusy(""); }
  }

  async function uploadPhoto(member: OrgMember, file?: File) {
    if (!file) return; setBusy(`photo-${member.id}`);
    try {
      const cropped = await squareCrop(file); const form = new FormData(); form.append("file", cropped);
      const response = await fetch(endpoint(`/api/discipline-organization/${member.id}/photo`), { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json() as { ok?: boolean; error?: string }; if (!response.ok) throw new Error(result.error || "Gambar belum dapat disimpan.");
      setImageVersion(value => value + 1); await load(); notify(`Gambar ${member.displayName} berjaya dikemas kini.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Gambar belum dapat disimpan."); }
    finally { setBusy(""); }
  }

  async function deletePhoto(member: OrgMember) {
    if (!window.confirm(`Padam gambar ${member.displayName}?`)) return; setBusy(`photo-${member.id}`);
    try {
      const response = await fetch(endpoint(`/api/discipline-organization/${member.id}/photo`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json() as { ok?: boolean; error?: string }; if (!response.ok) throw new Error(result.error || "Gambar belum dapat dipadam.");
      setImageVersion(value => value + 1); await load(); notify(`Gambar ${member.displayName} telah dipadam.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Gambar belum dapat dipadam."); }
    finally { setBusy(""); }
  }

  const activeMembers = useMemo(() => (data?.members || []).filter(member => member.active).sort((a, b) => a.hierarchyLevel - b.hierarchyLevel || a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName, "ms")), [data?.members]);
  const levels = [...new Set(activeMembers.map(member => member.hierarchyLevel))].sort((a, b) => a - b);
  const yearOptions = useMemo(() => (data?.years || []).map(item => item.year).sort((a, b) => b - a), [data?.years]);

  return <section className={`organization-page ${adminEnabled ? "organization-admin" : "organization-view"}`}>
    <div className="org-toolbar"><div><span className="org-kicker"><Network size={15}/> CARTA ORGANISASI SMARTDISIPLIN</span><h2>{adminEnabled ? "Pengurusan Carta Organisasi" : "Carta Organisasi"}</h2><p>{adminEnabled ? "Urus pegawai, gambar, hierarki dan tahun daripada satu sumber data bersama." : "Struktur pegawai SmartDisiplin yang ditetapkan oleh pentadbir sekolah."}</p></div><div className="org-toolbar-actions"><label>{adminEnabled ? "Tahun Organisasi" : "Tahun"}<select value={year} onChange={event => setYear(Number(event.target.value))}>{yearOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>{adminEnabled && <Button className="org-edit-button" onClick={() => setEditing(value => !value)}><Settings2 size={17}/>{editing ? "Tutup Tetapan" : "Urus Carta"}</Button>}</div></div>
    {data?.years.find(item => item.year === year)?.active === false && <div className="org-archive"><Archive size={17}/> Carta tahun {year} ialah rekod arkib dan tidak dipaparkan kepada pengguna biasa.</div>}
    {loading ? <div className="org-loading">Memuatkan carta organisasi…</div> : <>
      <div className="org-hierarchy" aria-label={`Carta organisasi SmartDisiplin ${year}`}>{levels.length ? levels.map((level, levelIndex) => <div className="org-level" key={level}>{levelIndex > 0 && <span className="org-level-connector"/>}<div className="org-level-title"><span>{level}</span><strong>{hierarchyLabels[level] || `Tahap ${level}`}</strong></div><div className="org-level-members">{activeMembers.filter(member => member.hierarchyLevel === level).map(member => <PersonCard key={member.id} member={member} year={year} imageVersion={imageVersion} token={token}/>)}</div></div>) : <div className="org-empty">Carta tahun {year} belum mempunyai pegawai aktif.</div>}</div>
      {editing && adminEnabled && data && <OrganizationEditor data={data} year={year} newYear={newYear} setNewYear={setNewYear} busy={busy} mutate={mutate} uploadPhoto={uploadPhoto} deletePhoto={deletePhoto} token={token} imageVersion={imageVersion}/>} </>}
  </section>;
}

function PersonCard({ member, year, imageVersion, token, compact = false }: { member: OrgMember; year: number; imageVersion: number; token: string; compact?: boolean }) {
  return <article className={`org-person ${compact ? "compact" : ""}`}><div className="org-avatar">{member.hasPhoto ? <ProfilePhoto member={member} year={year} imageVersion={imageVersion} token={token}/> : <UserRound aria-hidden="true"/>}</div><div><strong>{member.displayName}</strong><span>{positionTitle(member.position)}</span><small>{member.roleLabel}{member.unit ? ` · ${member.unit}` : ""}</small></div></article>;
}

function ProfilePhoto({ member, year, imageVersion, token }: { member: OrgMember; year: number; imageVersion: number; token: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => { let live = true; let objectUrl = ""; fetch(endpoint(`/api/discipline-organization/${member.id}/photo?v=${year}-${imageVersion}`), { headers: { Authorization: `Bearer ${token}` } }).then(response => response.ok ? response.blob() : Promise.reject()).then(blob => { objectUrl = URL.createObjectURL(blob); if (live) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl); }).catch(() => {}); return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [member.id, year, imageVersion, token]);
  return url ? <img src={url} alt={`Gambar ${member.displayName}`}/> : <UserRound aria-hidden="true"/>;
}

function OrganizationEditor({ data, year, newYear, setNewYear, busy, mutate, uploadPhoto, deletePhoto, token, imageVersion }: { data: OrgPayload; year: number; newYear: number; setNewYear: (value: number) => void; busy: string; mutate: (input: Record<string, unknown>, success: string) => Promise<void>; uploadPhoto: (member: OrgMember, file?: File) => Promise<void>; deletePhoto: (member: OrgMember) => Promise<void>; token: string; imageVersion: number }) {
  const [members, setMembers] = useState(data.members);
  // Editor drafts follow every successful shared-data mutation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMembers(data.members); }, [data]);
  const updateMember = (id: string, patch: Partial<OrgMember>) => setMembers(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  function chooseTeacher(member: OrgMember, teacherId: string) { const teacher = data.teachers.find(item => item.id === teacherId); updateMember(member.id, { teacherId: teacherId || null, displayName: teacher?.name || member.displayName, position: positionTitle(teacher?.position || member.position) }); }
  function removeMember(member: OrgMember) { if (window.confirm(`Padam rekod ${member.displayName || "pegawai ini"}? Tindakan ini tidak boleh dibatalkan.`)) void mutate({ action: "deleteMember", id: member.id, academicYear: year }, "Rekod pegawai telah dipadam."); }
  return <div className="org-editor"><div className="org-editor-title"><div><span><ShieldCheck size={16}/> SYSTEM ADMIN</span><h3>Pengurusan Carta Organisasi SmartDisiplin</h3><p>Hanya System Admin boleh membuat perubahan. Semua role membaca carta daripada data yang sama.</p></div><div className="org-copy-year"><Input type="number" min={2020} max={2100} value={newYear} onChange={event => setNewYear(Number(event.target.value))}/><Button onClick={() => mutate({ action: "createYear", academicYear: newYear, sourceYear: year }, `Carta ${newYear} berjaya disalin daripada ${year} dan dijadikan aktif.`)} disabled={Boolean(busy) || newYear === year}><CopyPlus size={16}/>Salin ke Tahun Baharu</Button></div></div>
    <div className="org-year-control"><div><strong>Tahun {year}</strong><span>{data.years.find(item => item.year === year)?.active ? "Tahun aktif — dipaparkan kepada semua pengguna" : "Tahun arkib"}</span></div>{!data.years.find(item => item.year === year)?.active && <Button variant="outline" onClick={() => mutate({ action: "setYearActive", academicYear: year }, `Carta ${year} kini menjadi carta aktif.`)}>Jadikan Tahun Aktif</Button>}</div>
    <div className="org-editor-section"><div className="org-editor-section-head"><div><h4>Senarai pegawai</h4><p>Tambah, pilih atau taip nama; kemudian tetapkan jawatan, bidang, peranan, hierarki dan susunan.</p></div><Button variant="outline" onClick={() => setMembers(items => [...items, { id: crypto.randomUUID(), academicYear: year, teacherId: null, displayName: "", position: "", unit: "Disiplin", roleLabel: "Ahli Jawatankuasa", hierarchyLevel: 4, level: "sidang", session: null, sortOrder: items.length + 1, active: true, hasPhoto: false }])}><Plus size={16}/>Tambah Pegawai</Button></div>
      <div className="org-admin-list">{[...members].sort((a,b)=>a.hierarchyLevel-b.hierarchyLevel||a.sortOrder-b.sortOrder).map(member => { const persisted = data.members.some(item => item.id === member.id); return <article className={!member.active ? "inactive" : ""} key={member.id}><div className="org-admin-photo"><PersonCard member={member} year={year} imageVersion={imageVersion} token={token} compact/><label className={!persisted ? "disabled" : ""}><Camera size={15}/>{!persisted ? "Simpan Rekod Dahulu" : busy === `photo-${member.id}` ? "Menyimpan…" : "Upload / Tukar Gambar"}<input disabled={!persisted || Boolean(busy)} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void uploadPhoto(member, event.target.files?.[0]); event.target.value = ""; }}/></label><Button variant="outline" className="org-delete-photo" onClick={() => void deletePhoto(member)} disabled={!persisted || !member.hasPhoto || Boolean(busy)}><Trash2 size={14}/>Padam Gambar</Button></div><div className="org-admin-fields"><label>Pilih daripada daftar guru<select value={member.teacherId || ""} onChange={event => chooseTeacher(member, event.target.value)}><option value="">Nama manual</option>{data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label>Nama Pegawai<Input value={member.displayName} onChange={event => updateMember(member.id, { displayName: event.target.value, teacherId: null })}/></label><label>Jawatan<Input value={positionTitle(member.position)} onChange={event => updateMember(member.id, { position: positionTitle(event.target.value) })}/></label><label>Bidang / Unit<Input value={member.unit} onChange={event => updateMember(member.id, { unit: event.target.value })}/></label><label>Peranan<Input value={member.roleLabel} onChange={event => updateMember(member.id, { roleLabel: event.target.value })}/></label><label>Tahap Hierarki<select value={member.hierarchyLevel} onChange={event => updateMember(member.id, { hierarchyLevel: Number(event.target.value) })}>{Object.entries(hierarchyLabels).map(([value,label]) => <option key={value} value={value}>{value} — {label}</option>)}</select></label><label>Susunan<Input type="number" min={1} max={999} value={member.sortOrder} onChange={event => updateMember(member.id, { sortOrder: Number(event.target.value) })}/></label><div className="org-status-actions"><span className={member.active ? "active" : "inactive"}>{member.active ? "Aktif" : "Tidak Aktif"}</span><Button variant="outline" onClick={() => updateMember(member.id, { active: !member.active })}>{member.active ? "Nyahaktif" : "Aktifkan"}</Button></div><Button onClick={() => mutate({ action: "saveMember", ...member, academicYear: year }, `${member.displayName || "Pegawai"} berjaya disimpan.`)} disabled={Boolean(busy) || !member.displayName.trim() || !positionTitle(member.position) || !member.unit.trim() || !member.roleLabel.trim()}><Save size={16}/>Simpan</Button><Button variant="destructive" onClick={() => removeMember(member)} disabled={!persisted || Boolean(busy)}><Trash2 size={16}/>Padam Rekod</Button></div></article>; })}</div>
    </div>
  </div>;
}
