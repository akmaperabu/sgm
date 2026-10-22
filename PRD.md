# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Project Name: Sistem Support Goods & Maintenance (Industrial Gas Plant)
**Platform:** Responsive Web Application (Desktop, Android, iOS Browser Compatible)  
**Target Sites:** Batulicin (HQ/Pusat), Tanjung, Kendari  

---

## 1. STANDAR & PANDUAN DESAIN ANTARMUKA (DESIGN SYSTEM GUIDELINES)

Desain antarmuka aplikasi mengadopsi standar sistem industrial enterprise yang efisien, fokus pada kejelasan data operasional, dan minim distraksi visual:

1. **Prinsip Tampilan Visual (Enterprise Industrial Standards):**
   - **Solid Colors & Clean Surfaces:** Menggunakan warna solid yang tegas dan tenang. Menghindari warna gradasi berlebih pada latar belakang, tombol, maupun kartu.
   - **Border & Elevation Presisi:** Mengutamakan garis pemisah tipis yang rapi (`border border-slate-200`) daripada bayangan tebal/kabur untuk menjaga ketajaman visual.
   - **Struktur Berorientasi Efisiensi:** Tidak menggunakan hero section kosong atau elemen dekoratif yang memakan ruang operasional.
   - **High Information Density:** Menampilkan data transaksi dan logistik dalam format tabel padat (compact tables) agar muat banyak informasi dalam satu layar kerja.

2. **PALET WARNA PERUSAHAAN (CLEAN MONOCHROME + CORPORATE BLUE & SLATE):**
   - **Dominan Latar Utama (Background):** Putih bersih (`#FFFFFF` / `bg-white`) dan Abu-abu sangat muda untuk area kerja sekunder (`#F8FAFC` / `bg-slate-50`).
   - **Teks & Tipografi:** Hitam Arang (`#0F172A` / `text-slate-900`) untuk teks utama, Abu-abu Tegas (`#475569` / `text-slate-600`) untuk label sekunder. Font wajib *Sans-Serif* teknis (`Inter` atau `Geist Sans`), dan gunakan `font-mono` khusus untuk Kode Barang, Nomor PO/PR, Tanggal, dan Angka Stok.
   - **Aksen Utama (Corporate Blue):** Biru Korporat Tegas (`#0284C7` / `bg-sky-600` atau `#1D4Ed8` / `bg-blue-700`) HANYA digunakan untuk tombol aksi utama (Primary Action Button), indikator menu aktif di sidebar, dan link penting.
   - **Aksen Sekunder (Industrial Grey):** Abu-abu Baja (`#E2E8F0` / `border-slate-200` & `bg-slate-100`) untuk header tabel, garis pembatas, dan tombol sekunder.
   - **Warna Status Semantik (Hanya untuk Badge Status kecil):**
     - `Complete / Approved / Stok Aman`: Hijau tua tegas (`bg-emerald-50 text-emerald-700 border-emerald-200`)
     - `In Transit / On Process`: Biru korporat (`bg-blue-50 text-blue-700 border-blue-200`)
     - `Pending / H-7 Reminder`: Kuning/Amber (`bg-amber-50 text-amber-700 border-amber-200`)
     - `Critical / Stok Kosong / Overdue`: Merah tegas (`bg-red-50 text-red-700 border-red-200`)

3. **RESPONSIVITAS (LAPTOP, ANDROID, iOS):**
   - Di layar Laptop/PC: Gunakan navigasi *Sidebar* kiri yang ringkas dan *Top Header* untuk informasi Site & User.
   - Di layar HP (Android/iOS): *Sidebar* otomatis berubah menjadi *Slide-over Drawer* (menu garis tiga di pojok atas), tabel memiliki *horizontal scroll* yang mulus dengan kolom nama barang terkunci (*sticky column*), dan tombol input cukup nyaman disentuh jari (minimal tinggi `36px–40px`).

---

## 2. ARSITEKTUR MULTI-SITE & HAK AKSES (RBAC)

### 2.1. Lokasi Site
Sistem memiliki 3 site terpisah yang terisolasi datanya:
1. **Batulicin** (Kantor Pusat / HQ)
2. **Tanjung**
3. **Kendari**
*Catatan: TIDAK ADA fitur mutasi/transfer stok antar-site karena lokasi berbeda kabupaten/pulau.*

### 2.2. Pembagian Role (Hak Akses)
1. **ADMIN (Gudang / Purchasing / Supervisor - Pusat Batulicin & Admin Site):**
   - Memiliki **Site Switcher Dropdown** di bagian *Top Header* (`[Semua Site | Batulicin | Tanjung | Kendari]`).
   - Saat Admin memilih salah satu site, seluruh tabel stok, pengajuan pembelian, dan jadwal maintenance otomatis memfilter data khusus site tersebut.
   - Memiliki akses penuh untuk:
     - Mengelola Master Data Barang & Aset Mesin per site.
     - Melakukan **Approval / Reject** atas permintaan pengambilan barang gudang, pengajuan pembelian barang, dan tiket perbaikan.
     - Mengubah status tahapan pembelian (*Submitted* -> *Approved* -> *On Process* -> *In Transit* -> *Complete*).
     - Mengeksekusi atau melakukan **Skip** pada jadwal maintenance rutin.

2. **USER (Staf / Teknisi / Operator per Site):**
   - Akun terikat mati pada **1 Site** (`site_id` terkunci saat akun dibuat oleh Admin).
   - **TIDAK BISA** melihat data site lain dan tidak memiliki *Site Switcher*.
   - Memiliki akses **View Only (Transparansi Penuh)** terhadap:
     - Jumlah stok barang gudang di site-nya sendiri.
     - Progres tahapan pembelian barang (*tracking* status PR/PO dari pengajuan hingga barang tiba) di site-nya sendiri.
     - Jadwal dan histori maintenance alat di site-nya sendiri.
   - Memiliki akses **Input/Request** hanya untuk 3 hal:
     1. **Request Ambil Barang Gudang** (meminta barang keluar dari stok yang tersedia).
     2. **Request Beli Barang** (mengajukan pembelian untuk stok yang habis atau **barang baru yang belum terdaftar di sistem**).
     3. **Request Perbaikan Alat** (melaporkan kerusakan mesin/truk).

---

## 3. MODUL 1: SUPPORT GOODS (GUDANG & PROCUREMENT TRACKING)

### 3.1. Kategori Support Goods
Seluruh item di gudang dan pengajuan pembelian wajib dikelompokkan ke dalam 3 kategori:
1. **ATK** (Alat Tulis Kantor & perlengkapan administrasi).
2. **HSE** (Alat Pelindung Diri / APD, APAR, rambu keselamatan).
3. **Sparepart** (Suku cadang mesin Acetylene, Oxygen, dan Unit Truck).

### 3.2. Alur Pengambilan Barang Gudang (Goods Issue)
1. User melihat tabel stok gudang di site-nya.
2. User klik **"Request Ambil Barang"**, memilih barang, mengisi jumlah (`qty`), dan mengisi keperluan (misal: pemakaian harian atau terkait tiket maintenance).
3. Status pengajuan menjadi `Pending Approval`.
4. Admin memeriksa pengajuan dan menekan tombol **Approve / Serahkan Barang**.
5. Sistem otomatis **memotong jumlah stok gudang** sesuai `qty` yang disetujui dan mencatatnya ke dalam *Log Riwayat Keluar-Masuk Barang (Stock Card)*.

### 3.3. Alur Pengajuan & Pemantauan Pembelian (Procurement Tracking)
Alur ini dirancang agar seluruh User dan Admin dapat memantau posisi pembelian barang secara transparan:
1. **Tahap 1 - Pengajuan (`Submitted`):**
   - User membuat *Purchase Request (PR)*.
   - User bisa memilih dari barang yang sudah ada di katalog (namun stoknya menipis/habis) **ATAU** memilih opsi **"Barang Baru (Belum Ada di Sistem)"** dengan menginput nama barang, kategori (`ATK`/`HSE`/`Sparepart`), jumlah, spesifikasi/catatan, dan foto contoh barang (opsional).
2. **Tahap 2 - Persetujuan Admin (`Approved` / `Rejected`):**
   - Admin memverifikasi pengajuan. Jika barang tersebut adalah **Barang Baru**, Admin menyetujui pengadaan barang (data master belum didaftarkan agar katalog tetap bersih selama proses pemesanan berlangsung).
3. **Tahap 3 - Proses Pembelian (`On Process - Purchasing`):**
   - Divisi Purchasing memproses pesanan ke vendor. Admin mengubah status menjadi `On Process` (bisa menambahkan nomor PO / nama vendor).
4. **Tahap 4 - Dalam Pengiriman (`In Transit`):**
   - Barang sedang dikirim menuju lokasi site (`Batulicin`, `Tanjung`, atau `Kendari`). Admin mengubah status menjadi `In Transit` dan mengisi estimasi tanggal tiba / nomor resi/surat jalan.
5. **Tahap 5 - Penerimaan Barang Fisik (`Complete / Received`):**
   - Saat barang tiba secara fisik di gudang site:
     - Untuk barang reguler yang sudah ada di master, Admin langsung menekan tombol **Terima**.
     - Untuk **Barang Baru**, sistem menampilkan tombol khusus **"Registrasi & Terima"**. Admin memvalidasi nama resmi, kode barang, kategori, dan satuan dalam popup ringkas.
   - **Automasi Sistem:** Begitu disimpan, sistem **otomatis mendaftarkan item ke Master Data Gudang sekaligus menambahkan stok fisik yang diterima ke dalam sistem** dan mencatat riwayat kartu stok barang masuk.

---

## 4. MODUL 2: MAINTENANCE (PERAWATAN RUTIN & PERBAIKAN KERUSAKAN)

### 4.1. Kategori Aset / Unit Maintenance
Seluruh aset mesin dan kendaraan yang dipelihara dibagi menjadi 3 kategori:
1. **Acetylene** (Alat produksi gas Acetylene di pabrik/gudang).
2. **Oxygen** (Alat produksi/pengisian gas Oxygen di pabrik/gudang).
3. **Unit Truck** (Armada truk operasional/pengangkut di masing-masing site).

### 4.2. Maintenance Tipe 1: Request Perbaikan Kerusakan (Corrective / Breakdown)
1. Ketika terjadi kerusakan mendadak, User membuat **Request Perbaikan** (memilih aset dari kategori `Acetylene`, `Oxygen`, atau `Unit Truck`, mengisi deskripsi kerusakan, tingkat urgensi, dan foto).
2. Admin memproses perbaikan (`In Progress`).
3. Jika perbaikan membutuhkan suku cadang, tiket perbaikan dapat langsung dihubungkan dengan pengambilan barang kategori **Sparepart** dari gudang (atau pengajuan pembelian jika sparepart kosong).
4. Setelah selesai diperbaiki, Admin menutup tiket menjadi `Completed` dan tanggal selesai perbaikan disimpan sebagai `last_service_date` pada aset tersebut.
5. **Aturan Penting:** Perbaikan kerusakan mendadak ini **TIDAK BOLEH menggeser atau mengubah tanggal jadwal Maintenance Rutin** yang sudah ditetapkan.

### 4.3. Maintenance Tipe 2: Jadwal Maintenance Rutin (Preventive) & Fitur "SKIP"
1. **Penjadwalan Berbasis Bulan & Tanggal Tetap:**
   - Setiap aset (`Acetylene`, `Oxygen`, maupun `Unit Truck` seperti jadwal ganti oli) memiliki pengaturan jadwal rutin berbasis interval bulan dan tanggal tetap (contoh: *Setiap 1 Bulan pada Tanggal 15*, atau *Setiap 2 Bulan pada Tanggal 10*).
   - Pengaturan interval bulan dan tanggal ini bersifat **Editable** (dapat diubah sewaktu-waktu oleh Admin).
2. **Reminder Otomatis H-7 (1 Minggu Sebelum Jadwal):**
   - Tepat **7 hari sebelum tanggal jatuh tempo (H-7)**, sistem otomatis memunculkan tiket tugas Maintenance Rutin berstatus `Upcoming (H-7)` di dashboard dan halaman Maintenance pada site terkait.
3. **Logika "Skip Maintenance" dengan Keterangan Wajib:**
   - Jika pada saat jadwal rutin tiba, aset tersebut dirasa aman dan tidak perlu diservis ulang (misalnya karena **baru saja mengalami perbaikan/servis 5 hari yang lalu**), Admin dapat memilih untuk melewati jadwal rutin bulan tersebut.
   - Sistem akan menampilkan informasi di dalam tiket rutin: *"Catatan Sistem: Aset ini terakhir kali diservis/diperbaiki pada [Tanggal Terakhir Servis] ([X] hari yang lalu)."*
   - Admin disediakan dua tombol aksi:
     - **`[Selesaikan Maintenance]`**: Jika servis rutin tetap dikerjakan (bisa memotong stok *Sparepart* seperti oli/filter dari gudang).
     - **`[Skip Jadwal Ini]`**: Jika Admin menekan tombol ini, sistem **WAJIB menampilkan input teks alasan/keterangan** (contoh: *"Di-skip karena sudah dilakukan servis & ganti oli pada 5 hari yang lalu"*).
   - Setelah di-skip, status tiket bulan tersebut tercatat di riwayat sebagai `Skipped` beserta alasannya, dan jadwal rutin berikutnya tetap berjalan normal sesuai tanggal tetap di periode bulan berikutnya.

---

## 5. SPESIFIKASI TEKNIS SISTEM
- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS (Enterprise Palette: Slate + Corporate Blue)
- **Database & ORM:** SQLite / PostgreSQL dengan Prisma ORM
- **Icons:** Lucide React