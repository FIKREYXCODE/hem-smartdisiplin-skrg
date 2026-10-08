import assert from "node:assert/strict";
import { malaysiaDate, reportFieldError } from "../lib/report-rules.ts";

const valid={participantCount:1,requestedCount:1,location:"Kantin",categoryValid:true,date:"2026-10-08",time:"07:15",notes:"Butiran kejadian lengkap.",initialAction:""};
const sabahEarlyMorning=new Date("2026-10-07T16:30:00.000Z");
assert.equal(malaysiaDate(sabahEarlyMorning),"2026-10-08","Tarikh mesti mengikut waktu Sabah, bukan UTC.");
assert.equal(reportFieldError(valid,sabahEarlyMorning),null,"Laporan lengkap mesti diterima pada awal pagi Sabah.");
assert.match(reportFieldError({...valid,participantCount:0,requestedCount:0},sabahEarlyMorning)??"",/Tambah sekurang-kurangnya/);
assert.match(reportFieldError({...valid,notes:"pendek"},sabahEarlyMorning)??"",/10 aksara/);
assert.match(reportFieldError({...valid,date:"2026-10-09"},sabahEarlyMorning)??"",/tidak boleh melebihi/);
assert.match(reportFieldError({...valid,participantCount:1,requestedCount:2},sabahEarlyMorning)??"",/tidak sah/);
console.log("Ujian penghantaran laporan lulus: waktu Sabah, murid, tarikh dan butiran.");
