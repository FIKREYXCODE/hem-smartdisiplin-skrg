export type ReportFieldCheck = {
  participantCount: number;
  requestedCount: number;
  location: string;
  categoryValid: boolean;
  date: string;
  time: string;
  notes: string;
  initialAction: string;
};

export function malaysiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function reportFieldError(input: ReportFieldCheck, now = new Date()) {
  if (!input.participantCount) return "Tambah sekurang-kurangnya seorang murid menggunakan butang Tambah Murid.";
  if (input.participantCount > 50) return "Maksimum 50 murid boleh dimasukkan dalam satu laporan.";
  if (input.participantCount !== input.requestedCount) return "Senarai murid mengandungi pilihan berulang atau tidak sah. Buang pilihan tersebut dan tambah semula.";
  if (!input.categoryValid) return "Pilih jenis salah laku daripada senarai yang disediakan.";
  if (!input.location) return "Masukkan lokasi kejadian.";
  if (input.location.length > 200) return "Lokasi kejadian terlalu panjang. Gunakan maksimum 200 aksara.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "Pilih tarikh kejadian yang sah.";
  if (input.date > malaysiaDate(now)) return "Tarikh kejadian tidak boleh melebihi tarikh hari ini di Sabah.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return "Pilih masa kejadian yang sah.";
  if (input.notes.length < 10) return "Butiran kejadian mesti sekurang-kurangnya 10 aksara.";
  if (input.notes.length > 3000) return "Butiran kejadian terlalu panjang. Gunakan maksimum 3,000 aksara.";
  if (input.initialAction.length > 1500) return "Catatan tambahan terlalu panjang. Gunakan maksimum 1,500 aksara.";
  return null;
}
