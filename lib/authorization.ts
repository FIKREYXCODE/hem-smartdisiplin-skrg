import type { AuthUser, CaseRecord } from "./school";
import { isSuperAdmin, roleScopes } from "./auth";

export type CaseView = "mine" | "class" | "discipline" | "admin";
export type AccessContext = { role: "super_admin" | "reporter" | "class_teacher" | "discipline" | "school_admin"; classIds: string[] };
export function accessContext(user: AuthUser, request?: Request): AccessContext {
  if (isSuperAdmin(user)) {
    const preview = request?.headers.get("X-View-As");
    if (preview === "reporter" || preview === "discipline" || preview === "school_admin") return { role: preview, classIds: [] };
    if (preview === "class_teacher") return { role: preview, classIds: [request?.headers.get("X-View-As-Class") || ""].filter(Boolean) };
    return { role: "super_admin", classIds: [] };
  }
  const role = user.activeRole;
  if (role === "reporter" || role === "class_teacher" || role === "discipline" || role === "school_admin") {
    return { role, classIds: role === "class_teacher" ? roleScopes(user, "class_teacher") : [] };
  }
  return { role: "reporter", classIds: [] };
}
export function canViewAllCases(user: AuthUser, request?: Request) {
  return ["super_admin", "discipline", "school_admin"].includes(accessContext(user, request).role);
}
export function canUseView(user: AuthUser, view: CaseView, request?: Request) {
  const role = accessContext(user, request).role;
  if (role === "super_admin") return true;
  if (view === "mine") return role === "reporter";
  if (view === "class") return role === "class_teacher";
  if (view === "discipline") return role === "discipline";
  return role === "school_admin";
}
export function canViewCase(user: AuthUser, record: CaseRecord, request?: Request) {
  const context = accessContext(user, request);
  if (["super_admin", "discipline", "school_admin"].includes(context.role)) return true;
  if (context.role === "reporter") return record.reporterId === user.id;
  return context.role === "class_teacher" && context.classIds.includes(record.classId);
}
