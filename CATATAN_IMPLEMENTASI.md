# Catatan Implementasi Backend & Frontend

> Status per **2026-10-31**. Dokumen ini menggantikan rencana bertahap yang
> sudah usang (semua Phase 1–3 sudah ada di engine maupun di POS).

## Ringkasan Status

### Backend (acc-sinaptex, nested repo)
**Status:** semua endpoint yang dibutuhkan POS sudah ada; build 0 warning, tes 1188 lulus
(485 unit + 703 integration).

- ✅ **Sudah ada:** Auth (JWT + refresh), Products (+import, deactivate), Customers (+import),
  Shifts, Sales, Purchases, Returns (sales & purchases), Journal, Expenses, Audit log,
  User management (GET/PUT/DELETE + `authorityLevel`), Stock adjustment, Payment settlements
  (piutang/hutang), QRIS confirm-payment, Opening balances, Suppliers, Units, Warehouses,
  Cash accounts, Reports (trial-balance, daily-movement, export, AR/AP), Analytics,
  Fiscal periods, Company profile + logo, RBAC, Backup, Loans, Inter-branch transfer.

### Frontend (sme-sinaptex)
**Status:** mode live terpasang untuk seluruh alur operasional; `API_MODE` default masih `mock`.

- ✅ **Terhubung ke engine:** Auth, Produk (CRUD + impor + penyesuaian stok), Pelanggan (+ impor),
  Shift, Checkout, Riwayat penjualan, Retur, Void, Pembelian, Piutang/Hutang (pelunasan),
  Konfirmasi QRIS, Biaya, Jurnal, Neraca saldo (saldo awal/debit/kredit/saldo berjalan),
  Laba-rugi, User management, Audit log, Profil toko (company profile).
- 🟡 **Belum dipakai frontend (endpoint-nya sudah ada):** Analytics (13 endpoint), Fiscal period
  (close/lock/reopen), Approval rules + submit/approve transaksi, Cash transfer, Inter-branch
  transfer, Loans, Payments (advance/refund), Purchase return, Supplier CRUD (hanya GET),
  Email settings, Backup/restore, RBAC (roles/permissions/user-roles), QR & faktur PDF engine,
  Cash-account movements, Branch/Warehouse management, Product unit.

## Hasil Audit Mock/Stub (2026-10-31)

Ditemukan dan **sudah diperbaiki**:

1. Backend tertinggal 2 commit dari `origin/main` →/journal, expenses, audit-log, users,
   adjustments, imports, payments, confirm-payment, opening-balances semuanya 404. Sudah di-pull.
2. Panel "Akun demo" tampil di mode live → kini hanya di mode mock (`API_MODE`).
3. `GET /api/users` tidak mengirim peran → engine kini mengembalikan `authorityLevel`
   (99 = pemilik, 2 = kasir); POS memetakan ke `role` dan bisa mengubahnya.
4. Nama kasir di riwayat/struk = GUID `requestedBy` → engine kini mengembalikan `requestedByName`
   (nama), dan POS memakai user yang sedang login sebagai operator.
5. Shift tidak mencatat siapa yang membukanya → `Shift.CashierUserId` (migration baru); POS
   menampilkan peringatan "Shift dibuka oleh X".
6. Profil toko hanya di localStorage → disambungkan ke `GET/PUT /api/settings/company-profile`.
7. Search & lonceng di topbar dekorasi → search global (produk/transaksi/menu) + panel notifikasi
   (stok menipis, transaksi menunggu pembayaran, shift milik orang lain).
8. Neraca saldo hanya "Saldo akhir" → kini **Saldo awal | Debit | Kredit | Saldo berjalan** dengan
   filter rentang tanggal (`openingBalance`/`closingBalance` dari engine).
9. `PUT /api/users/{id}` tidak pernah menulis apa pun (`UserRepository.GetByIdAsync` memakai
   `AsNoTracking`, jadi service memutasi objek lepas) — API menjawab "updated" padahal baris
   tidak berubah. Repository sekarang tracking; tes regresi mengunci password lama mati.
10. Konfirmasi digital live memanggil `/api/sales/{nomor}/confirm-payment` padahal rute engine
    menerima **id** penjualan → 404. Nomor kini diterjemahkan dulu, dan hasil konfirmasi
    mengembalikan dokumen nyata (bukan objek kosong).
11. Riwayat retur live menampilkan kolom Item dan Alasan kosong → detail retur + penjualan asal
    kini diambil, jadi nama item, jumlah, dan alasannya tampil.
12. **`PUT /api/settings/company-profile` menolak email kosong** (`[EmailAddress]` memaafkan null,
    tapi menolak `""` — padahal default DTO-nya `""`). Toko tanpa email tidak bisa menyimpan
    profil, dan GET mengembalikan `""` yang justru ditolak PUT. Diperbaiki di engine: validasi
    email pindah ke `Validate()` DTO; `""` berarti "tidak ada email", email yang ada harus berbentuk
    alamat. Ditutup 2 tes regresi.

Masih jadi gap (tercatat, belum dikerjakan):

- Live: pembayaran campuran, overpayment (kembalian), dan penjualan kredit tanpa uang muka ditolak engine.
- Live: diskon dilebur ke `unitPrice` → riwayat/struk live tidak menampilkan diskon.
- Live: pembelian mengirim `supplierId: null` → hutang belum tertelusur per pemasok.
- Live: satu shift aktif per tenant (bukan per kasir).
- Live: QRIS belum jadi konsep engine → konfirmasi digital hanya jalan bila engine punya
  pembayaran tertunda untuk penjualan itu.
- POS: upload logo toko belum ada (engine sudah punya `POST /api/settings/company-profile/logo`).
- POS: dashboard belum membaca endpoint analytics/health engine (badge "Engine akuntansi" statis).
- POS: multi-branch belum dipakai (`X-Branch-Id` tidak dikirim).
- Mock: uang memakai `number` JS, pembulatan bisa berbeda dari engine.

## Verifikasi

- Backend: `dotnet build AccountingEngine.slnx` (0 warning) + `dotnet test` → **485 unit + 711 integration** lulus.
- Frontend: `npx tsc --noEmit` bersih + `npm run build` sukses (15 halaman statis).
- **Uji kontrak live (31 Okt 2026, engine nyata di `http://localhost:5121`)**: login pemilik →
  `GET /api/users` (authorityLevel 99) → buat kasir (`fullName` + peran tersimpan) → ubah peran
  jadi 99 lalu **dibaca ulang dari DB** (bukan cuma respons) → tutup shift lama & buka shift baru
  dengan `cashierUserId` (dikembalikan engine) → `POST /api/sales` dengan `requestedBy` →
  `requestedByName` = "Budi Santoso" → `GET /api/sales` memuat `description` utuh sehingga shiftId
  terbaca dari deskripsi → **checkout `POST /api/cash-batches/sales` 201** (SALE-00005, total
  Rp75.000, kas 1121 bergerak) → trial balance membuka `openingBalance`/`closingBalance` yang
  konsisten (opening 27 Okt → periode 28 Okt → closing) dan grand total tetap periode-saja →
  company profile GET/PUT/GET (termasuk email kosong) → daftar & detail retur.
- Konfirmasi digital live: rute `/api/sales/{id}/confirm-payment` **sudah ketemu** (ragu-ragu
  "404 No pending payment found" = aturan engine: penjualan uji tidak punya pembayaran QRIS
  tertunda). QRIS sendiri belum jadi konsep engine.

## Catatan Penting

1. **Engine adalah nested git repo** — perubahan di `backend/` tidak ikut commit repo POS.
2. **Environment setup**:
   - Backend: `http://localhost:5121` (Accounting Engine).
   - Frontend: `.env.local` (sudah dibuat, gitignored) dengan `NEXT_PUBLIC_API_MODE=live` dan
     `NEXT_PUBLIC_API_BASE_URL=http://localhost:5121`. **Untuk server toko, ganti base URL ke
     `http://<server-toko>:5121` lalu build ulang.**
   - Tanpa `.env.local`, POS berjalan di mode **mock** (nilai di-bake saat build).
3. **Database**: `dotnet ef database update` → `tools/bootstrap-backend.py` → seed chart via
   `POST /api/accounts/seed`. Migrasi `AddShiftCashierUserId` **sudah diterapkan** ke DB dev.
4. **Dokumentasi**: `AGENTS.md`, `backend/knowledge.md`, `backend/AGENTS.md` diperbarui.
5. **Uji manual di browser masih belum dilakukan** — sesi ini tidak punya browser yang terhubung.
   Yang sudah terverifikasi lewat HTTP: kontrak engine. Yang perlu dicek manusia: tampilan,
   alur kasir di layar, dan struk.

## Next Steps

1. Hubungkan analytics engine ke Dashboard/Laporan (menggantikan perhitungan manual di browser).
2. Master pemasok: `POST/GET/PUT /api/suppliers` dipakai POS, `supplierId` tidak lagi `null`.
3. Shift per kasir di engine (butuh kas/account sendiri per kasir, bukan sekadar penanda).
4. Backup/restore, fiscal period, dan approval rule tampil di POS sebagai menu operasional.
