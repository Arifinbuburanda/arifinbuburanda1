# UPterindo

Prototipe web aplikasi manajemen budidaya pertanian oleh **Terindo Group** (PT Tetra Jaya Plusindo). Dibangun sebagai *clickable prototype* satu file (HTML/CSS/JS) untuk memvalidasi alur kerja, tampilan, dan cakupan fitur sebelum masuk ke tahap pengembangan produksi.

🔗 **Demo:** buka `index.html` lalu klik **"Buka Aplikasi"**, atau langsung buka `app.html`.

---

## Struktur repo

```
.
├── index.html              # Landing page / halaman showcase produk
├── app.html                 # Aplikasi interaktif UPterindo (prototype utama)
├── assets/
│   ├── terindo-icon-transparent.png
│   ├── terindo-icon-256.png
│   └── screenshots/         # Cuplikan layar aplikasi untuk landing page
└── README.md
```

- **`index.html`** — halaman depan (marketing/showcase): ringkasan fitur, daftar modul, peran pengguna, dan cuplikan tampilan. Cocok dijadikan halaman utama saat domain sudah aktif.
- **`app.html`** — aplikasi prototipe yang sesungguhnya: login, 4 peran pengguna, dan seluruh modul fungsional. File ini self-contained (semua CSS & JS inline, tanpa dependency eksternal/CDN) sehingga bisa langsung dibuka atau di-hosting di mana saja.

## Menjalankan secara lokal

Tidak perlu build step maupun server — cukup buka file langsung di browser:

```bash
open index.html      # macOS
# atau
start index.html     # Windows
```

Untuk pengalaman routing yang lebih rapi (disarankan saat development), jalankan static server sederhana dari root folder:

```bash
npx serve .
# atau
python3 -m http.server 8080
```

## Deploy ke GitHub Pages (opsional, untuk demo sementara)

1. Push folder ini ke repository GitHub.
2. Buka **Settings → Pages** pada repo.
3. Pilih source: branch `main`, folder `/ (root)`.
4. Situs akan tersedia di `https://<username>.github.io/<nama-repo>/`.

> Catatan: struktur ini memakai path relatif (`assets/...`, `app.html`) sehingga tetap berfungsi baik di subpath GitHub Pages (`/nama-repo/`) maupun di domain kustom nanti — tidak perlu diubah saat pindah hosting.

## Akun demo

Aplikasi memakai data tiruan (mock) tanpa backend — pilih salah satu akun pada layar login untuk masuk langsung sesuai peran:

| Nama | Peran |
|---|---|
| Budi Santoso, Siti Aminah, Joko Prasetyo | Pekerja Lapangan |
| Reza Pratama | Supervisor / Mandor |
| Rina Wulandari | Agronomis |
| Dedi Kurniawan | Admin Gudang |

## Cakupan fitur (17 modul)

Perencanaan Tanam · Manajemen Tugas · Scouting & OPT · Treatment Planner · SOP Library (bertahap per komoditas) · Database Bahan Aktif & Produk · Indeks Kompatibilitas Campuran · Peta Lahan · Kehadiran Tim · Approval Workflow · Rencana Kerja Harian · Rencana Kerja Bulanan · Laporan Harian (unduh PDF) · Laporan Bulanan (unduh PDF) · Laporan Hijau (sustainability) · Manajemen Gudang · Analisis Foto Tanaman berbasis AI.

## Catatan teknis

- **Tanpa dependency eksternal** — Tailwind CSS di-*compile* secara statis dan di-inline (bukan memuat dari CDN), sehingga tampilan tetap konsisten meski offline atau CDN diblokir.
- **Ekspor PDF** memakai dialog cetak bawaan browser (`window.print()` + CSS `@media print`) — tanpa library PDF eksternal, jadi ringan dan tidak rawan gagal build.
- **Analisis foto AI** terhubung ke OpenAI Vision API (butuh API key sendiri, diisi lewat menu "Pengaturan AI" di aplikasi). Karena panggilan dilakukan langsung dari browser, kemungkinan besar akan terblokir kebijakan CORS OpenAI kecuali diarahkan lewat backend proxy — pada kondisi ini aplikasi otomatis jatuh ke mode simulasi agar alur tetap bisa didemokan.
- Semua data (tugas, stok, laporan, dsb.) adalah data tiruan yang tersimpan di memori JavaScript (bukan database sungguhan) — refresh halaman akan mengembalikan ke data awal.

## Lisensi & kredit

Prototipe internal untuk **Terindo Group — PT Tetra Jaya Plusindo**. Sesuaikan bagian ini (mis. tambahkan `LICENSE`) sebelum repo dipublikasikan secara publik.
