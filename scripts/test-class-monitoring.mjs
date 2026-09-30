import assert from "node:assert/strict";
import { studentMonitoringSignal } from "../lib/class-monitoring.ts";

const base = { trafficStatus: "green", location: "Kelas", notes: "Catatan lengkap", ssdmRequest: null };

assert.equal(studentMonitoringSignal([]), "none");
assert.equal(studentMonitoringSignal([base]), "complete");
assert.equal(studentMonitoringSignal([{ ...base, trafficStatus: "yellow" }]), "process");
assert.equal(studentMonitoringSignal([{ ...base, trafficStatus: "red" }]), "action");
assert.equal(studentMonitoringSignal([{ ...base, notes: "" }]), "action");
assert.equal(studentMonitoringSignal([{ ...base, ssdmRequest: { status: "pending" } }]), "process");
assert.equal(studentMonitoringSignal([{ ...base, ssdmRequest: { status: "returned" } }]), "action");
assert.equal(studentMonitoringSignal([
  base,
  { ...base, trafficStatus: "yellow" },
  { ...base, trafficStatus: "red" },
]), "action");

const mutable = [{ ...base, trafficStatus: "red" }];
assert.equal(studentMonitoringSignal(mutable), "action");
mutable[0] = { ...base, trafficStatus: "yellow" };
assert.equal(studentMonitoringSignal(mutable), "process");
mutable[0] = { ...base, trafficStatus: "green" };
assert.equal(studentMonitoringSignal(mutable), "complete");

console.log("Class monitoring signal tests passed.");
