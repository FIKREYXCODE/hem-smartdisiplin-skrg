export const categories = [
  "Kehadiran / lewat",
  "Pakaian / kekemasan",
  "Tingkah laku",
  "Gangguan pembelajaran",
  "Buli / gangguan",
  "Kerosakan harta benda",
  "Rokok / vape / bahan terlarang",
  "Salah laku digital",
  "Lain-lain",
] as const;

export const classTeachers: Record<string, string> = {
  "1-iltizam": "WAFA FARHANA BINTI ABD KADIR",
  "1-jayyid": "NORLINA BINTI BAGWAS",
  "1-khoir": "FARIDAH BINTI SUNU",
  "1-mumtaz": "RASMAWATI BINTI TAUSE",
  "2-iltizam": "MOHAMMAD IKHWAN BIN ABDURAIS",
  "2-jayyid": "MARINI BINTI LADI",
  "2-khoir": "S.LILI BINTI LADI",
  "2-mumtaz": "SITI JAWARA BINTI LUKMAN",
  "3-iltizam": "JAINAH BINTI SULAIMAN",
  "3-jayyid": "AINATUN NADHIRAH BINTI DHARMAWI",
  "3-khoir": "JAIBY BIN JULIAN",
  "3-mumtaz": "NUR FAEZAH BINTI BANTALANI",
  "4-iltizam": "ROSIDIAN BIN IDRIS",
  "4-jayyid": "NOZE BINTI TUKIJAN",
  "4-khoir": "MASTURAH BINTI TUDA",
  "4-mumtaz": "NURUL ANISA BINTI SAPARUDIN",
  "5-iltizam": "WAN MUHAMAD YUSUF BIN WAN ABDUL AZIZ",
  "5-jayyid": "RINI BINTI DAUD",
  "5-khoir": "TANJANG BIN TURE",
  "5-mumtaz": "HAMSIAH BINTI HAMID",
  "6-iltizam": "AG KU KEMAINDDRA BIN PG MOHD TAIB",
  "6-jayyid": "MASNIYA BINTI ABDULLAH SANI",
  "6-khoir": "MOHD ALFAIZAL BIN DAUD",
  "6-mumtaz": "BAJAM BINTI LADUNG",
};

export const sessionForYear = (year: string | number) => Number(year) <= 3 ? "Petang" : "Pagi";

export type Role = "Pelapor" | "Guru Kelas" | "Guru Disiplin" | "Pentadbir Sekolah" | "System Admin" | "Super Admin" | "PK HEM" | "Guru Besar";
export type AccessRole = "reporter" | "class_teacher" | "discipline" | "school_admin" | "system_admin";
export type UserRoleAssignment = { role: AccessRole; scopeId?: string | null; position?: string };
export type AuthUser = { id: string; name: string; position: string; roles: UserRoleAssignment[]; activeRole?: AccessRole; superAdmin?: boolean };
export type CaseStatus = "disiplin" | "pk" | "besar" | "selesai";
export type TrafficStatus = "red" | "yellow" | "green";
export type AuditEvent = {
  id: string;
  actorName: string;
  actorRole: Role;
  eventType: "cipta" | "kemas_kini" | "semakan" | "hapus" | "pulih" | "lampiran" | "tindakan_disiplin" | "pengesahan_admin" | "permohonan_ssdm" | "keputusan_ssdm";
  action: string;
  createdAt: string;
  beforeData?: string | null;
  afterData?: string | null;
};
export type CaseAttachment = {
  id: string; filename: string; contentType: string; size: number;
  uploadedByName: string; createdAt: string;
};
export type DisciplineAction = { id: string; actionType: string; actionTypes: string[]; otherAction: string; details: string; actionDate: string; actionTime: string; additionalNotes: string; pupilFeedback: string; parentFeedback: string; officerId: string; officerName: string; createdAt: string };
export type AdminConfirmation = { id: string; decision: "acknowledged" | "further_action"; adminId: string; adminName: string; position: string; notes: string; createdAt: string };
export type SsdmRequest = { id: string; pupilParentFeedback: string; pupilFeedback: string; parentFeedback: string; recommendation: string; otherRecommendation: string; extraNotes: string; status: "pending" | "approved" | "rejected" | "returned" | "needs_further_action" | "recorded"; requestedById: string; requestedByName: string; requestedAt: string; decidedById?: string | null; decidedByName?: string | null; decidedByPosition?: string | null; decidedAt?: string | null; adminNotes: string; recordedAt?: string | null; recordedById?: string | null; recordedByName?: string | null };
export type Teacher = { id: string; name: string; position: string; role: Role };
export type SchoolClass = { id: string; year: string; name: string; session: "Pagi" | "Petang"; classTeacher: string; students: { id: string; name: string }[] };
export type CaseParticipant = { id: string; studentId?: string | null; studentName: string; classId: string; className: string };
export type CaseRecord = {
  id: string; reporter: string; reporterId?: string | null; session: string; classId: string; className: string;
  student: string; studentId?: string | null; date: string; time: string; category: string; notes: string;
  initialAction: string; location: string; trafficStatus: TrafficStatus; status: CaseStatus; createdAt: string; updatedAt: string; deletedAt?: string | null;
  adminReviewRequested: boolean; adminReviewRequestedAt?: string | null; deletedBy?: string | null; participants: CaseParticipant[]; events: AuditEvent[]; attachments: CaseAttachment[]; disciplineActions: DisciplineAction[]; adminConfirmations: AdminConfirmation[]; ssdmRequest?: SsdmRequest | null;
};

export const disciplineActionOptions = ["Teguran", "Nasihat", "Amaran lisan", "Amaran bertulis", "Sesi kaunseling", "Hubungi ibu bapa / penjaga", "Pertemuan ibu bapa / penjaga", "Siasatan lanjut", "Rujukan Guru Kelas", "Rujukan Guru Bimbingan dan Kaunseling", "Rujukan PK HEM", "Rujukan Guru Besar", "Pemantauan murid", "Lain-lain"] as const;
export const ssdmRecommendationOptions = ["Dicadangkan direkodkan dalam SSDM", "Tidak perlu direkodkan dalam SSDM", "Perlu siasatan lanjut", "Perlu pertemuan ibu bapa / penjaga", "Perlu dirujuk kepada PK HEM", "Perlu dirujuk kepada Guru Besar", "Lain-lain"] as const;
export const adminPositions = ["Guru Besar", "Penolong Kanan Pentadbiran / PK1", "Penolong Kanan HEM", "Penolong Kanan Kokurikulum", "Penolong Kanan Petang"] as const;
