import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const brandingRoute = readFileSync(new URL("../app/api/branding/route.ts", import.meta.url), "utf8");

assert.match(page, /view==="dashboard"&&<RoleWorkspaceHero/, "Panel buka ruang kerja mesti hanya muncul pada dashboard.");
assert.match(page, /view==="admin"\?<AdminRecordToolbar/, "Pentadbir mesti menerima toolbar rekod ringkas.");
assert.match(page, /view==="admin"&&<>\{brandingPanel\}<ManagementStats/, "Kad status mesti kekal tersedia untuk Pentadbir.");
assert.match(page, /view==="discipline"\?<CaseCalendar records=\{active\}/, "Kalendar kes mesti menjadi paparan utama Guru Disiplin.");
assert.match(page, /function CaseCalendar\(/, "Komponen kalendar kes mesti wujud.");
assert.match(page, /Petak berwarna menunjukkan status paling utama/, "Kalendar mesti menerangkan warna seluruh petak kepada pengguna.");
assert.match(page, /className="calendar-case-table"/, "Kes pada tarikh dipilih mesti dipaparkan dalam jadual padat.");
assert.match(page, /<th>Kesalahan<\/th><th>Pelapor<\/th>/, "Jadual kalendar mesti menunjukkan kesalahan dan pelapor dengan jelas.");
assert.match(page, /function caseStatusText\(record:CaseRecord\)/, "Status setiap kes mesti menerangkan pihak yang sedang ditunggu.");
assert.match(page, /Menunggu pengesahan Pentadbir Sekolah/, "Penerima pengesahan mesti dinyatakan dengan jelas.");
assert.match(page, /Jejak audit disembunyikan/, "Dashboard System Admin tidak boleh memaparkan aktiviti audit secara automatik.");
assert.match(page, /Paparkan audit/, "System Admin mesti boleh meminta paparan audit apabila diperlukan.");
assert.match(page, /Paparkan jejak audit apabila diperlukan/, "Jejak audit setiap kes mesti tersembunyi sehingga diminta.");
assert.match(page, /p\.user\.superAdmin&&<section className="case-audit-disclosure"/, "Jejak audit butiran kes mesti terhad kepada Pentadbir Sistem.");
assert.doesNotMatch(page, /<h3>Jejak audit<\/h3><ol className="timeline">/, "Jejak audit tidak boleh muncul secara automatik di bawah butiran kes.");
assert.match(page, /<details className="action-picker">/, "Jenis tindakan Guru Disiplin mesti menggunakan senarai pilihan yang boleh dibuka dan ditatal.");
assert.match(page, /Maklum balas dan catatan tambahan/, "Medan tindakan pilihan mesti diringkaskan dalam bahagian boleh buka.");
assert.match(page, /className="review-box workflow-disclosure"/, "Permohonan SSDM mesti diringkaskan supaya halaman tindakan tidak terlalu panjang.");
assert.doesNotMatch(page, /Promise\.all\(\[loadSystem\(sessionToken\),loadActivity\(sessionToken\)\]\)/, "Audit tidak boleh dimuat secara automatik ketika login.");
assert.match(page, /className="case-status-button" onClick=\{\(\)=>onOpen\(r\)\}/, "Status setiap kes mesti boleh membuka ruang respons.");
assert.match(page, /Buka & beri keputusan/, "Pentadbir mesti mempunyai tindakan respons yang jelas.");
assert.match(page, /Buka & ambil tindakan/, "Guru Disiplin mesti mempunyai tindakan respons yang jelas.");
assert.match(page, /label="Carta Organisasi"/, "Carta Organisasi mesti muncul sebagai menu desktop untuk semua peranan.");
assert.match(page, />Organisasi<\/button>/, "Carta Organisasi mesti boleh dibuka daripada navigasi telefon.");
assert.match(page, /Modul HEM lengkap/, "Dashboard peranan mesti menyediakan jalan terus ke modul berasaskan video rujukan.");
assert.match(page, /view==="admin"&&<>\{brandingPanel\}/, "Pentadbir Sekolah mesti menerima tetapan gambar header.");
assert.match(brandingRoute, /actor\.activeRole !== "school_admin"/, "API header mesti membenarkan Pentadbir Sekolah dan System Admin sahaja.");
assert.match(brandingRoute, /site_header_updated/, "Perubahan gambar header mesti direkod dalam audit.");

console.log("Ujian ruang kerja lulus: role, status, modul HEM, carta organisasi dan tetapan header tersedia.");
