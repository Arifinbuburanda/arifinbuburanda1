# UPterindo

Prototipe web aplikasi manajemen budidaya pertanian oleh **Terindo Group** (PT Tetra Jaya Plusindo). Dibangun sebagai *clickable prototype* (HTML/CSS/JS di sisi klien) yang dilayani oleh server Node.js/Express sederhana — siap di-deploy ke hosting Node mana pun atau domain sendiri.

🔗 **Demo:** jalankan server (lihat di bawah) lalu buka `http://localhost:3000/`, klik **"Buka Aplikasi"**, atau langsung ke `/app.html`.

---

## Struktur repo

```
.
├── server.js                # Server Express — melayani folder /public
├── package.json              # Dependencies & scripts (start, dev)
├── public/
│   ├── index.html             # Landing page / halaman showcase produk
│   ├── app.html                # Aplikasi interaktif UPterindo (prototype utama)
│   └── assets/
│       ├── terindo-icon-transparent.png
│       ├── terindo-icon-256.png
│       └── screenshots/        # Cuplikan layar aplikasi untuk landing page
└── README.md
```

- **`public/index.html`** — halaman depan (marketing/showcase): ringkasan fitur, daftar modul, peran pengguna, dan cuplikan tampilan. Ini yang tampil di `/`.
- **`public/app.html`** — aplikasi prototipe yang sesungguhnya: login, 4 peran pengguna, dan seluruh modul fungsional. Diakses lewat `/app.html` atau `/app`. File ini self-contained (semua CSS & JS inline, tanpa dependency eksternal/CDN) sehingga tetap tampil normal meski offline atau CDN diblokir.
- **`server.js`** — server statis Express minimal: melayani isi `/public`, menyediakan alias `/app` → `app.html`, endpoint `/healthz` untuk uptime monitor, dan fallback 404 ke landing page.

## Menjalankan secara lokal

```bash
npm install
npm start
```

Lalu buka `http://localhost:3000/`. Port bisa diganti lewat environment variable `PORT` (mis. `PORT=8080 npm start`).

Untuk auto-reload saat development:

```bash
npm run dev
```

## Deploy ke hosting Node (Render, Railway, Fly.io, VPS, dsb.)

Karena sudah berbentuk aplikasi Node/Express standar, tinggal hubungkan repo ke platform hosting pilihan Anda dengan pengaturan:

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Port:** otomatis mengikuti env var `PORT` yang disediakan platform (sudah ditangani di `server.js`)

Setelah domain sendiri aktif, arahkan saja DNS (A/CNAME record) ke hosting tersebut — tidak ada perubahan kode yang diperlukan.

## Deploy ke GitHub Pages (opsional, untuk demo statis sementara)

GitHub Pages hanya melayani file statis (tidak menjalankan `server.js`), tapi karena `public/` berisi file HTML murni, folder itu tetap bisa di-deploy langsung sebagai situs statis:

1. Push repo ini ke GitHub.
2. Buka **Settings → Pages** pada repo.
3. Pilih source: branch `main`, folder **`/public`**.
4. Situs akan tersedia di `https://<username>.github.io/<nama-repo>/`.

> Catatan: di dalam `public/`, semua path memakai path relatif (`assets/...`, `app.html`) sehingga tetap berfungsi baik di subpath GitHub Pages maupun di domain kustom nanti.

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
