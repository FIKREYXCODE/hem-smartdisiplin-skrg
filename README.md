# HEM SmartDisiplin — SK Ranggu

Sistem pengisian, semakan dan analisis rekod salah laku murid untuk Sekolah Kebangsaan Ranggu, Tawau.

## Ciri utama

- Pengisian laporan berasaskan daftar guru, kelas dan murid rasmi.
- Sidang pagi untuk Tahun 1–3 dan sidang petang untuk Tahun 4–6.
- Paparan guru kelas bagi setiap kelas.
- Aliran Guru Disiplin → PK HEM → Guru Besar.
- Jejak audit kekal untuk cipta, kemas kini, semakan, penghapusan lembut dan pemulihan.
- Carian, penapis, analisis kategori/kelas/status, eksport CSV dan cetakan.
- Boleh dipasang sebagai PWA pada telefon atau komputer dengan ikon rasmi SmartDisiplin.
- Data peribadi tidak disimpan dalam repositori. Daftar dimuatkan terus ke D1 melalui proses import pentadbir.

## Perlindungan data

Fail sumber Excel, nombor MyKad dan rekod kes tidak boleh dimasukkan ke GitHub. Jadual aplikasi hanya menyimpan ID dalaman, nama, kelas, jawatan dan peranan yang diperlukan. Penghapusan kes ialah penghapusan lembut supaya jejak audit kekal.

## Pembangunan

Gunakan Node.js 22+. Jana dan jalankan migrasi Drizzle sebelum memulakan pelayan. Konfigurasi tapak berada dalam `.openai/hosting.json`.

## Kredit

Dibangunkan oleh **Cikgu Mohammad Fikrey bin Abdul Gapar**, SK Ranggu, Tawau.
