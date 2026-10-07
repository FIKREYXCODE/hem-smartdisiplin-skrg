import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const printRules = [...css.matchAll(/@media print\s*\{([\s\S]*?)(?=\n\})/g)].map(match => match[1]).join("\n");

assert.match(printRules, /\.app-shell\s*\{display:block!important/, "App shell mesti kekal dipaparkan semasa cetakan.");
assert.doesNotMatch(printRules, /(?:^|,)\s*\.app-shell(?:,|\s*\{)\s*[^{}]*\{?display:none!important/, "App shell tidak boleh disembunyikan semasa cetakan.");
assert.match(printRules, /\.case-detail-shell\s*\{[^}]*display:block!important/, "Laporan lengkap mesti dipaparkan dalam mod cetakan.");
assert.match(printRules, /\.main-wrap[^{}]*\{display:none!important/, "Antara muka utama mesti disembunyikan daripada cetakan.");

console.log("Ujian cetakan lulus: laporan kekal kelihatan, manakala menu aplikasi disembunyikan.");
