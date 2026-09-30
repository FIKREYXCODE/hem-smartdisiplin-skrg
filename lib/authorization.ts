import type { AuthUser, CaseRecord } from "./school";
import { hasRole, roleScopes } from "./auth";

export type CaseView = "mine" | "class" | "discipline" | "admin";
export function canUseView(user: AuthUser, view: CaseView) {
  if (view === "mine") return true;
  if (view === "class") return hasRole(user, "class_teacher");
  if (view === "discipline") return hasRole(user, "discipline");
  return hasRole(user, "school_admin");
}
export function canViewCase(user: AuthUser, record: CaseRecord) {
  if (record.reporterId === user.id) return true;
  if (hasRole(user, "discipline")) return true;
  if (hasRole(user, "class_teacher") && roleScopes(user, "class_teacher").includes(record.classId)) return true;
  if (hasRole(user, "school_admin") && (record.adminReviewRequested || record.ssdmRequest?.status === "pending")) return true;
  return false;
}
