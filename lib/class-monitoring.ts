import type { CaseRecord } from "@/lib/school";

export type StudentMonitoringSignal = "none" | "complete" | "process" | "action";

type MonitoringCase = Pick<CaseRecord, "trafficStatus" | "location" | "notes" | "ssdmRequest">;

const actionSsdmStatuses = new Set(["rejected", "returned", "needs_further_action"]);
const processSsdmStatuses = new Set(["pending", "approved"]);

export function studentMonitoringSignal(records: MonitoringCase[]): StudentMonitoringSignal {
  if (!records.length) return "none";
  if (records.some(record =>
    record.trafficStatus === "red" ||
    !record.location?.trim() ||
    !record.notes?.trim() ||
    (record.ssdmRequest && actionSsdmStatuses.has(record.ssdmRequest.status))
  )) return "action";
  if (records.some(record =>
    record.trafficStatus === "yellow" ||
    (record.ssdmRequest && processSsdmStatuses.has(record.ssdmRequest.status))
  )) return "process";
  return "complete";
}

export const studentSignalLabels: Record<StudentMonitoringSignal, string> = {
  none: "Tiada Kes",
  complete: "Kes Selesai",
  process: "Dalam Proses",
  action: "Perlu Tindakan",
};
