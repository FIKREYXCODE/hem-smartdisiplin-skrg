import assert from "node:assert/strict";
import { isCaseInClassScope, normalizeParticipants, participantClassIds } from "../lib/participant-rules.ts";

const make = (count, classes = ["1-iltizam"]) => Array.from({ length: count }, (_, index) => ({ studentId: `murid-${index + 1}`, classId: classes[index % classes.length] }));

for (const count of [1, 5, 10]) {
  const participants = normalizeParticipants(make(count));
  assert.equal(participants.length, count, `laporan ${count} murid mesti dikekalkan`);
}

const mixed = normalizeParticipants(make(10, ["1-iltizam", "4-mumtaz", "6-jayyid"]));
assert.deepEqual(participantClassIds(mixed), ["1-iltizam", "4-mumtaz", "6-jayyid"]);
assert.equal(isCaseInClassScope(mixed, "", ["4-mumtaz"]), true);
assert.equal(isCaseInClassScope(mixed, "", ["2-khoir"]), false);
assert.equal(normalizeParticipants([...make(2), make(2)[0]]).length, 2, "murid pendua ditolak");
assert.deepEqual(normalizeParticipants(undefined, { studentId: "legacy-1", classId: "legacy-class" }), [{ studentId: "legacy-1", classId: "legacy-class" }]);

console.log("Ujian peserta kes lulus: 1, 5, 10 murid, pelbagai kelas, pendua dan keserasian rekod lama.");
