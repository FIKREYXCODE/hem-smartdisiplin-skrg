import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const printRules = [...css.matchAll(/@media print\s*\{([\s\S]*?)(?=\n\})/g)].map(match => match[1]).join("\n");

assert.match(printRules, /\.app-shell\s*\{display:block!important/, "App shell mesti kekal dipaparkan semasa cetakan.");
assert.doesNotMatch(printRules, /(?:^|,)\s*\.app-shell(?:,|\s*\{)\s*[^{}]*\{?display:none!important/, "App shell tidak boleh disembunyikan semasa cetakan.");
assert.match(printRules, /\.case-detail-shell\s*\{[^}]*display:block!important/, "Laporan lengkap mesti dipaparkan dalam mod cetakan.");
assert.match(printRules, /\.main-wrap[^{}]*\{display:none!important/, "Antara muka utama mesti disembunyikan daripada cetakan.");
assert.match(printRules, /\.official-audit\{break-inside:auto;page-break-inside:auto\}/, "Jadual audit mesti dibenarkan bersambung ke halaman berikutnya.");
assert.match(printRules, /\.official-audit thead\{display:table-header-group\}/, "Kepala jadual audit mesti diulang pada halaman baharu.");
assert.match(printRules, /\.official-audit tr\{break-inside:avoid;page-break-inside:avoid\}/, "Baris audit tidak boleh terpotong di antara halaman.");
assert.match(printRules, /\.official-case-lines>div\{[^}]*break-inside:avoid/, "Setiap baris butiran kes tidak boleh terpotong.");
assert.match(printRules, /\.official-print-sheet\{[^}]*width:100%!important[^}]*padding:6mm!important/, "Laporan A4 mesti menggunakan ruang halaman secara seimbang.");
assert.match(printRules, /\.official-evidence>div\{[^}]*display:flex!important[^}]*justify-content:center/, "Lampiran gambar mesti berada di tengah ruang cetakan.");
assert.match(printRules, /\.official-evidence \.secure-image\{[^}]*max-width:82mm/, "Saiz gambar cetakan mesti terkawal dan tidak menolak susun atur ke tepi.");
assert.match(printRules, /\.official-signatures\{[^}]*break-inside:avoid[^}]*page-break-inside:avoid/, "Ruangan tandatangan tidak boleh terpotong antara halaman.");
assert.match(page, /async function printReport\(\)/, "Butang cetak mesti menggunakan proses persediaan gambar.");
assert.match(page, /document\.querySelectorAll\("\.official-print-sheet \.secure-media\.is-image img"\)/, "Cetakan mesti menunggu semua gambar bukti.");
assert.match(page, /printableImageData\(blob\)/, "Gambar bukti mesti ditukar kepada data cetakan yang stabil.");
assert.match(page, /includeAudit&&<section className="official-audit"/, "Jejak audit cetakan mesti hanya disertakan apabila diminta.");
assert.match(page, /Sertakan audit/, "Pengguna mesti mempunyai pilihan untuk memasukkan audit dalam cetakan.");

console.log("Ujian cetakan lulus: gambar disediakan dahulu dan kandungan panjang bersambung tanpa memotong baris.");
