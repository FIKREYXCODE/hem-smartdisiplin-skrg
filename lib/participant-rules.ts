export type ParticipantInput = { studentId: string; classId: string };

export function normalizeParticipants(value: unknown, legacy?: ParticipantInput): ParticipantInput[] {
  const rows = Array.isArray(value) ? value : legacy ? [legacy] : [];
  const seen = new Set<string>();
  const normalized: ParticipantInput[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const studentId = String((row as Record<string, unknown>).studentId || "").trim();
    const classId = String((row as Record<string, unknown>).classId || "").trim();
    if (!studentId || !classId || seen.has(studentId)) continue;
    seen.add(studentId);
    normalized.push({ studentId, classId });
  }
  return normalized;
}

export function participantClassIds(participants: { classId: string }[], legacyClassId = "") {
  return [...new Set((participants.length ? participants.map(item => item.classId) : [legacyClassId]).filter(Boolean))];
}

export function isCaseInClassScope(participants: { classId: string }[], legacyClassId: string, scopes: string[]) {
  return participantClassIds(participants, legacyClassId).some(classId => scopes.includes(classId));
}
