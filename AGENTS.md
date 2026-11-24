# AGENTS.md — POS-Sinaptex

## Project Overview

Next.js 15 (App Router, static export) POS application for UMKM retail stores, wrapped as a
Tauri 2 desktop app (`POS-Sinaptex.exe`). Backend is an external C# engine ("Accounting Engine",
ASP.NET Core, .NET 10) served over REST + JWT.

- Two data modes: `mock` (in-memory engine, default) and `live` (HTTP ke engine C#).
- Live mode mengikuti endpoint yang sudah ada di engine — lihat "Mode Live" untuk daftar terhubung,
  alur yang ditolak mock, dan perilaku yang menyimpang.
- Modul: Kasir (voucher/poin/pembayaran campuran), Riwayat, Shift, Produk, Persediaan
  (ringkasan/stok/mutasi/opname/gudang), Pembelian + PPh, Pemasok, Voucher, Member & Poin, Keuangan
  (kas/biaya/piutang/hutang/uang muka), Akuntansi (neraca saldo, jurnal, buku besar, laba-rugi, neraca
  berjalan, arus kas, perubahan modal, periode fiskal), Laporan, PPh, Aset Tetap, Persetujuan, Aturan
  Approval, Cabang, Pengaturan.
- Static export: `output: "export"` → `out/` (consumed by Tauri `frontendDist`).
- PWA via `@serwist/next` (service worker disabled in dev; `src/app/manifest.ts`).
- Offline LAN topology (Mode A): POS.exe → `http://<server-toko>:PORT/api`.

## Commands

```bash
npm install          # sekali per checkout
npm run dev          # Next dev server (http://localhost:3000)
npm run build        # Static export to out/ (required before Tauri build)
npx tauri dev        # Tauri desktop dev (runs npm run dev automatically)
npx tauri build      # Windows installer (nsis + msi)
npx tsc --noEmit     # Typecheck — no lint/test tooling in the POS repo
```

Backup harian (Scheduled Task, butuh Administrator; lihat `docs/DEPLOYMENT-GUIDE.md`):
`powershell -ExecutionPolicy Bypass -File scripts\install-backup-task.ps1 -RunNow`

No ESLint/Prettier, no test runner in the POS repo. The engine repo has xUnit unit + integration suites.

### Engine (backend/, nested git repo)

```bash
cd backend
dotnet build AccountingEngine.slnx
dotnet test                                          # unit + integration suites
dotnet run --project src/AccountingEngine.Api   # http://localhost:5121
dotnet ef database update -p src/AccountingEngine.Infrastructure -s src/AccountingEngine.Api
python ../tools/bootstrap-backend.py                # tenant + owner + RBAC + kas + periode
```

The engine is a plain ASP.NET Core app — **not** a Windows Service (no `AddWindowsService`).
Bootstrap order: `dotnet ef database update` → `tools/bootstrap-backend.py` → seed chart of accounts
via `POST /api/accounts/seed`. Read `backend/AGENTS.md` + `backend/knowledge.md` before engine work.

Demo accounts (mock): `pemilik` / `pemilik123` (owner), `kasir` / `kasir123` (cashier).
Engine default owner (bootstrap script defaults): `pemilik` / `pemilik123`, business `toko-utama`.

## Architecture

```
src/
  app/
    layout.tsx           → root layout (Providers, metadata, theme color)
    manifest.ts          → PWA manifest
    login/page.tsx       → login (no shell)
    kasir/page.tsx       → full-screen POS, intentionally outside (app) group
    (app)/               → AppShell group + AuthGuard (lihat NAV_GROUPS): dashboard (/), riwayat,
                           shift, produk, persediaan, aset-tetap, pembelian, supplier, voucher,
                           member, keuangan (kas/biaya/piutang/hutang/uang muka), piutang (reminder),
                           akuntansi, laporan, pph, persetujuan, approval-rules, cabang, pengaturan
  components/            → shared UI (app-shell, app-topbar, sidebar, global-search, notif-button,
                           data-table, money-display, status-badge, form-field, page-header, kpi-card,
                           panel-kesehatan, skeleton, auth-guard) + kasir/ + produk/ + dashboard/
                           (chart tren/komposisi/produk) + pengaturan/ (printer, gateway, email,
                           notifikasi, lisensi) + activation/ + legal/
  hooks/queries.ts       → ALL TanStack Query hooks (queries + mutation groups)
  lib/
    api/types.ts         → domain types (single source of truth / C# contract)
    api/client.ts        → `api` facade, API_MODE mock|live switch
    api/live.ts          → live client: fetch ke engine C# + pemetaan DTO→domain
    api/mock/db.ts       → in-memory mock engine (double-entry journal, GL, P&L)
    uang.ts              → pembulatan per baris + `totalParity` (total checkout = engine)
    dashboard.ts         → agregasi tren/komposisi pembayaran dashboard
    reminder.ts          → helper reminder piutang (tahap H-1/H+3/H+7, template, tautan WA)
    notifikasi/telegram.ts → kirim pesan Bot API Telegram langsung dari POS (tanpa engine)
    gateway/client.ts    → client payment gateway (Midtrans/Xendit/REST umum): buat tagihan + status
    license.ts, license-device.ts → format/validasi key + sidik perangkat
    store/               → zustand: auth, cart, toko, printer, reminder, gateway, aktivasi,
                           cabang (cabang aktif + daftar), notifikasi (Telegram/WA)
    printer/             → escpos.ts (builder struk/kuitansi) + printer.ts (invoke Tauri)
    csv.ts, format.ts, nav.ts, struk.ts, utils.ts
  sw.ts                  → Serwist service worker
src-tauri/               → Rust shell: log plugin + printer.rs (raw ESC/POS via Windows spooler)
backend/                 → nested git repo (gitignored di root): Accounting Engine (.NET 10)
tools/                   → bootstrap-backend.py (tenant + owner + RBAC + kas + periode)
scripts/                 → install-backend-service.ps1, setup-client-env.ps1,
                           install-backup-task.ps1 + backup-auto.ps1 + restore-backup.ps1
```

### Layer rules

- **Semua akses data lewat `src/lib/api/client.ts` (`api.*`).** Komponen tidak pernah memanggil
  `mock/db.ts` langsung.
- `API_MODE === "live"` memakai `src/lib/api/live.ts` (fetch ke engine C# + pemetaan DTO→domain);
  jalur HTTP (header, JWT, refresh, idempotensi) hanya boleh disentuh di file itu. Alur yang engine-nya
  belum punya endpoint ditolak dengan pesan eksplisit, bukan data mock.
- Engine (`backend/`) adalah nested git repo: perubahan di sana **tidak** ikut commit repo POS.
- Business/accounting logic (stok, saldo, jurnal) milik engine layer, bukan komponen. Di mode mock,
  `mock/db.ts` adalah "engine"-nya; `api/client.ts` hanya orkestrasi + rekap total checkout.
- `API_MODE` dibaca dari `process.env.NEXT_PUBLIC_API_MODE` (default `mock`). Env lain:
  `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_BUSINESS_ID`, `NEXT_PUBLIC_ENGINE_APPROVER`, dan kode akun
  `NEXT_PUBLIC_ENGINE_*` (lihat `.env.example`).

### Mode Live

Sudah terhubung: auth login/logout + refresh JWT (`/api/auth/*`), produk CRUD
(`/api/products`), pelanggan (`/api/customers`), shift (aktif/riwayat/buka/mutasi/tutup),
checkout → `POST /api/cash-batches/sales`, riwayat penjualan (`/api/sales` + detail transaksi),
pembelian (`/api/purchases`), retur pembelian (`POST /api/purchase-returns`; lookup dokumen
`GET /api/purchase-returns/by-transaction/{transactionId}`), void (`POST /api/transactions/{id}/void`), retur
(`POST /api/sale-returns` + riwayat `GET /api/sale-returns`), impor produk
(`POST /api/products/import`, multipart), impor pelanggan (`POST /api/customers/import`, multipart),
impor saldo awal (`POST /api/accounts/opening-balances`, multipart), saldo akun + laba-rugi (dari `trial-balance`),
daftar jurnal (`GET /api/journal`), biaya (`GET/POST /api/expenses`), daftar akun kas + transfer
antar-rekening (`GET /api/cash-accounts`, `GET/POST /api/cash-transfers`), kaki pembayaran penjualan
(`GET /api/sales/{id}/payments`, `GET /api/sales/payments?from=&to=`), pelunasan piutang
(`POST /api/sales/{id}/payments`), pelunasan hutang (`POST /api/purchases/{id}/payments`),
penyesuaian stok (`POST /api/inventory/adjustments`), gudang (`GET/POST /api/warehouses`,
`POST /api/warehouses/{id}/deactivate`), stok per gudang (`GET /api/inventory/stock?warehouseId=`),
transfer stok antar gudang (`POST /api/inventory/transfers`),
kartu stok (`GET /api/inventory/movements?productId=&warehouseId=`),
opname stok (`GET/POST /api/inventory/opnames`, `POST /api/inventory/opnames/{id}/complete|cancel`),
konfirmasi QRIS
(`POST /api/cash-transfers` dari akun gateway, fallback `POST /api/sales/{id}/confirm-payment`),
buat user kasir (`POST /api/users/direct`),
daftar/ubah/hapus user (`GET/PUT/DELETE /api/users`), jejak audit (`GET /api/audit-log`),
master pemasok (`GET/POST /api/suppliers`, `POST /api/suppliers/{id}/deactivate`),
kebijakan operasional (`GET/PUT /api/settings/operational-policy`), periode fiskal
(`/api/fiscal-periods`), umur piutang/hutang + rekonsiliasi (`/api/reports/ar-ap/*`),
laporan PPh per jenis (`GET /api/reports/pph`),
analitik kesehatan & rasio (`/api/analytics/*`), backup database
(`GET/POST /api/backup`, `GET /api/backup/list`, `GET /api/backup/download`, `POST /api/backup/restore`),
cabang (`GET/POST /api/branches`), transfer antar cabang
(`GET/POST /api/inter-branch-transfers`), faktur PDF penjualan (`GET /api/sales/{id}/pdf`),
dan persetujuan transaksi
(`GET /api/transactions?status=SUBMITTED`, `POST /api/transactions/{id}/approve`,
`POST /api/cash-batches/{batchId}/post`).

Voucher & loyalitas: `/api/vouchers` (list/create/update/deactivate + `POST /api/vouchers/validate`),
member (`/api/members`, `/{id}`, `/{id}/deactivate`, `/{id}/points`, `/{kode}/points/adjust`), tier
(`/api/member-tiers`, `/{id}`, `/{id}/deactivate`), kebijakan poin (`GET/PUT /api/loyalty/policy`),
harga loyalty (`POST /api/loyalty/price`). Email SMTP (`GET/PUT /api/settings/email`), uang muka/refund
(`POST /api/payments/advances`, `POST /api/payments/refunds`), dan aksi periode fiskal
(`/api/fiscal-periods/*`: create, close, close-year, lock, reopen, reverse-closing, pending-close).

Tidak ada lagi jalur 501 untuk alur yang sudah terhubung: `engineBelumAda` sudah dihapus. Bila akun kas
untuk kode akun yang dipakai checkout/pelunasan/biaya belum ada, POS membuatnya lewat
`POST /api/cash-accounts`.

**Aset Tetap** sudah tersambung penuh: daftar/tambah/ubah/nonaktifkan aset (`/api/fixed-assets`),
hitung penyusutan satu aset per periode (`GET /api/fixed-assets/depreciation`), posting penyusutan
bulanan (`POST /api/fixed-assets/depreciation/post`), mutasi aset
(`POST/GET /api/fixed-assets/{id}/mutations`; `SALE`/`DISPOSAL` menonaktifkan aset, `TRANSFER` tetap
aktif dan menyimpan lokasi tujuan), dan laporan register per periode
(`GET /api/fixed-assets/report?period=YYYY-MM`). Mutasi sengaja **tidak** menulis jurnal karena modul
ini tidak pernah menjurnal perolehan aset; POS menampilkan status hasil mutasi sebagai `nonaktif`.
Field POS yang tidak disimpan engine (lokasi, akun per aset, catatan) disembunyikan di mode live,
"hapus" berarti menonaktifkan, dan status nonaktif dipetakan ke `nonaktif`.
**Persediaan** (menu `Persediaan`, rute `/persediaan`) sudah tersambung untuk kelima tabnya: ringkasan
dan nilai persediaan (`GET /api/inventory/stock-valuation?warehouseId=` — nilai dari harga rata-rata/HPP;
tampilan "Semua Gudang" menjumlahkan valuasi tiap gudang karena endpoint hanya menerima satu gudang),
stok per gudang (`GET /api/inventory/stock?warehouseId=`), kartu stok
(`GET /api/inventory/movements?productId=&warehouseId=`), opname stok
(`/api/inventory/opnames`), dan master gudang (`GET/POST /api/warehouses`,
`POST /api/warehouses/{id}/deactivate`). Penyesuaian stok (`POST /api/inventory/adjustments`) dan
transfer stok antar gudang (`POST /api/inventory/transfers`) juga terhubung.

Perilaku live yang menyimpang dari mock:

- `liveCheckout` mendukung **pembayaran campuran**: tiap metode dikirim sebagai satu kaki
  (`payments: [{ cashAccountId, amount }]`) dan engine menulis satu kas movement per akun, satu jurnal
  settlement (N debit + 1 kredit piutang), satu alokasi total. **Kembalian dihitung POS**, bukan engine:
  POS mengirim bagian yang benar-benar diterima (tunai di-clamp ke sisa, kelebihannya jadi `kembalian`),
  jadi uang kembalian tidak pernah masuk laci. Transfer/QRIS tetap tidak boleh melebihi sisa.
  Pembayaran 0 (kredit penuh tanpa DP) **diizinkan** sejak engine commit `c6160ce`: dokumen
  ditulis tanpa cash movement/settlement/allocation, piutang tetap terbuka.
- **Pembulatan uang selaras engine**: POS menghitung total dengan pembulatan per-baris (qty 4dp, harga 2dp, gross 2dp, diskon 2dp) dan sebaran diskon transaksi yang sama persis seperti engine, sehingga total di layar kasir **sama persis** dengan `documentTotal` engine — tidak ada lagi selisih sub-rupiah yang menyebabkan "pembayaran kurang" palsu. Helper-nya `src/lib/uang.ts` (`hitungBarisHarga`, `sebarDiskonTransaksi`, `totalParity`): urutan potongan = base baris → diskon transaksi → voucher → loyalty → pajak.
- `livePembelianBuat` mendukung `metode: "hutang"` (pembelian 100% hutang) sejak engine commit
  `c6160ce`: dokumen ditulis tanpa cash account, hutang tetap terbuka. Pembelian DP sebagian juga didukung.
  Faktur **tunai/bank** boleh tanpa pemasok (`supplierId` null) untuk pembelian pasar; faktur **hutang**
  wajib menunjuk master pemasok supaya hutang tertelusur per pemasok di laporan AP ageing
  (`counterpartyId`). Form pembelian bisa membuat pemasok baru langsung dari nama (kode dibuat otomatis).
- **PPh per faktur**: form pembelian mengirim `isPphPotongan`, `pphType` (`PPH23`/`PPH42`) dan
  `pphRate` (pecahan) ke `POST /api/cash-batches/purchases`; engine menghitung PPh dari DPP (total
  baris sebelum PPN) dan menyimpannya di dokumen. `livePembelianList` membaca balikan
  `pphAmount`/`pphType`/`pphRate`/`pphBaseAmount`/`payableAmount`, dan halaman `/pph` menampilkan
  snapshot itu (bukan estimasi tarif global). POS menghitung pembayaran tunai/bank sebagai
  `total − PPh` karena engine memvalidasi pembayaran terhadap net payable. Halaman `/pph` memakai
  `api.pph.laporan(dari, sampai)` → `GET /api/reports/pph?fromDate=&toDate=` dengan filter bulan;
  mode mock menghitung rekap yang sama dari `mockDb.laporanPph`.
- **Voucher & poin**: checkout mengirim `voucherCode`, `memberCode`, `redeemPoints`; engine yang menghitung
  diskon voucher dan harga loyalty — `POST /api/vouchers/validate` dan `POST /api/loyalty/price` dipakai POS
  hanya untuk pratinjau, jadi angka yang dibukukan tetap milik engine. Diskon voucher/loyalty dipotong dari
  nilai invoice (tidak disebar ke baris). Memilih voucher mereset member (`cart.clearMember`), jadi poin
  divalidasi ulang terhadap dasar setelah voucher.
- **Uang muka**: tab **Uang Muka** di `/keuangan` memanggil `POST /api/payments/advances` /
  `POST /api/payments/refunds` dengan `direction` `CUSTOMER`/`SUPPLIER`, akun `2400` (uang muka pelanggan)
  dan `1350` (uang muka pemasok) — dapat diganti lewat
  `NEXT_PUBLIC_ENGINE_UANG_MUKA_PELANGGAN|PEMASOK`. Mode mock menolak alur ini dengan pesan eksplisit
  (jurnal kas + akun uang muka milik engine). `butuhPersetujuan` menandai dokumen yang tertahan approval.
- **Email** SMTP disimpan di engine (`GET/PUT /api/settings/email`, tab **Email**); mode mock hanya
  mengembalikan nilai kosong dan tidak menghubungi server.
- **Notifikasi Telegram/WA** tidak lewat engine: konfigurasi per perangkat di store `useNotifikasi`
  (`pos-sinaptex-notifikasi`), pengiriman langsung dari POS ke Bot API Telegram
  (`src/lib/notifikasi/telegram.ts`). Auto-kirim setelah checkout hanya untuk provider Telegram dan
  fire-and-forget (kegagalan tidak membatalkan transaksi). Provider WA baru menyimpan nomor — belum ada
  API pengiriman.
- Master pemasok sengaja hanya list/create/nonaktifkan (engine tidak menyediakan update kode/nama) —
  menjaga integritas nama pemasok pada faktur lama. `liveSupplierList` memakai
  `?includeInactive=true` supaya pemasok nonaktif tetap muncul di master dan namanya masih bisa
  di-resolve pada faktur lama; saran nama di form pembelian menyaring yang aktif saja.
- Kasir (authority level 2) boleh menerima pelunasan piutang langsung dari layar Kasir
  (tombol "Terima Piutang", F6) — engine tidak meminta approval terpisah (`approvalRequired: false`).
- `liveVoidTransaksi` memanggil void engine; bila engine menolak 409 (POSTED tidak boleh di-void),
  POS jatuh ke retur penuh (`liveRetur`).
- `liveBuatUser`/`liveUbahUser` memakai `authorityLevel` engine (99 = pemilik, 2 = kasir); peran POS
  dipetakan ke level itu, jadi pemilik bisa dibuat dan peran bisa diubah dari Pengaturan.
- `liveTransaksiRiwayat` kehilangan `kembalian` (0) — kembalian hanya dikembalikan saat checkout;
  `diskon` baris dibaca dari `discountAmount` engine, sedangkan diskon header selalu 0 (disebar ke baris saat checkout). `kasir` dibaca dari
  `requestedByName` yang sudah di-resolve engine (nama, bukan GUID), `shiftId` dari deskripsi batch
  yang ditulis POS. `piutang` diambil dari
  `GET /api/reports/ar-ap/aging?side=RECEIVABLE` (`outstandingAmount` per `invoiceNumber`), karena
  dokumen penjualan tidak menyimpannya. Kaki pembayaran semua baris dibaca sekali lewat
  `GET /api/sales/payments?from=&to=`; metodenya ditebak dari kode akun kas (gateway `1130` → `qris`,
  kas → `tunai`, lainnya → `transfer`) karena engine tidak menyimpan label metode.
- `livePembelianList` juga memakai `?side=PAYABLE`: `terbayar = total − outstanding` dan
  `metode = outstanding > 0 ? "hutang" : "tunai"`. Jangan pakai `payableAmount` dokumen — itu nilai
  hutang **bruto**, bukan sisa.
- `liveBayarPiutang` menerjemahkan nomor dokumen (`SALE-00001`) menjadi id penjualan dulu
  (`cariPenjualanByNomor`); rute engine hanya menerima id. `outstandingAfter` dari respons engine
  **mengabaikan DP batch**, jadi sisa piutang/hutang dihitung ulang dari laporan aging.
- `liveCompanyProfileGet` / `liveCompanyProfilePut` sinkronkan profil toko ke
  `GET/PUT /api/settings/company-profile`. Field khusus POS (`mataUang`, `zonaWaktu`,
  `footerStruk`, `pajakPersen`) tetap di localStorage (`useToko`).
- Impor produk live bersifat all-or-nothing (satu baris ditolak = tidak ada yang ditulis), hanya
  menerima `satuan` yang sudah ada di master unit engine, dan tidak mengimpor stok awal.
- Diskon per baris dikirim sebagai `discountAmount` (harga katalog tetap) dan diskon transaksi
  disebar proporsional ke baris (sisa pembulatan ke baris terakhir), karena dokumen penjualan
  engine menyimpan diskon per baris, bukan diskon header.
- `liveBiayaCatat` membebankan akun `NEXT_PUBLIC_ENGINE_BIAYA` (default `6900`); tunai memakai akun kas
  default, transfer memakai akun kas ber-kode `1111`. Akun non-EXPENSE/non-postable ditolak engine (400).
- Shift menyimpan **user pembuka** (`cashierUserId`) selain namanya. POS memakai `shift.cashierUserId`
  untuk menandai "shift dibuka oleh X" saat kasir yang login berbeda; operator yang melayani tetap
  user yang sedang login (nama itu masuk ke `requestedBy` batch → `requestedByName` di engine).
- Profil toko disinkronkan ke `GET/PUT /api/settings/company-profile` (`api.toko.profil`); store
  `useToko` hanya cache untuk struk. `api.pengaturan` (nama lama) masih dipakai untuk profil ringkas +
  unggah logo + email, dan `api.toko.kebijakan` untuk kebijakan operasional. Di mode mock, keduanya
  membaca/tulis store lokal.
- Logo toko diunggah ke engine (`POST /api/settings/company-profile/logo`, multipart) — berkasnya
  disimpan server yang mencetak faktur PDF, bukan di browser POS. URL logo dari engine relatif
  (`/uploads/logos/...`) → `urlLogoAbsolut()` di `live.ts` yang menempelkan host engine. Mode mock
  menolak unggah logo dengan pesan jelas (tidak ada penyimpanan berkas di browser).
- Dashboard menampilkan "Kesehatan usaha" dari `GET /api/analytics/health-summary?date=`
  (`api.analytics.healthSummary`, query key `["kesehatan-usaha"]`). Angka Rasio Lancar, Rasio
  Kas, dan Modal Kerja di live datang dari engine (jurnal yang sama dengan neraca saldo); mode mock
  menghitungnya sendiri dari akun mock (hanya 3 indikator yang bisa dihitung jujur).
- Dashboard analytics (P2.1): tren penjualan harian (SVG, filter 7/30/90 hari), komposisi metode
  pembayaran (donut), dan produk teratas dari `GET /api/analytics/product-performance/rankings`.
  Penjualan hari ini diperbarui otomatis tiap 60 detik. Komposisi pembayaran dan tren dihitung
  dari transaksi tercatat di POS (riwayat 1 tahun), bukan dari engine.
- Neraca saldo memakai `GET /api/reports/trial-balance?fromDate=&toDate=` dan membaca
  `openingBalance`/`closingBalance`: kolom **Saldo awal | Debit | Kredit | Saldo berjalan**.
- **Arus kas & perubahan modal dihitung di POS** (`src/lib/laporan.ts`) karena engine belum punya
  endpoint khusus: arus kas metode langsung mengelompokkan tiap jurnal yang menyentuh akun kas
  (kode dari `GET /api/cash-accounts`, fallback kode `11xx`) menjadi operasi/investasi (`16xx`)/
  pendanaan (ekuitas, `25xx`/`26xx`, `1250`/`2450`) menurut akun lawannya; perubahan modal memakai
  saldo akun ekuitas + laba berjalan dan memisahkan jurnal `CLOSING` (laba ditutup) dari setoran/prive.
  Neraca berjalan & laba-rugi juga dihitung POS dari trial balance.
- Rute engine selalu memakai **id** dokumen, sedangkan POS menyimpan nomor dokumen
  (`SALE-00001`). Jadi nomor harus diterjemahkan dulu (`cariPenjualanByNomor`) sebelum
  memanggil `/api/sales/{id}/...` — konfirmasi digital dan pelunasan piutang pernah 404 karena
  lupa menerjemahkan nomor.
- `liveReturRiwayat` mengambil detail tiap retur (halaman dibatasi 20 baris) untuk mengisi item dan
  alasan; daftar retur dari engine hanya memuat angka.
- Batch yang ditahan aturan persetujuan tampil di halaman **Persetujuan** (`/persetujuan`, owner):
  antrean diambil dari `GET /api/transactions?status=SUBMITTED`, tiap kaki di-approve lewat
  `POST /api/transactions/{id}/approve`, lalu batch di-post lewat `POST /api/cash-batches/{batchId}/post`.
  Status penjualan yang masih `SUBMITTED` di Riwayat berstatus `menunggu_persetujuan`.
  `CASH_TRANSFER` dan `PURCHASE_RETURN` tidak punya cash batch: yang pertama di-post lewat
  `/api/cash-transfers/{id}/post`, yang kedua lewat `/api/purchase-returns/{id}/post` setelah id
  dokumennya dicari dengan `GET /api/purchase-returns/by-transaction/{transactionId}` (transaksi
  approval hanya menyimpan id transaksi, bukan id dokumen). `SALE_RETURN` belum dipetakan.
- Retur pembelian menunjuk **baris pembelian** (`PembelianItem.id` dari `GET /api/purchases`), bukan
  produk, jadi `liveReturPembelian` mengalokasikan qty per baris (satu produk bisa muncul di beberapa
  baris dengan harga beli berbeda) dan mengirim `purchaseItemId` + `quantity`. Mock memberi id baris
  saat `registerPembelian`.
- Konfirmasi QRIS dipicu dari Riwayat (tombol **Konfirmasi**, owner) saat transaksi berstatus
  `menunggu_pembayaran` dan punya pembayaran `qris` yang belum `POSTED`. QRIS kini punya akun sendiri
  di engine: checkout mengarahkan uangnya ke akun kas ber-kode `NEXT_PUBLIC_ENGINE_GATEWAY` (default
  `1130`, dibuat otomatis lewat `POST /api/accounts` + `POST /api/cash-accounts` bila tenant belum
  punya), bukan ke bank. Konfirmasi memindahkan dana penampung gateway ke bank lewat
  `POST /api/cash-transfers` dengan deskripsi bertanda `[QRIS <nomor>]`; bila transfer ditahan aturan
  approval (`approvalRequired`), status jadi `menunggu_persetujuan`. Bila penjualan tidak punya kaki
  gateway (mis. pembayaran ditahan approval), POS jatuh ke jalur lama
  `POST /api/sales/{id}/confirm-payment` — rute itu mencari kaki `CustomerPayment` lewat **BatchId
  transaksi dokumen**, bukan `sale.BusinessTransactionId`.
- Riwayat live membaca kaki pembayaran sekaligus lewat `GET /api/sales/payments?from=&to=`
  (satu permintaan, bukan satu per baris). QRIS dianggap belum dikonfirmasi selama belum ada movement
  keluar bertanda `[QRIS <nomor>]` di akun gateway (`GET /api/cash-accounts/{id}/movements`); kaki
  gateway yang belum dikonfirmasi dilaporkan berstatus `MENUNGGU_KONFIRMASI` supaya tombol Konfirmasi
  tetap tampil. Pembayaran campuran QRIS + transfer boleh berbagi batch: tiap metode jadi kaki sendiri,
  dan konfirmasi QRIS hanya memindahkan kaki gateway-nya.
- **Cabang aktif** (`src/lib/store/cabang.ts`, persist `pos-sinaptex-cabang`): memilih cabang di topbar
  membuat `minta()` menempelkan `X-Branch-Id` ke setiap request live; `null` = Pusat (tenant utuh).
  Gudang baru otomatis terikat ke cabang aktif.
- **Rasio analitik** (`/api/analytics/*`) dipakai halaman Laporan tab Analisis: profitabilitas,
  perputaran persediaan/AR/AP, modal kerja + perputarannya, rasio lancar/kas, solvabilitas, siklus
  konversi kas, dan ranking performa produk untuk dashboard.

## Printer ESC/POS

- `@tauri-apps/plugin-printer` tidak ada di npm; printer memakai command Tauri sendiri di
  `src-tauri/src/printer.rs` (`printers`, `print_raw`) dengan Windows spooler datatype `RAW`.
- Frontend: `src/lib/printer/escpos.ts` (builder byte ESC/POS), `src/lib/printer/printer.ts`
  (invoke; mengembalikan `[]`/gagal bila bukan Tauri), store `usePrinter` (key
  `pos-sinaptex-printer`). Pengaturan di tab **Printer**.
- `cetakStruk`/`cetakKuitansi` di `src/lib/struk.ts` mencoba native dulu lalu fallback ke
  dialog browser bila nonaktif/gagal. Auto-print dipicu di `payment-dialog.tsx` setelah checkout
  sukses, kecuali transaksi `menunggu_persetujuan`/`menunggu_pembayaran`.
- Verifikasi Rust: `cargo check --release --manifest-path src-tauri/Cargo.toml` (build debug
  dari nol bisa gagal di proc-macro pada mesin ini; profile release memakai cache yang valid).
- Sidik perangkat aktivasi: command `machine_id` (`src-tauri/src/machine.rs`) = FNV-1a nama
  komputer + serial volume `C:`. Di browser (bukan Tauri) jatuh ke UUID di `localStorage`.

## Splash & Aktivasi

- `ActivationGate` (`src/components/activation-gate.tsx`) di `Providers`: splash singkat, lalu
  syarat & ketentuan sekali, lalu dialog key. Store `useAktivasi` (`pos-sinaptex-aktivasi`).
- Format key: `SNTX-XXXXX-XXXXX-CCCCC` (tanpa 0/O/1/I). Grup terakhir = checksum FNV-1a
  dua grup pertama, jadi key acak ditolak. Jenis lisensi dari karakter pertama.
  2 karakter terakhir grup kedua bisa menyandi bulan kedaluwarsa sejak Jan 2026 (base32);
  nilai 0 atau penuh = tanpa batas.
- Key dicatat lokal per perangkat (`pos-sinaptex-key-terpakai`) dan dicocokkan ke `machine_id`
  (key yang sudah dipakai perangkat lain ditolak). Mode live juga memanggil engine
  `POST /api/licenses/activate` dan status `GET /api/licenses/status?machineId=`; mode mock hanya
  memvalidasi format + checksum secara lokal. Penjagaan ini tetap bisa dilewati dengan menghapus
  localStorage, jadi jangan anggap anti-pembajakan.
- Instalasi yang sudah punya sesi `pos-sinaptex-auth` ditandai `instalasi-lama` dan tidak dikunci.
  Mode mock boleh melewati key ("mode demo"); mode live mewajibkan key pada perangkat baru.
- Tab **Lisensi** di Pengaturan hanya menampilkan status (jenis, key tersamar, kedaluwarsa, sidik).

## Payment Gateway

- **Tidak ada kredensial gateway yang hardcode.** Semua konfigurasi (provider, base URL, API key, merchant,
  mode sandbox/produksi, jenis auth, interval polling, timeout, kode akun kas penampung) ada di
  **Pengaturan → Gateway** dan disimpan lokal per perangkat di store `useGateway`
  (key `pos-sinaptex-gateway`). API key tidak dikirim ke engine.
- Client HTTP: `src/lib/gateway/client.ts` (`buatTagihan`, `statusTagihan`, `tesKoneksi`) dengan adapter
  Midtrans (`/v2/charge` QRIS + status `/v2/qr_code/{id}/status`), Xendit (`/v2/qr_codes`), dan REST umum
  (path buat/status bebas, `{id}` sebagai penanda). Semua error → `GatewayError` berBahasa Indonesia.
- Default baru: provider **Midtrans** mode sandbox (`https://api.sandbox.midtrans.com`), auth Basic
  (server key). Form otomatis mengisi base URL saat provider/mode diganti, tetapi tetap bisa diedit manual.
- Kasir: `src/components/kasir/gateway-panel.tsx` membuat tagihan, menampilkan QR (paket `qrcode`, diimpor
  dinamis agar tidak masuk bundle awal), lalu polling status. Saat status lunas, POS mencatat penjualan
  dengan kaki QRIS → engine menerima dana di akun penampung gateway (status `menunggu_pembayaran`), dan
  pemilik memindahkannya ke bank lewat tombol Konfirmasi yang sudah ada.
- Kode akun kas penampung dibaca runtime oleh `live.ts` lewat `kodeAkunGateway()` (store dulu, env
  `NEXT_PUBLIC_ENGINE_GATEWAY` sebagai fallback) sehingga bisa diganti per toko tanpa rebuild.
- Id tagihan gateway disimpan pada deskripsi penjualan (`... · gateway <id>`) untuk rekonsiliasi manual.
- Yang belum ada: webhook status (butuh endpoint publik), auto-cancel timeout, refund via API.

## Reminder Piutang

- Halaman `/piutang` (owner, menu **Reminder Piutang**) memakai data aging AR dari
  `api.aging.ar` (`useArAging`), bukan daftar transaksi.
- Helper `src/lib/reminder.ts`: `tahapReminder` (jatuh tempo hari ini / H-1 / H+3 / H+7),
  `selisihHariJatuhTempo`, `perluReminder`, `susunPesan`, `normalisasiTelepon`, `tautanWhatsApp`.
- Jatuh tempo efektif = `dueDate` invoice; bila kosong dipakai tanggal invoice (mem sesuai engine:
  tanpa termin = jatuh tempo saat invoice dibuat).
- Pengiriman reminder **manual**: tombol WA membuka `https://wa.me/<no>?text=<pesan>` (dibuka di
  browser/POS, bukan API provider), tombol salin menyalin pesan, tombol centang menandai
  "sudah dietingatkan". Tidak ada kredensial WA/SMS/Email yang disimpan.
- Template pesan (4 tahap) + riwayat reminder disimpan lokal di store `useReminder`
  (key `pos-sinaptex-reminder`, maks. 500 entri). Placeholder: `{nama}`, `{nomor}`, `{nominal}`,
  `{jatuhTempo}`, `{toko}`.
- Dashboard menampilkan peringatan "Reminder piutang" berisi jumlah faktur yang jatuh
  tempo/terlambat dan belum ada log reminder untuk tahap tersebut.
- Karena log bersifat lokal per mesin, riwayat tidak ikut tersinkron ke engine.

## Conventions

- TypeScript strict mode. `type` aliases over `interface`; named exports; default export only
  for Next.js `page.tsx` / `layout.tsx` / `manifest.ts`.
- `"use client"` hanya bila butuh hooks/state/browser API; komponen presentasional tetap server-compatible.
- Path alias `@/*` → `src/*` (jangan pernah `../../` relatif).
- Inline prop types: `{ children }: { children: React.ReactNode }` — tanpa `React.FC`.
- Setiap komponen menerima `className?: string` yang digabung via `cn()` dari `src/lib/utils.ts`.
  `cn()` = join sederhana (tanpa clsx/tailwind-merge).
- Tailwind v4 CSS-first tokens di `src/app/globals.css` (`@theme`). Utility semantik yang benar-benar
  ada: `panel`, `btn-primary`, `btn-secondary`, `btn-accent`, `input`, `label`.
  Brand navy `#0B2F6E`, accent orange `#F97316`. Money pakai utilitas `tabular-nums` (bukan kelas `.money`).
- Money: selalu `<MoneyDisplay value={...} />` / `formatIDR()`; jangan tulis string mata uang manual.
- Tabel: pakai `<DataTable<T> columns={...} rows={...} rowKey={...} empty={...} />` dari
  `src/components/data-table.tsx`; baris kustom (mis. katalog kasir) boleh `<table>` langsung.
  Saat memuat, kirim `loading` (+ `skeletonRows`) — tabel merender baris skeleton, bukan teks "Memuat...".
- Loading state: `<Skeleton>`, `<TableSkeleton>`, `<KpiSkeleton>`, `<ListSkeleton>` dari
  `src/components/skeleton.tsx` (Tailwind `animate-pulse`). Halaman yang datanya belum siap merender
  kerangka layout aslinya, bukan satu baris teks di tengah layar.
- Status: string-literal unions + label/tone map. Peta `STATUS_LABEL`/`STATUS_TONE` masih duplikat
  per halaman; `StatusBadge` punya `TONES` bersama (`neutral|info|success|warning|danger`).
- Zustand: satu store per concern, `type XState` eksplisit, `persist` seperlunya
  (`auth` = `pos-sinaptex-auth`, menyimpan `user` + `refreshToken` + `kedaluwarsa`, access token di-exclude
  via `partialize`; `toko` = `pos-sinaptex-toko`; `printer` = `pos-sinaptex-printer`;
  `reminder` = `pos-sinaptex-reminder` (template + riwayat reminder piutang);
  `gateway` = `pos-sinaptex-gateway` (konfigurasi payment gateway per perangkat);
  `aktivasi` = `pos-sinaptex-aktivasi` (syarat disetujui, key lisensi, atau pengecualian demo/instalasi lama);
  `cabang` = `pos-sinaptex-cabang` (cabang aktif + daftar);
  `notifikasi` = `pos-sinaptex-notifikasi` (Telegram/WA per perangkat);
  `cart` tidak pernah dipersist).
  Item keranjang membawa `voucher` + `member` (diskon dari validasi engine). Perhitungan uang dipusatkan
  di `src/lib/uang.ts` (`hitungBarisHarga`, `sebarDiskonTransaksi`, `totalParity`); `cart.ts` masih
  mengekspor `subtotalLines`/`pajakNominal`/`totalTransaksi` untuk tampilan, dan `api/client.ts`
  menghitung ulang total di sisi "server" (`hitungTotal` → `totalParity`).
- React Query: query key berupa array string pendek. Namespace yang dipakai: `["products"]`, `["pelanggan"]`,
  `["shift"]`, `["shift-riwayat"]`, `["transaksi"]`, `["retur"]`, `["pembelian"]`, `["pph-laporan", …]`,
  `["biaya"]`, `["jurnal"]`, `["akun", …]`, `["laba-rugi"]`, `["kesehatan-usaha"]`, `["analytics", …]`,
  `["master", "suppliers"|"vouchers"|"members"|"member-tiers"|"loyalty-policy"|"approval-rules"]`,
  `["inventaris-ringkasan"]`, `["inventaris-stok", …]`, `["inventaris-mutasi", …]`, `["gudang"]`,
  `["stock-opname"]`, `["aset-tetap", …]`, `["backup"]`, `["cabang"]`, `["transfer-cabang"]`,
  `["persetujuan"]`, `["users"]`, `["audit"]`. Default provider: `staleTime: 30_000`, `retry: 1`.
  Mutation dikelompokkan dalam hook yang mengembalikan objek mutation, contoh:
  `useTransaksiMutations() → { batal, retur, konfirmasiDigital }`, `useShiftMutations()`,
  `useProductMutations()`, `useUserMutations()`, `useImporMutations()`, `usePembayaranMutations()`,
  `useBiayaMutations()`, `useMemberMutations()`, `useTierMutations()`, `useAsetTetapMutations()`,
  `useInventarisMutations()`, `useBackupMutations()`, `useCabangMutations()`,
  `useTransferCabangMutations()`, `useUangMukaMutations()`, `useRefundMutations()`,
  `usePersetujuanMutations()`; checkout punya hook sendiri `useCheckout(onSuccess)`.
  Voucher memakai hook tunggal (`useVoucherList`, `useVoucherCreate`, `useVoucherUpdate`,
  `useVoucherDeactivate`, `useVoucherValidate`), bukan grup mutation.
  Invalidasi: perubahan GL invalidate `["jurnal"]`, `["akun"]`, `["laba-rugi"]`; aksi transaksi juga
  `["transaksi"]`, `["products"]`, `["shift"]`, `["audit"]`, `["retur"]`.
- Akses rute: `AuthGuard` (di `(app)/layout.tsx`) redirect ke `/login` tanpa sesi dan menolak role
  yang tidak ada di `NAV_GROUPS` (`src/lib/nav.ts`; semua menu kecuali Kasir/Riwayat/Shift = pemilik).
- Validasi: Zod (v3) hanya dipakai di `src/components/produk/product-form-dialog.tsx` (schema module-level,
  `safeParse`, `z.infer`). Form lain (login, shift, pembelian, keuangan, pengaturan, retur, impor)
  hand-roll validasi dengan pesan bahasa Indonesia. `react-hook-form` tidak dipakai.
- Dialog: fixed overlay buatan sendiri (tanpa dialog library). Ikon `lucide-react` dengan `aria-hidden`;
  tombol ikon-saja wajib `aria-label`.
- Jangan menambah komentar kecuali diminta. Jangan menambah library tanpa cek pemakaian existing.

## Domain Rules

- Kasir tidak boleh bertransaksi sebelum shift terbuka; layar POS menampilkan panel pemblokir + link Buka Shift.
  Shift **tidak** dibuka otomatis saat login: kasir/pemilik membuka shift sendiri di menu Shift, nama kasir
  mengikuti akun yang sedang masuk (bukan input bebas), dan kas awal diisi sesuai uang fisik di laci
  (nilai awal dari Pengaturan → Operasional, `useToko().kebijakan.saldoAwalShift`).
- **Nama kasir di layar dan struk = user yang sedang login**, bukan nama pembuka shift. Shift hanya
  mencatat siapa yang MEMBUKA-nya (`cashierUserId`); kalau berbeda, POS menampilkan peringatan
  "Shift dibuka oleh X" dan tidak memblokir transaksi (satu shift dipakai bersama di satu tenant).
- Checkout membawa `idempotensiKunci` (`crypto.randomUUID()` per sesi dialog). Mock menolak kunci yang
  sudah dipakai via `mockDb.kunciCheckout`; live mengirimnya sebagai `Idempotency-Key`.
- Alokasi pembayaran (mock, diproses berurutan): **tunai** boleh melebihi sisa dan kelebihannya jadi
  kembalian; **transfer/qris** tidak boleh melebihi sisa (ditolak). Kekurangan hanya boleh jadi piutang
  bila `gunakanPiutang` dan `useToko().kebijakan.izinkanKredit` (default `true`) tidak memblokirnya.
- Status pembayaran: `lunas | menunggu_pembayaran | dibayar_sebagian | dibatalkan` (terpisah dari status
  transaksi). QRIS membuat status `menunggu_pembayaran` sampai owner mengonfirmasi; di live konfirmasi
  memindahkan dana gateway ke bank lewat `POST /api/cash-transfers` (fallback
  `POST /api/sales/{id}/confirm-payment` bila tidak ada kaki gateway).
- Voucher & poin: diskon voucher divalidasi dengan dasar belanja sebelum voucher; poin dihitung dari
  dasar **setelah** voucher. Memilih voucher mereset member, jadi urutannya voucher dulu lalu poin.
  Keduanya hanya memotong nilai invoice, bukan harga baris (riwayat/struk live tidak punya baris voucher).
- Member: master + tier + kebijakan poin (aktif, poin per ribu, nilai poin, autoTier). Hanya pemilik yang
  boleh mengubah master/tier/kebijakan (mock menegakkan role); penyesuaian poin dicatat sebagai transaksi
  poin per member.
- Void/retur/penyesuaian stok/konfirmasi digital/impor = owner only. Mock menegakkan role di `mockDb`
  (`user.role !== "pemilik"` → error); live memetakan ke otorisasi/approval engine. Transaksi asli tetap
  direferensikan, jurnal pembalik diposting.
- Jurnal harus seimbang (total debit = total kredit). Saldo diturunkan dari jurnal, tidak pernah diinput user.
  Jurnal penjualan mock memakai HPP dari `TransaksiItem.hargaBeli` (snapshot saat transaksi); void/retur
  memakai snapshot yang sama, bukan harga beli produk saat ini.
- Retur mock membalik proporsional: `Retur penjualan` (neto) + `Pajak keluaran` sesuai porsi item yang
  diretur; diskon transaksi ikut diproporsi; refund = neto + pajak yang dibayar pelanggan.
- Saldo kas shift = `saldoAwal + kasMasuk − kasKeluar + penjualanTunai`; `penjualanTunai` bertambah dari
  checkout tunai, pelunasan piutang tunai, dan berkurang saat refund retur tunai.
- Tutup shift mencatat selisih uang fisik vs sistem sebagai peringatan.
- Mock adalah in-memory: data (produk, transaksi, jurnal, shift, voucher, member) reset saat reload
  halaman; yang persist di localStorage hanya store perangkat (`auth`, `toko`, `printer`, `reminder`,
  `gateway`, `aktivasi`, `cabang`, `notifikasi`).

## Caveat yang diketahui

Sudah diperbaiki (2026-10-28) dan tidak boleh dianggap bug lagi — detail di
`docs/rencana-desain-ui-ux.md` ("Yang sudah diperbaiki pada mock"): idempotensi mock, jurnal overpay tidak seimbang, akumulasi
`penjualanTunai`, role check pemilik di mock, reversal void (pajak + QRIS + piutang + snapshot HPP),
retur proporsional, dan penghapusan `src/lib/api/calc.ts`.

Batasan yang masih ada:

- Live: `kembalian` hanya dikembalikan saat checkout; kartu riwayat tidak menyimpannya (engine tidak
  mencatat uang kembalian, karena yang masuk laci memang hanya bagian yang diterima).
- Live: diskon transaksi disebar ke baris, jadi riwayat/struk live menampilkan diskon per baris
  (tidak ada baris `diskonTransaksi` terpisah).
- Live: master pemasok bisa dibuat & dinonaktifkan, tapi kode/nama tidak bisa diubah (engine sengaja
  `init`-only). Faktur lama tanpa `supplierId` (sebelum master dipakai) dikelompokkan lewat namanya.
- Live: satu shift aktif per tenant (bukan per kasir) — POS menandai "shift dibuka oleh X" kalau
  kasir yang login berbeda dengan pembuka shift.
- Live: diskon voucher/poin hanya memotong total invoice, tidak muncul sebagai baris sendiri di
  riwayat/struk (riwayat membaca `discountAmount` per baris).
- Mock: alur yang butuh penyimpanan/jurnal engine ditolak dengan pesan eksplisit — uang muka/refund,
  unggah logo, dan backup/pulihkan database. Email mock mengembalikan nilai kosong; lisensi mock hanya
  memvalidasi format key secara lokal.
- Mock: notifikasi Telegram tetap dikirim langsung dari browser (bisa kena CORS/koneksi internet),
  karena fitur ini tidak lewat engine di kedua mode.
- Mock: uang memakai `number` JS, bukan decimal — pembulatan bisa berbeda dari engine.

## Quick Reference (Ringkasan Cepat)

### Perintah Utama
```bash
npm install && npm run dev          # dev server :3000
npm run build                       # static export → out/
npx tauri dev / npx tauri build     # desktop dev / installer
npx tsc --noEmit                    # typecheck (no lint/test)
```

```bash
cd backend
dotnet build AccountingEngine.slnx
dotnet test
dotnet run --project src/AccountingEngine.Api   # :5121
dotnet ef database update -p src/AccountingEngine.Infrastructure -s src/AccountingEngine.Api
python ../tools/bootstrap-backend.py
```

### Peta Kode Singkat
```
src/app/           layout, login, kasir (full-screen), (app)/ grup → dashboard, riwayat, shift, produk, persediaan, aset-tetap, pembelian, supplier, voucher, member, keuangan, piutang (reminder), akuntansi, laporan, pph, persetujuan, approval-rules, cabang, pengaturan
src/components/    shared UI + kasir/ + produk/ + dashboard/ + pengaturan/ (printer, gateway, email, notifikasi, lisensi) + activation/ + legal/
src/hooks/queries.ts   SEMUA TanStack Query hooks
src/lib/api/       types.ts (kontrak), client.ts (facade + switch), live.ts (HTTP engine), mock/db.ts (engine mock)
src/lib/store/     auth, toko, printer, reminder, gateway, aktivasi, cabang, notifikasi (persist), cart (no persist)
src/lib/printer/   escpos.ts (builder), printer.ts (invoke Tauri)
src/lib/gateway/   client.ts (buat tagihan + status: Midtrans/Xendit/REST umum)
src/lib/notifikasi/ telegram.ts (kirim Bot API langsung dari POS)
src/lib/           csv, dashboard, format, laporan (arus kas & perubahan modal), license, license-device, nav, reminder, struk, uang (totalParity), utils (cn)
src-tauri/         Rust shell minimal + printer.rs (raw print Windows spooler)
backend/           nested git repo (Accounting Engine .NET 10)
tools/             bootstrap-backend.py
scripts/           backend task, client env, backup harian + restore
```

### Aturan Lapisan (Wajib)
- Semua akses data lewat `api.*` (`src/lib/api/client.ts`) — **komponen tidak pernah panggil `mock/db.ts` atau `live.ts` langsung**
- `live.ts` = satu-satunya tempat HTTP/JWT/refresh/idempotensi
- `backend/` = nested git repo (perubahan engine tidak ikut commit POS)
- Logika bisnis (stok, saldo, jurnal) milik engine; mock `db.ts` berperan sebagai engine

### Konvensi Kunci
- TS strict, `type` over `interface`, named export, `@/*` → `src/*`
- `"use client"` hanya butuh hooks/state/browser API
- `className?` + `cn()` (join sederhana)
- Utility: `panel`, `btn-primary`, `btn-secondary`, `btn-accent`, `input`, `label` (lihat `DESIGN.md`)
- Uang: `<MoneyDisplay>` / `formatIDR()` + `tabular-nums`
- Tabel: `<DataTable<T> loading skeletonRows />` — bukan teks "Memuat..."
- Loading: skeleton components (`src/components/skeleton.tsx`)
- Validasi: Zod hanya `product-form-dialog.tsx`; sisanya hand-roll + pesan ID
- Dialog: overlay buatan sendiri, ikon `aria-hidden`, tombol ikon wajib `aria-label`
- React Query key: array string pendek (`["products"]`, `["transaksi"]`, `["shift"]`, …)
- Zustand: 1 store/concern, persist `auth`, `toko`, `printer`, `reminder`, `gateway`, `aktivasi`, `cabang`, `notifikasi`

### Domain Rules Ringkas
- Kasir **tidak transaksi sebelum shift buka** (panel pemblokir)
- Shift **tidak auto-open** login; nama kasir = user login; shift catat `cashierUserId`
- Checkout bawa `idempotensiKunci` → `Idempotency-Key`
- Alokasi: tunai > sisa = kembalian; transfer/QRIS ≤ sisa; kekurangan → piutang hanya bila `izinkanKredit`
- Status bayar ≠ status transaksi: `lunas | menunggu_pembayaran | dibayar_sebagian | dibatalkan`
- Void/retur/penyesuaian/konfirmasi/impor = owner only; jurnal pembalik
- Saldo dari jurnal; tidak input manual (kecuali impor saldo awal)
- Retur proporsional (neto + pajak + diskon), refund = yang dibayar pelanggan
- Voucher dulu, baru poin: pilih voucher mereset member; keduanya memotong nilai invoice (bukan harga baris)
- Uang muka pelanggan/pemasok hanya di mode live (`/api/payments/advances|refunds`), bukan jurnal mock

### Gotcha Mode Live
- Engine pakai **id** dokumen; POS simpan nomor → terjemahkan dulu (`cariPenjualanByNomor`)
- Campuran dikirim sebagai `payments[]` (satu kaki per akun kas); kembalian dihitung POS, bukan engine;
  bayar 0 (kredit penuh) **diizinkan**
- **Total checkout selaras engine**: pembulatan per-baris (qty 4dp, harga 2dp, gross 2dp, diskon 2dp) + sebaran diskon transaksi yang identik → total layar = `documentTotal` engine persis.
- Diskon transaksi disebar ke baris → riwayat/struk live menampilkan diskon per baris
- `piutang` dari aging `side=RECEIVABLE`; `terbayar` pembelian dari `side=PAYABLE` (bukan `payableAmount`)
- Void 409 (POSTED) → fallback retur penuh
- Master pemasok: list/create/nonaktifkan saja; list pakai `?includeInactive=true`
- Voucher/poin: engine menghitung diskon; POS cuma pratinjau (`/api/vouchers/validate`, `/api/loyalty/price`); `voucherCode`/`memberCode`/`redeemPoints` masuk checkout
- Uang muka & refund: `/api/payments/advances|refunds` (akun `2400`/`1350`, env `NEXT_PUBLIC_ENGINE_UANG_MUKA_*`)
- Notifikasi Telegram dikirim langsung dari POS (bukan engine); email SMTP disimpan di engine
- Satu shift aktif per tenant (bukan per kasir)
- Impor produk live all-or-nothing, `satuan` harus ada master unit, no stok awal
- Profil toko sync `/api/settings/company-profile`; field POS di localStorage
- Logo upload ke engine (mock tolak)
- QRIS: uang ditahan di akun gateway (`1130`), konfirmasi = `POST /api/cash-transfers` gateway→bank bertanda `[QRIS <nomor>]`
- Backup/cabang: POS mengirim `X-Branch-Id` saat cabang aktif dipilih (topbar). Default null = Pusat (semua cabang). Gudang baru otomatis terikat ke cabang aktif.
- Transfer antar cabang (tab **Cabang**): `POST /api/inter-branch-transfers` menulis satu dokumen + dua jurnal (Piutang Antar Cabang di pengirim, Utang Antar Cabang di penerima); cabang asal/tujuan dari body, bukan header; engine menolak cabang sama & periode tertutup.
- Batch tertahan approval: `/persetujuan` → `GET /api/transactions?status=SUBMITTED` → approve → `POST /api/cash-batches/{batchId}/post`

### Verifikasi
- Frontend: `npx tsc --noEmit` bersih + `npm run build` sukses (25 halaman + `/_not-found` +
  `/manifest.webmanifest`, static export ke `out/`)
- Backend: `dotnet build` bersih + `dotnet test` (525 unit + 766 integration lulus)
- Mock: alur manual `/kasir` (buka shift → checkout → riwayat → tutup shift)

## Docs

- `README.md` — setup, fitur, arsitektur singkat, konvensi, domain rules, gotcha live, verifikasi
- `DESIGN.md` — token design system (`@theme` 42 baris) + tabel "Utility yang TIDAK ada"
- `docs/README-DOKUMENTASI.md` — indeks dokumentasi (manual owner/kasir, quick start, deployment)
- `docs/TODO-NEXT-PHASE.md` — status MVP/P1/P2 + rencana fase berikutnya
- `docs/rencana-desain-ui-ux.md` — arsip historis: blueprint desain, kontrak endpoint usulan vs aktual, log perbaikan
- `docs/SPEC-SPLASH-ACTIVATION.md`, `docs/SPEC-PRINTER-ESC-POS.md` — spesifikasi splash/aktivasi & printer ESC/POS
- `docs/DEPLOYMENT-GUIDE.md`, `docs/MANUAL-OWNER.md`, `docs/MANUAL-KASIR.md`, `docs/QUICK-START-*.md` — deploy & panduan pemakaian
- `backend/README.md`, `backend/AGENTS.md`, `backend/knowledge.md` — spesifikasi & aturan engine (repo terpisah)
