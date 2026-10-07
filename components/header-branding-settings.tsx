"use client";

import { useState } from "react";
import { ImagePlus, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Branding = { hasHeaderImage: boolean; updatedAt: string | null };
type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;

export function HeaderBrandingSettings({ authFetch, branding, onUpdated, notify, previewUrl, logoUrl }: { authFetch: Fetcher; branding: Branding; onUpdated: (branding: Branding) => void; notify: (message: string) => void; previewUrl: string; logoUrl: string }) {
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) return notify("Gunakan gambar JPG, PNG atau WebP sehingga 8 MB.");
    setBusy(true);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await authFetch("/api/branding", { method: "POST", body });
      const data = await response.json() as Branding & { error?: string };
      if (!response.ok) throw new Error(data.error || "Gambar header belum dapat disimpan.");
      onUpdated(data); notify("Gambar header baharu berjaya disimpan dan direkodkan dalam audit.");
    } catch (error) { notify(error instanceof Error ? error.message : "Gambar header belum dapat disimpan."); }
    finally { setBusy(false); }
  }
  async function reset() {
    if (!window.confirm("Kembalikan header kepada tema asal? Gambar lama tidak akan memadam rekod atau laporan.")) return;
    setBusy(true);
    try {
      const response = await authFetch("/api/branding", { method: "DELETE" });
      const data = await response.json() as Branding & { error?: string };
      if (!response.ok) throw new Error(data.error || "Header belum dapat dikembalikan.");
      onUpdated(data); notify("Header telah dikembalikan kepada tema asal.");
    } catch (error) { notify(error instanceof Error ? error.message : "Header belum dapat dikembalikan."); }
    finally { setBusy(false); }
  }
  return <section className="header-branding-card"><div className="header-branding-preview">{branding.hasHeaderImage && previewUrl ? <img src={previewUrl} alt="Pratonton gambar header semasa"/> : <div><img src={logoUrl} alt="Logo SK Ranggu"/><span>Tema asal HEM SmartDisiplin</span></div>}</div><div className="header-branding-copy"><span><ShieldCheck/> TETAPAN PENTADBIR</span><h3>Gambar Header Sistem</h3><p>Pentadbir boleh menukar latar header untuk semua peranan. Logo sekolah kekal menggunakan fail cut-out supaya kelihatan kemas.</p><small>Disyorkan: gambar landskap sekurang-kurangnya 1600 × 320 piksel.</small><div><label className="header-upload"><ImagePlus/>{busy ? "Menyimpan…" : branding.hasHeaderImage ? "Tukar gambar header" : "Muat naik gambar header"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }}/></label>{branding.hasHeaderImage && <Button type="button" variant="outline" disabled={busy} onClick={()=>void reset()}><RotateCcw/>Tema asal</Button>}</div></div></section>;
}
