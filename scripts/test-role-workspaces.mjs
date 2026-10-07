import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

assert.match(page, /view==="dashboard"&&<RoleWorkspaceHero/, "Panel buka ruang kerja mesti hanya muncul pada dashboard.");
assert.match(page, /view==="admin"\?<AdminRecordToolbar/, "Pentadbir mesti menerima toolbar rekod ringkas.");
assert.match(page, /view==="discipline"\|\|view==="admin"\)&&<ManagementStats/, "Kad status mesti tersedia untuk Guru Disiplin dan Pentadbir.");
assert.match(page, /className="case-status-button" onClick=\{\(\)=>onOpen\(r\)\}/, "Status setiap kes mesti boleh membuka ruang respons.");
assert.match(page, /Buka & beri keputusan/, "Pentadbir mesti mempunyai tindakan respons yang jelas.");
assert.match(page, /Buka & ambil tindakan/, "Guru Disiplin mesti mempunyai tindakan respons yang jelas.");

console.log("Ujian ruang kerja lulus: navigasi, status boleh klik dan paparan Pentadbir ringkas tersedia.");
