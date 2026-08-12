/**
 * UPterindo — backend server
 * Express app yang melayani frontend statis (public/index.html), menyediakan
 * REST API untuk semua modul aplikasi, autentikasi berbasis sesi, dan
 * penyimpanan data persisten dalam file JSON (data/db.json).
 */

'use strict';

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const DEMO_PASSWORD = 'Terindo@2026';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

/* ===================== SEED DATA ===================== */
/* Data awal — dipakai hanya sekali untuk membuat data/db.json saat pertama
 * kali server dijalankan. Setelah itu, semua perubahan (tambah/ubah/hapus)
 * disimpan langsung ke data/db.json dan seed ini tidak dipakai lagi. */
const SEED_COLLECTIONS = {
  tasks: [
  {id:'WO-3381', act:'Aplikasi treatment ulat grayak', plot:'Blok A3 · Cabai', cycle:'CC-2026-018', time:'07:00 - 09:00', status:'Assigned', sop:['Periksa APD lengkap','Kalibrasi sprayer','Campur larutan sesuai dosis','Aplikasi merata pada area terdampak','Catat sisa larutan']},
  {id:'WO-3379', act:'Fertigasi rutin tahap vegetatif', plot:'Blok B2 · Melon', cycle:'CC-2026-014', time:'09:30 - 10:30', status:'In Progress', sop:['Cek EC & pH larutan','Buka valve zona 1','Jalankan fertigasi 25 menit','Catat volume aktual','Flushing jalur']},
  {id:'WO-3375', act:'Scouting mingguan', plot:'Blok A1 · Melon', cycle:'CC-2026-011', time:'13:00 - 14:00', status:'Submitted', sop:['Tentukan titik sampling','Amati 20 tanaman','Catat gejala & severity','Ambil foto dokumentasi']},
],

  historyList: [
  {act:'Panen & grading', plot:'Blok C1 · Jagung', date:'11 Agu 2026', status:'Approved'},
  {act:'Pruning & pengikatan', plot:'Blok A1 · Melon', date:'10 Agu 2026', status:'Approved'},
  {act:'Lapor masalah — defisiensi Ca', plot:'Blok B2 · Melon', date:'09 Agu 2026', status:'Under review'},
  {act:'Pemasangan mulsa', plot:'Blok C2 · Jagung', date:'08 Agu 2026', status:'Approved'},
  {act:'Pengapuran dasar', plot:'Blok A1 · Melon', date:'06 Agu 2026', status:'Approved'},
],

  syncQueue: [
  {name:'Laporan kerja WO-3375', state:'Tersinkron'},
  {name:'Foto observasi OBS-2291 (3 file)', state:'Menunggu sinkronisasi'},
  {name:'Laporan kerja WO-3370', state:'Tersimpan di perangkat'},
],

  kanbanCols: [
  {key:'draft', label:'Draft', color:'#9ca3af', items:[{id:'WO-3390', act:'Olah tanah Blok C3', plot:'Blok C3 · Jagung'}]},
  {key:'assigned', label:'Assigned', color:'#2563eb', items:[
    {id:'WO-3381', act:'Treatment ulat grayak', plot:'Blok A3 · Cabai'},
    {id:'WO-3384', act:'Pemasangan mulsa', plot:'Blok C2 · Jagung'},
  ]},
  {key:'inprogress', label:'In Progress', color:'#d97706', items:[
    {id:'WO-3379', act:'Fertigasi rutin', plot:'Blok B2 · Melon'},
    {id:'WO-3382', act:'Penyulaman', plot:'Blok A5 · Jagung'},
  ]},
  {key:'submitted', label:'Submitted', color:'#4338ca', items:[{id:'WO-3375', act:'Scouting mingguan', plot:'Blok A1 · Melon'}]},
  {key:'approved', label:'Approved', color:'#15803d', items:[
    {id:'WO-3360', act:'Panen & grading', plot:'Blok C1 · Jagung'},
    {id:'WO-3358', act:'Pruning & pengikatan', plot:'Blok A1 · Melon'},
  ]},
],

  incomingReports: [
  {worker:'Budi Santoso', act:'Fertigasi rutin', plot:'Blok B2', time:'10:32', status:'Menunggu'},
  {worker:'Siti Aminah', act:'Penyiangan gulma', plot:'Blok A5', time:'09:58', status:'Menunggu'},
  {worker:'Joko Prasetyo', act:'Scouting mingguan', plot:'Blok A1', time:'09:10', status:'Disetujui'},
  {worker:'Budi Santoso', act:'Pemasangan mulsa', plot:'Blok C2', time:'08:20', status:'Disetujui'},
],

  attendance: [
  {name:'Budi Santoso', team:'Regu Mawar', in:'06:02', loc:'Blok A3', status:'Hadir'},
  {name:'Siti Aminah', team:'Regu Melati', in:'06:05', loc:'Blok A5', status:'Hadir'},
  {name:'Joko Prasetyo', team:'Regu Mawar', in:'—', loc:'—', status:'Izin'},
  {name:'Yusuf Hidayat', team:'Regu Kenanga', in:'05:58', loc:'Blok B2', status:'Hadir'},
  {name:'Ani Wulan', team:'Regu Melati', in:'06:10', loc:'Blok A5', status:'Hadir'},
],

  openIssues: [
  {title:'Ulat grayak — Blok A3, Cabai', sev:4, status:'Under treatment'},
  {title:'Defisiensi Ca — Blok B2, Melon', sev:2, status:'Menunggu diagnosis'},
  {title:'Kutu kebul — Blok A5, Jagung', sev:2, status:'Monitoring'},
],

  approvalQueue: [
  {title:'Treatment: Emamektin Benzoat — Blok A3', type:'Treatment', requester:'Rina (Agronomis)'},
  {title:'PR-2026-0231 — Mankozeb 80WP 25kg', type:'Purchase Request', requester:'Rina (Agronomis)'},
  {title:'PR-2026-0233 — Sprayer Manual 15L x2', type:'Purchase Request', requester:'Dedi (Gudang)'},
],

  cropCycles: [
  {id:'CC-2026-018', crop:'Cabai', variety:'Lado F1', plot:'Blok A3', stage:'Vegetatif', progress:45, status:'ACTIVE'},
  {id:'CC-2026-014', crop:'Melon', variety:'Golden Alisha', plot:'Blok B2', stage:'Pembungaan', progress:62, status:'ACTIVE'},
  {id:'CC-2026-011', crop:'Melon', variety:'Sweet Net', plot:'Blok A1', stage:'Pembentukan Buah', progress:78, status:'ACTIVE'},
  {id:'CC-2026-009', crop:'Jagung', variety:'Bisi-18', plot:'Blok C1', stage:'Panen', progress:96, status:'HARVESTING'},
  {id:'CC-2026-020', crop:'Jagung', variety:'NK-212', plot:'Blok C2', stage:'Persiapan', progress:8, status:'PLANNED'},
],

  scoutingSessions: [
  {date:'12 Agu', plot:'Blok A3', scout:'Rina', find:'Ulat grayak', sev:4, status:'Escalated'},
  {date:'11 Agu', plot:'Blok B2', scout:'Yusuf', find:'Defisiensi Ca', sev:2, status:'Monitoring'},
  {date:'11 Agu', plot:'Blok A5', scout:'Rina', find:'Kutu kebul', sev:2, status:'Monitoring'},
  {date:'10 Agu', plot:'Blok A1', scout:'Rina', find:'Tidak ada gejala', sev:0, status:'Resolved'},
  {date:'09 Agu', plot:'Blok C1', scout:'Yusuf', find:'Tidak ada gejala', sev:0, status:'Resolved'},
],

  sopList: [
  {crop:'Melon', name:'SOP Budidaya Melon', version:'v3.2', berlaku:'2026-01-15', reviewer:'Rina Wulandari, Agronomis', stages:[
    {name:'1. Persiapan Lahan', items:['Pengukuran dan pembersihan lahan','Olah tanah dan pembuatan bedengan','Pengapuran (jika pH tanah di bawah target 6.0-6.5)']},
    {name:'2. Pemupukan Dasar & Mulsa', items:['Pemberian pupuk dasar (kandang + NPK dasar)','Pemasangan mulsa plastik hitam perak']},
    {name:'3. Persemaian & Tanam', items:['Persemaian benih (7-10 hari sebelum tanam)','Penanaman bibit ke lubang tanam','Penyulaman pada 7 HST']},
    {name:'4. Vegetatif', items:['Irigasi dan fertigasi rutin sesuai resep tahap','Pengikatan dan perambatan ke ajir/tali','Scouting mingguan hama & penyakit']},
    {name:'5. Pembungaan & Pembuahan', items:['Penyerbukan bantuan (jika populasi lebah rendah)','Seleksi/penjarangan buah per tanaman','Treatment preventif sesuai jadwal & hasil scouting']},
    {name:'6. Pematangan', items:['Pengurangan volume irigasi terkontrol (tingkatkan brix)','Pemasangan alas buah','Scouting pra-panen']},
    {name:'7. Panen & Pascapanen', items:['Panen sesuai kriteria matang petik (jaring penuh, aroma)','Grading dan sortasi berdasarkan ukuran & mutu','Sanitasi lahan dan penutupan crop cycle']},
  ]},
  {crop:'Cabai', name:'SOP Budidaya Cabai', version:'v2.1', berlaku:'2025-11-01', reviewer:'Rina Wulandari, Agronomis', stages:[
    {name:'1. Persiapan Lahan', items:['Pengukuran dan pembersihan lahan','Olah tanah dan pembuatan bedengan','Pengapuran (jika pH tanah di bawah target 5.5-6.5)']},
    {name:'2. Pemupukan Dasar & Mulsa', items:['Pemberian pupuk dasar (kandang + NPK dasar)','Pemasangan mulsa plastik hitam perak']},
    {name:'3. Persemaian & Tanam', items:['Persemaian benih (21-25 hari sebelum tanam)','Penanaman bibit ke lubang tanam','Penyulaman pada 7-10 HST']},
    {name:'4. Vegetatif', items:['Irigasi dan fertigasi rutin','Pemasangan ajir dan pengikatan batang','Scouting mingguan — waspada kutu kebul & thrips']},
    {name:'5. Pembungaan & Pembuahan', items:['Treatment preventif antraknosa sebelum musim hujan','Pemangkasan tunas air (wiwil)','Scouting intensif 2x/minggu saat cuaca lembap']},
    {name:'6. Panen Berulang', items:['Panen bertahap setiap 3-5 hari','Grading berdasarkan warna & ukuran','Sanitasi buah busuk/reject agar tidak jadi sumber infeksi']},
  ]},
  {crop:'Jagung', name:'SOP Budidaya Jagung', version:'v1.4', berlaku:'2025-09-10', reviewer:'Rina Wulandari, Agronomis', stages:[
    {name:'1. Persiapan Lahan', items:['Pengukuran dan pembersihan lahan','Olah tanah','Pembuatan larikan tanam']},
    {name:'2. Tanam & Pupuk Dasar', items:['Penanaman benih langsung (tugal), 2 benih/lubang','Pemberian pupuk dasar','Penyulaman pada 7 HST']},
    {name:'3. Vegetatif Awal', items:['Penyiangan gulma','Pupuk susulan 1 (21 HST)','Scouting ulat grayak (Spodoptera frugiperda)']},
    {name:'4. Vegetatif Lanjut & Berbunga', items:['Pupuk susulan 2 (35 HST)','Pembumbunan (hilling)','Scouting dan treatment bila ambang terlampaui']},
    {name:'5. Pengisian Tongkol', items:['Jaga kelembapan tanah — fase kritis air','Scouting penggerek tongkol']},
    {name:'6. Panen & Pascapanen', items:['Panen sesuai kadar air target (~25-28%)','Pengeringan dan grading','Sanitasi lahan']},
  ]},
],

  problemDict: [
  {name:'Ulat Grayak', sci:'Spodoptera frugiperda', crop:'Jagung, Cabai', desc:'Larva memakan daun muda dan pucuk, aktif malam hari.'},
  {name:'Antraknosa', sci:'Colletotrichum spp.', crop:'Cabai, Melon', desc:'Bercak cekung kehitaman pada buah, berkembang di kelembapan tinggi.'},
  {name:'Defisiensi Kalsium', sci:'—', crop:'Melon, Cabai', desc:'Blossom end rot, ujung buah membusuk kehitaman.'},
  {name:'Kutu Kebul', sci:'Bemisia tabaci', crop:'Cabai, Melon', desc:'Vektor virus kuning, populasi di bawah permukaan daun.'},
  {name:'Layu Fusarium', sci:'Fusarium oxysporum', crop:'Melon, Cabai', desc:'Layu permanen dimulai dari daun bawah, jaringan pembuluh menghitam.'},
],

  productDb: [
  {name:'Emamektin Benzoat 5WG', ai:'Emamektin benzoat', formulasi:'WG (water dispersible granule)', konsentrasi:'50 g/kg', cat:'Insektisida', reg:'RI.01.2024.011', status:'Approved', group:'A',
    dosis:'0.5 g/L air', phi:'3 hari', rei:'12 jam', hazard:'Kelas II — Cukup Berbahaya', ppe:'Masker, sarung tangan, kacamata pelindung',
    target:'Ulat grayak, ulat buah, ulat daun', komoditas:'Cabai, Melon, Jagung, Kubis', catatan:'Bersifat translaminar — efektif pada ulat yang bersembunyi di balik daun.'},
  {name:'Mankozeb 80WP', ai:'Mankozeb', formulasi:'WP (wettable powder)', konsentrasi:'800 g/kg', cat:'Fungisida', reg:'RI.01.2023.204', status:'Approved', group:'B',
    dosis:'2 g/L air', phi:'7 hari', rei:'24 jam', hazard:'Kelas III — Sedikit Berbahaya', ppe:'Masker, sarung tangan',
    target:'Antraknosa, bercak daun, busuk daun', komoditas:'Cabai, Melon, Tomat, Kentang', catatan:'Fungisida kontak multi-situs — rotasikan dengan fungisida sistemik untuk cegah resistensi.'},
  {name:'Glifosat 480SL', ai:'Glifosat', formulasi:'SL (soluble liquid)', konsentrasi:'480 g/L', cat:'Herbisida', reg:'RI.01.2022.077', status:'Suspended', group:'C',
    dosis:'3-5 ml/L air', phi:'—', rei:'24 jam', hazard:'Kelas III — Sedikit Berbahaya', ppe:'Masker, sarung tangan, sepatu boot',
    target:'Gulma daun lebar & rumput', komoditas:'Pra-tanam / gawangan (non-tanaman)', catatan:'Status SUSPENDED — sedang ditinjau ulang, tidak boleh diterbitkan dari gudang sampai status berubah.'},
  {name:'Klorantraniliprol 200SC', ai:'Klorantraniliprol', formulasi:'SC (suspension concentrate)', konsentrasi:'200 g/L', cat:'Insektisida', reg:'RI.01.2024.058', status:'Approved', group:'A',
    dosis:'0.3 ml/L air', phi:'3 hari', rei:'4 jam', hazard:'Kelas III — Sedikit Berbahaya', ppe:'Masker, sarung tangan',
    target:'Ulat grayak, penggerek batang/buah', komoditas:'Jagung, Cabai, Melon', catatan:'Mode of action Grup 28 — rotasikan dengan grup lain setiap 2 siklus aplikasi.'},
  {name:'Kalsium Nitrat', ai:'—', formulasi:'Granul larut air', konsentrasi:'Ca 19%, N 15.5%', cat:'Pupuk', reg:'RI.02.2023.019', status:'Approved', group:'D',
    dosis:'2-3 g/L air (fertigasi)', phi:'—', rei:'—', hazard:'Tidak berbahaya (pupuk)', ppe:'Sarung tangan',
    target:'Pencegahan blossom end rot, penguat dinding sel', komoditas:'Melon, Cabai, Tomat', catatan:'JANGAN dicampur pupuk berbahan sulfat/fosfat — menyebabkan presipitasi (mengendap, menyumbat nozzle).'},
  {name:'Beauveria bassiana', ai:'Beauveria bassiana (jamur entomopatogen)', formulasi:'WP — spora hidup', konsentrasi:'1×10⁸ spora/g', cat:'Biological', reg:'RI.03.2024.005', status:'Approved', group:'E',
    dosis:'5 g/L air', phi:'0 hari (organik)', rei:'0 jam', hazard:'Tidak berbahaya (hayati)', ppe:'Masker debu saat pencampuran',
    target:'Kutu kebul, thrips, wereng', komoditas:'Semua komoditas', catatan:'JANGAN dicampur fungisida kimia — akan membunuh spora jamur menguntungkan ini.'},
  {name:'NPK 16-16-16', ai:'—', formulasi:'Granul', konsentrasi:'N 16%, P₂O₅ 16%, K₂O 16%', cat:'Pupuk', reg:'RI.02.2022.041', status:'Approved', group:'F',
    dosis:'150-250 kg/ha (tabur) atau 1-2 g/L (fertigasi)', phi:'—', rei:'—', hazard:'Tidak berbahaya (pupuk)', ppe:'Sarung tangan',
    target:'Pemupukan dasar & susulan', komoditas:'Semua komoditas', catatan:'Pupuk majemuk seimbang — kompatibel dengan sebagian besar pestisida dan pupuk lain kecuali kalsium.'},
  {name:'Metalaksil 25WP', ai:'Metalaksil', formulasi:'WP (wettable powder)', konsentrasi:'250 g/kg', cat:'Fungisida', reg:'RI.01.2023.098', status:'Approved', group:'G',
    dosis:'2 g/L air', phi:'5 hari', rei:'12 jam', hazard:'Kelas III — Sedikit Berbahaya', ppe:'Masker, sarung tangan',
    target:'Penyakit rebah kecambah, busuk akar (Phytophthora, Pythium)', komoditas:'Melon, Cabai', catatan:'Fungisida sistemik golongan fenilamid — jangan dicampur agen hayati.'},
  {name:'Sulfur 80WDG', ai:'Belerang (Sulfur)', formulasi:'WDG (water dispersible granule)', konsentrasi:'800 g/kg', cat:'Fungisida/Akarisida', reg:'RI.01.2023.152', status:'Approved', group:'H',
    dosis:'2-3 g/L air', phi:'1 hari', rei:'24 jam', hazard:'Kelas III — Sedikit Berbahaya', ppe:'Masker, sarung tangan, kacamata',
    target:'Embun tepung, tungau', komoditas:'Melon, Cabai', catatan:'Jangan aplikasi saat suhu >32°C — risiko fitotoksisitas (daun terbakar). Jangan dicampur produk berbahan minyak.'},
],

  activeIngredients: [
  {name:'Emamektin benzoat', golongan:'Insektisida', moa:'IRAC Grup 6', caraKerja:'Kontak & lambung, translaminar', hazard:'Kelas II', phi:'3 hari', rei:'12 jam'},
  {name:'Mankozeb', golongan:'Fungisida', moa:'FRAC M03 (multi-situs)', caraKerja:'Kontak / protektan', hazard:'Kelas III', phi:'7 hari', rei:'24 jam'},
  {name:'Glifosat', golongan:'Herbisida', moa:'HRAC Grup 9', caraKerja:'Sistemik non-selektif', hazard:'Kelas III', phi:'—', rei:'24 jam'},
  {name:'Klorantraniliprol', golongan:'Insektisida', moa:'IRAC Grup 28', caraKerja:'Sistemik & lambung', hazard:'Kelas III', phi:'3 hari', rei:'4 jam'},
  {name:'Beauveria bassiana', golongan:'Biological', moa:'Entomopatogen (non-kimiawi)', caraKerja:'Infeksi kontak pada kutikula serangga', hazard:'Tidak berbahaya', phi:'0 hari', rei:'0 jam'},
  {name:'Metalaksil', golongan:'Fungisida', moa:'FRAC 4 (fenilamid)', caraKerja:'Sistemik', hazard:'Kelas III', phi:'5 hari', rei:'12 jam'},
  {name:'Belerang (Sulfur)', golongan:'Fungisida/Akarisida', moa:'FRAC M02 (multi-situs)', caraKerja:'Kontak, fumigan ringan', hazard:'Kelas III', phi:'1 hari', rei:'24 jam'},
],

  compatGroups: [
  {code:'A', label:'Insektisida Sintetis'},
  {code:'B', label:'Fungisida Kontak'},
  {code:'C', label:'Herbisida Sistemik'},
  {code:'D', label:'Pupuk Kalsium'},
  {code:'E', label:'Agen Hayati'},
  {code:'F', label:'Pupuk Majemuk NPK'},
  {code:'G', label:'Fungisida Sistemik'},
  {code:'H', label:'Fungisida Sulfur'},
],

  compatMatrix: {
  'A-A':'ok','A-B':'ok','A-C':'no','A-D':'caution','A-E':'caution','A-F':'ok','A-G':'ok','A-H':'caution',
  'B-B':'ok','B-C':'no','B-D':'no','B-E':'no','B-F':'caution','B-G':'ok','B-H':'no',
  'C-C':'no','C-D':'no','C-E':'no','C-F':'no','C-G':'no','C-H':'no',
  'D-D':'ok','D-E':'caution','D-F':'no','D-G':'caution','D-H':'caution',
  'E-E':'ok','E-F':'ok','E-G':'no','E-H':'no',
  'F-F':'ok','F-G':'ok','F-H':'caution',
  'G-G':'ok','G-H':'caution',
  'H-H':'ok',
},

  itemMaster: [
  {name:'Benih Melon MC-08', cat:'Benih', unit:'pack', stock:85, min:20, price:185000, wh:'Gudang Utama'},
  {name:'NPK 16-16-16', cat:'Pupuk', unit:'kg', stock:140, min:200, price:12500, wh:'Gudang Utama'},
  {name:'Mankozeb 80WP', cat:'Pestisida', unit:'kg', stock:8, min:20, price:98000, wh:'Gudang Utama'},
  {name:'Emamektin Benzoat 5WG', cat:'Pestisida', unit:'kg', stock:2.1, min:5, price:410000, wh:'Gudang Utama'},
  {name:'Mulsa Plastik Hitam Perak', cat:'Bahan Lainnya', unit:'m', stock:320, min:500, price:6500, wh:'Gudang Utama'},
  {name:'Sprayer Manual 15L', cat:'Alat', unit:'unit', stock:6, min:2, price:275000, wh:'Gudang Kebun Cianjur'},
],

  treatmentList: [
  {id:'TRT-0142', plot:'Blok B2 — Melon', type:'Fertigasi', product:'AB Mix Tahap Vegetatif', date:'13 Agu 2026', status:'Terjadwal'},
  {id:'TRT-0139', plot:'Blok A1 — Melon', type:'Pemupukan', product:'NPK 16-16-16', date:'10 Agu 2026', status:'Selesai'},
  {id:'TRT-0135', plot:'Blok C1 — Jagung', type:'Sanitasi', product:'—', date:'08 Agu 2026', status:'Selesai'},
],

  dailyPlans: [
  {id:'RKH-0812', tanggal:'12 Agu 2026', regu:'Regu Mawar', plot:'Blok A1, B2', jam:'07:00 - 15:00',
   aktivitas:['Penyiangan gulma — Blok A1 (Melon)','Fertigasi AB Mix — Blok B2 (Melon)','Monitoring hama harian — Blok A1 & B2'],
   pic:'Budi Santoso', catatan:'Bawa APD lengkap, cuaca diperkirakan cerah pagi hujan siang.', status:'Berjalan'},
  {id:'RKH-0811', tanggal:'11 Agu 2026', regu:'Regu Melati', plot:'Blok A3, C1', jam:'07:00 - 14:30',
   aktivitas:['Aplikasi pestisida terjadwal — Blok A3 (Cabai)','Pemupukan susulan — Blok C1 (Jagung)'],
   pic:'Siti Aminah', catatan:'PHI produk 3 hari, akses blok ditutup untuk kunjungan.', status:'Selesai'},
  {id:'RKH-0810', tanggal:'10 Agu 2026', regu:'Regu Kenanga', plot:'Blok B4', jam:'07:30 - 13:00',
   aktivitas:['Sanitasi kebun — Blok B4 (Cabai)','Perbaikan mulsa rusak'],
   pic:'Agus Wijaya', catatan:'', status:'Selesai'},
],

  monthlyPlans: [
  {id:'RKB-2026-08', bulan:'Agustus 2026', fokus:'Panen raya Melon Blok A1/B2 & tanam awal Jagung Blok D',
   targetLuas:'3.2 ha tanam baru', targetPanen:'1.8 ha (≈52 ton Melon)', pic:'Rina Wulandari (Agronomis)',
   mingguan:[
     {minggu:'Minggu 1', rencana:'Panen Melon Blok A1, land prep Blok D'},
     {minggu:'Minggu 2', rencana:'Tanam Jagung Blok D, fertigasi lanjutan Blok B2'},
     {minggu:'Minggu 3', rencana:'Scouting intensif Cabai Blok A3/B4, treatment preventif'},
     {minggu:'Minggu 4', rencana:'Evaluasi produktivitas & persiapan RKB September'},
   ],
   catatan:'Prioritas: pastikan stok Mankozeb 80WP (stok kritis) dipesan ulang sebelum minggu 3.', status:'Berjalan', progress:38},
  {id:'RKB-2026-07', bulan:'Juli 2026', fokus:'Perawatan vegetatif Melon & pengendalian OPT Cabai',
   targetLuas:'—', targetPanen:'0.6 ha (≈15 ton Cabai)', pic:'Rina Wulandari (Agronomis)',
   mingguan:[
     {minggu:'Minggu 1', rencana:'Fertigasi tahap vegetatif Blok B2'},
     {minggu:'Minggu 2', rencana:'Scouting & treatment ulat grayak Blok A3'},
     {minggu:'Minggu 3', rencana:'Panen bertahap Cabai Blok B4'},
     {minggu:'Minggu 4', rencana:'Evaluasi bulanan & pelaporan'},
   ],
   catatan:'', status:'Selesai', progress:100},
],

  dailyReports: [
  {tanggal:'11 Agu 2026', totalAktivitas:9, hadir:24, izin:2, isuBaru:1, isuSelesai:2, treatment:1, produktivitas:82,
   catatan:'Seluruh aktivitas terjadwal selesai tepat waktu. 1 temuan hama baru di Blok A3 (severity 3/5) telah diteruskan ke agronomis.'},
  {tanggal:'10 Agu 2026', totalAktivitas:7, hadir:25, izin:1, isuBaru:0, isuSelesai:1, treatment:2, produktivitas:88,
   catatan:'Produktivitas regu di atas target. Tidak ada insiden baru.'},
  {tanggal:'09 Agu 2026', totalAktivitas:8, hadir:23, izin:3, isuBaru:2, isuSelesai:0, treatment:0, produktivitas:71,
   catatan:'Ketidakhadiran meningkat karena cuaca hujan lebat. 2 isu baru terkait drainase Blok B2.'},
],

  monthlyReports: [
  {bulan:'Juli 2026', totalAktivitas:212, produktivitasRata:79, insiden:6, insidenSelesai:5, treatmentApproved:14, panenTon:15.4, catatan:'Bulan Juli mencatat penyelesaian panen Cabai Blok B4 sesuai target. Rekomendasi: percepat approval treatment agar rata-rata waktu respons < 24 jam.'},
  {bulan:'Juni 2026', totalAktivitas:198, produktivitasRata:75, insiden:8, insidenSelesai:7, treatmentApproved:11, panenTon:9.2, catatan:'Curah hujan tinggi berdampak pada jadwal aplikasi pestisida; 3 jadwal treatment mundur.'},
],

  greenReports: [
  {bulan:'Agustus 2026', airEfisiensi:86, pestisidaKimiaTurun:22, pupukOrganikPct:34, luasOrganikHa:1.6, limbahDikelola:91, emisiEstCO2:2.4, sertifikasi:'GAP Indonesia — Berlaku, Organik — Dalam Transisi (Blok D)',
   catatan:'Adopsi Beauveria bassiana (agen hayati) pada Blok B4 menurunkan penggunaan insektisida kimia sintetis 22% dibanding bulan sebelumnya. Sistem fertigasi tetes menjaga efisiensi air di atas target 85%.'},
  {bulan:'Juli 2026', airEfisiensi:83, pestisidaKimiaTurun:14, pupukOrganikPct:29, luasOrganikHa:1.2, limbahDikelola:88, emisiEstCO2:2.7, sertifikasi:'GAP Indonesia — Berlaku',
   catatan:'Uji coba kompos internal untuk Blok A1 dimulai, menargetkan porsi pupuk organik 35% pada Q4 2026.'},
]
};

function buildSeedUsers() {
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const base = [
    { id: 'budi', username: 'budi.santoso', name: 'Budi Santoso', role: 'worker', roleLabel: 'Pekerja Lapangan', team: 'Regu Mawar · Kebun Ciwidey' },
    { id: 'siti', username: 'siti.aminah', name: 'Siti Aminah', role: 'worker', roleLabel: 'Pekerja Lapangan', team: 'Regu Melati · Kebun Ciwidey' },
    { id: 'joko', username: 'joko.prasetyo', name: 'Joko Prasetyo', role: 'worker', roleLabel: 'Pekerja Lapangan', team: 'Regu Mawar · Kebun Ciwidey' },
    { id: 'reza', username: 'reza.pratama', name: 'Reza Pratama', role: 'supervisor', roleLabel: 'Supervisor / Mandor', team: 'Kebun Ciwidey' },
    { id: 'rina', username: 'rina.wulandari', name: 'Rina Wulandari', role: 'agronomist', roleLabel: 'Agronomis', team: 'Kebun Ciwidey' },
    { id: 'dedi', username: 'dedi.kurniawan', name: 'Dedi Kurniawan', role: 'warehouse', roleLabel: 'Admin Gudang', team: 'Gudang Utama' },
  ];
  return base.map(u => Object.assign({}, u, { passwordHash }));
}

function buildSeedDB() {
  return Object.assign({ users: buildSeedUsers() }, SEED_COLLECTIONS);
}

/* ===================== PENYIMPANAN DATA (file JSON) ===================== */
/* db.json menyimpan semua koleksi data aplikasi. Penulisan dilakukan secara
 * atomik (tulis ke file sementara lalu rename) dan diantrekan (queue) supaya
 * dua permintaan yang datang bersamaan tidak saling menimpa/merusak file. */
let dbCache = null;
let writeQueue = Promise.resolve();

function loadDB() {
  if (dbCache) return dbCache;
  if (!fs.existsSync(DB_PATH)) {
    dbCache = buildSeedDB();
    persistDB(dbCache);
  } else {
    try {
      dbCache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
      console.error('Gagal membaca data/db.json, memakai seed data ulang:', err.message);
      dbCache = buildSeedDB();
      persistDB(dbCache);
    }
  }
  return dbCache;
}

function persistDB(db) {
  const tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2));
  fs.renameSync(tmpPath, DB_PATH);
}

function saveDB() {
  writeQueue = writeQueue.then(() => persistDB(dbCache)).catch(err => {
    console.error('Gagal menyimpan data/db.json:', err.message);
  });
  return writeQueue;
}

/* Koleksi yang boleh diakses lewat REST API generik di bawah ini. */
const COLLECTIONS = [
  'tasks', 'historyList', 'syncQueue', 'kanbanCols', 'incomingReports', 'attendance',
  'openIssues', 'approvalQueue', 'cropCycles', 'scoutingSessions', 'sopList', 'problemDict',
  'productDb', 'activeIngredients', 'compatGroups', 'itemMaster', 'treatmentList',
  'dailyPlans', 'monthlyPlans', 'dailyReports', 'monthlyReports', 'greenReports',
];
/* compatMatrix bukan daftar (array) melainkan objek referensi pasangan
 * kompatibilitas — disajikan lewat endpoint tersendiri yang read-only. */

function newId(prefix) {
  return prefix + '-' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
}

/* ===================== APP SETUP ===================== */
app.use(express.json({ limit: '12mb' })); // limit lumayan besar karena foto (base64) dikirim lewat body
app.use(session({
  store: new FileStore({ path: SESSIONS_DIR, logFn: function () {} }),
  secret: process.env.SESSION_SECRET || 'upterindo-dev-secret-ganti-di-produksi',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
    httpOnly: true,
    sameSite: 'lax',
  },
}));

function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...safe } = u;
  return safe;
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Belum masuk (login diperlukan).' });
  }
  next();
}

/* ===================== AUTH ===================== */
app.get('/api/auth/me', (req, res) => {
  const db = loadDB();
  const user = req.session.userId ? db.users.find(u => u.id === req.session.userId) : null;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Nama pengguna dan kata sandi wajib diisi.' });
  }
  const db = loadDB();
  const user = db.users.find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Nama pengguna atau kata sandi salah.' });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, role, company, password, password2 } = req.body || {};
  if (!name || !email || !phone || !role || !password) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
  }
  if (password2 !== undefined && password !== password2) {
    return res.status(400).json({ error: 'Konfirmasi kata sandi tidak cocok.' });
  }
  const db = loadDB();
  const username = String(email).trim().toLowerCase();
  if (db.users.some(u => u.username === username)) {
    return res.status(409).json({ error: 'Email ini sudah terdaftar. Silakan masuk.' });
  }
  const roleLabels = {
    worker: 'Pekerja Lapangan',
    supervisor: 'Supervisor / Mandor',
    agronomist: 'Agronomis',
    warehouse: 'Admin Gudang',
  };
  const user = {
    id: newId('user'),
    username,
    name: String(name).trim(),
    phone: String(phone).trim(),
    role: roleLabels[role] ? role : 'worker',
    roleLabel: roleLabels[role] || 'Pekerja Lapangan',
    team: company ? String(company).trim() : '-',
    passwordHash: bcrypt.hashSync(password, 10),
  };
  db.users.push(user);
  saveDB();
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

/* ===================== REFERENSI (read-only) ===================== */
app.get('/api/compat-matrix', requireAuth, (req, res) => {
  const db = loadDB();
  res.json(db.compatMatrix || {});
});

/* ===================== CRUD GENERIK UNTUK SEMUA MODUL ===================== */
/* Semua modul (tugas, treatment, laporan, rencana kerja, dst.) memakai pola
 * REST yang sama: GET (daftar), GET/:id, POST (buat baru), PUT/:id (ubah),
 * DELETE/:id (hapus). Ini menjaga server.js tetap ringkas & mudah dikembangkan
 * — menambah modul baru cukup menambah nama koleksi di array COLLECTIONS. */
COLLECTIONS.forEach(collection => {
  const base = '/api/' + collection;

  app.get(base, requireAuth, (req, res) => {
    const db = loadDB();
    res.json(db[collection] || []);
  });

  app.get(base + '/:id', requireAuth, (req, res) => {
    const db = loadDB();
    const item = (db[collection] || []).find(r => String(r.id) === req.params.id);
    if (!item) return res.status(404).json({ error: 'Data tidak ditemukan.' });
    res.json(item);
  });

  app.post(base, requireAuth, (req, res) => {
    const db = loadDB();
    const record = Object.assign({}, req.body);
    if (!record.id) record.id = newId(collection.slice(0, 3).toUpperCase());
    record.createdAt = new Date().toISOString();
    record.createdBy = req.session.userId;
    if (!db[collection]) db[collection] = [];
    db[collection].unshift(record);
    saveDB();
    res.status(201).json(record);
  });

  app.put(base + '/:id', requireAuth, (req, res) => {
    const db = loadDB();
    const list = db[collection] || [];
    const idx = list.findIndex(r => String(r.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Data tidak ditemukan.' });
    list[idx] = Object.assign({}, list[idx], req.body, { id: list[idx].id, updatedAt: new Date().toISOString() });
    saveDB();
    res.json(list[idx]);
  });

  app.delete(base + '/:id', requireAuth, (req, res) => {
    const db = loadDB();
    const list = db[collection] || [];
    const idx = list.findIndex(r => String(r.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Data tidak ditemukan.' });
    const [removed] = list.splice(idx, 1);
    saveDB();
    res.json(removed);
  });
});

/* ===================== ANALISIS FOTO (proxy ke OpenAI) ===================== */
/* Kunci API OpenAI disimpan di server (env var OPENAI_API_KEY), TIDAK PERNAH
 * dikirim ke browser — lebih aman dibanding menyimpan kunci di sisi klien.
 * Kalau env var belum diatur, endpoint ini otomatis memberi hasil simulasi
 * supaya alur tetap bisa dicoba tanpa kunci API sungguhan. */
app.get('/api/ai/status', requireAuth, (req, res) => {
  res.json({ configured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/ai/analyze-photo', requireAuth, async (req, res) => {
  const { imageDataUrl, prompt } = req.body || {};
  if (!imageDataUrl) {
    return res.status(400).json({ error: 'Foto belum diunggah.' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({
      simulated: true,
      text: 'Mode simulasi (server belum memiliki OPENAI_API_KEY). Contoh hasil: kemungkinan Ulat grayak (Spodoptera frugiperda) — estimasi keyakinan 78%. Alternatif: kerusakan mekanis (12%). Perlu konfirmasi agronomis sebelum treatment.',
    });
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Analisis kondisi tanaman pada foto ini dan identifikasi kemungkinan hama/penyakit.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errBody = await response.text();
      console.error('OpenAI API error:', response.status, errBody);
      return res.status(502).json({ error: 'Gagal memanggil OpenAI API (status ' + response.status + ').' });
    }
    const data = await response.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    res.json({ simulated: false, text: text || '(Tidak ada hasil dari model.)' });
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    console.error('AI analyze-photo error:', err.message);
    res.status(504).json({ error: timedOut ? 'Waktu tunggu OpenAI API habis.' : 'Gagal menghubungi OpenAI API: ' + err.message });
  }
});

/* ===================== STATIC FILES ===================== */
app.use(express.static(PUBLIC_DIR));

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', app: 'upterindo' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

/* ===================== START ===================== */
app.listen(PORT, () => {
  loadDB(); // pastikan data/db.json dibuat sejak awal
  console.log('UPterindo server berjalan di http://localhost:' + PORT);
  console.log('  Kata sandi demo untuk semua akun contoh: ' + DEMO_PASSWORD);
});
