import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const brandingRoute = readFileSync(new URL("../app/api/branding/route.ts", import.meta.url), "utf8");

assert.match(page, /view==="dashboard"&&<RoleWorkspaceHero/, "Panel buka ruang kerja mesti hanya muncul pada dashboard.");
assert.match(page, /view==="admin"\?<AdminRecordToolbar/, "Pentadbir mesti menerima toolbar rekod ringkas.");
assert.match(page, /view==="discipline"\|\|view==="admin"\)&&<ManagementStats/, "Kad status mesti tersedia untuk Guru Disiplin dan Pentadbir.");
assert.match(page, /className="case-status-button" onClick=\{\(\)=>onOpen\(r\)\}/, "Status setiap kes mesti boleh membuka ruang respons.");
assert.match(page, /Buka & beri keputusan/, "Pentadbir mesti mempunyai tindakan respons yang jelas.");
assert.match(page, /Buka & ambil tindakan/, "Guru Disiplin mesti mempunyai tindakan respons yang jelas.");
assert.match(page, /label="Carta Organisasi"/, "Carta Organisasi mesti muncul sebagai menu desktop untuk semua peranan.");
assert.match(page, />Organisasi<\/button>/, "Carta Organisasi mesti boleh dibuka daripada navigasi telefon.");
assert.match(page, /Modul HEM lengkap/, "Dashboard peranan mesti menyediakan jalan terus ke modul berasaskan video rujukan.");
assert.match(page, /view==="admin"&&brandingPanel/, "Pentadbir Sekolah mesti menerima tetapan gambar header.");
assert.match(brandingRoute, /actor\.activeRole !== "school_admin"/, "API header mesti membenarkan Pentadbir Sekolah dan System Admin sahaja.");
assert.match(brandingRoute, /site_header_updated/, "Perubahan gambar header mesti direkod dalam audit.");

console.log("Ujian ruang kerja lulus: role, status, modul HEM, carta organisasi dan tetapan header tersedia.");
