# AGENTS.md — POS-Sinaptex

## Project Overview

Next.js 15 (App Router, static export) POS application for UMKM retail stores, wrapped as a
Tauri 2 desktop app (`POS-Sinaptex.exe`). Backend is an external C# engine ("Accounting Engine",
ASP.NET Core, .NET 10) served over REST + JWT.

- Two data modes: `mock` (in-memory engine, default) and `live` (HTTP ke engine C#).
- Live mode is **partially wired** — see "Mode Live" below for the exact connected/not-connected split.
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
    login/page.tsx       → login (no shell; auto-buka shift untuk role kasir)
    kasir/page.tsx       → full-screen POS, intentionally outside (app) group
    (app)/               → AppShell group + AuthGuard: dashboard (/), produk, riwayat, shift,
                           pembelian, supplier, keuangan, akuntansi, laporan,
                           approval-rules, pengaturan
  components/            → shared UI (app-shell, sidebar, data-table, money-display,
                           status-badge, form-field, page-header, auth-guard) + kasir/ + produk/
  hooks/queries.ts       → ALL TanStack Query hooks (queries + mutation groups)
  lib/
    api/types.ts         → domain types (single source of truth / C# contract)
    api/client.ts        → `api` facade, API_MODE mock|live switch
    api/live.ts          → live client: fetch ke engine C# + pemetaan DTO→domain
    api/mock/db.ts       → in-memory mock engine (double-entry journal, GL, P&L)
    store/               → zustand: auth.ts (persist), cart.ts, toko.ts (persist)
    csv.ts, format.ts, nav.ts, struk.ts, utils.ts
  sw.ts                  → Serwist service worker
src-tauri/               → Rust shell (tauri-plugin-log saja; belum ada native API)
backend/                 → nested git repo (gitignored di root): Accounting Engine (.NET 10)
tools/                   → bootstrap-backend.py (tenant + owner + RBAC + kas + periode)
```

### Layer rules

- **Semua akses data lewat `src/lib/api/client.ts` (`api.*`).** Komponen tidak pernah memanggil
  `mock/db.ts` langsung.
- `API_MODE === "live"` memakai `src/lib/api/live.ts` (fetch ke engine C# + pemetaan DTO→domain);
  jalur HTTP (header, JWT, refresh, idempotensi) hanya boleh disentuh di file itu. Alur yang engine-nya
  belum punya endpoint melempar `engineBelumAda(...)` — pesan eksplisit, bukan data mock.
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
pembelian (`/api/purchases`), void (`POST /api/transactions/{id}/void`), retur
(`POST /api/sale-returns` + riwayat `GET /api/sale-returns`), impor produk
(`POST /api/products/import`, multipart), impor pelanggan (`POST /api/customers/import`, multipart),
impor saldo awal (`POST /api/accounts/opening-balances`, multipart), saldo akun + laba-rugi (dari `trial-balance`),
daftar jurnal (`GET /api/journal`), biaya (`GET/POST /api/expenses`), daftar akun kas + transfer
antar-rekening (`GET /api/cash-accounts`, `GET/POST /api/cash-transfers`), pelunasan piutang
(`POST /api/sales/{id}/payments`), pelunasan hutang (`POST /api/purchases/{id}/payments`),
penyesuaian stok (`POST /api/inventory/adjustments`), gudang (`GET/POST /api/warehouses`,
`POST /api/warehouses/{id}/deactivate`), stok per gudang (`GET /api/inventory/stock?warehouseId=`),
transfer stok antar gudang (`POST /api/inventory/transfers`),
kartu stok (`GET /api/inventory/movements?productId=&warehouseId=`),
opname stok (`GET/POST /api/inventory/opnames`, `POST /api/inventory/opnames/{id}/complete|cancel`),
konfirmasi QRIS
(`POST /api/sales/{id}/confirm-payment`), buat user kasir (`POST /api/users/direct`),
daftar/ubah/hapus user (`GET/PUT/DELETE /api/users`), jejak audit (`GET /api/audit-log`),
master pemasok (`GET/POST /api/suppliers`, `POST /api/suppliers/{id}/deactivate`),
kebijakan operasional (`GET/PUT /api/settings/operational-policy`), periode fiskal
(`/api/fiscal-periods`), umur piutang/hutang + rekonsiliasi (`/api/reports/ar-ap/*`),
analitik kesehatan & rasio (`/api/analytics/*`), dan persetujuan transaksi
(`GET /api/transactions?status=SUBMITTED`, `POST /api/transactions/{id}/approve`,
`POST /api/cash-batches/{batchId}/post`).

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
Sebagian **Persediaan** (menu `Persediaan`, rute `/persediaan`) juga belum punya endpoint; yang sudah jalan di live adalah master gudang, stok
per gudang, penyesuaian stok, transfer stok antar gudang (`POST /api/inventory/transfers`), kartu stok
(`GET /api/inventory/movements`), opname stok (`/api/inventory/opnames`), dan ringkasan/nilai
persediaan (nilai memakai harga beli master karena engine belum membuka harga rata-rata per gudang).

Perilaku live yang menyimpang dari mock:

- `liveCheckout` menolak pembayaran campuran (tunai + non-tunai) dan overpayment; `kembalian` selalu 0.
  Pembayaran 0 (kredit penuh tanpa uang muka) **diizinkan** sejak engine commit `c6160ce`: dokumen
  ditulis tanpa cash movement/settlement/allocation, piutang tetap terbuka.
- `livePembelianBuat` mendukung `metode: "hutang"` (pembelian 100% hutang) sejak engine commit
  `c6160ce`: dokumen ditulis tanpa cash account, hutang tetap terbuka. Pembelian DP sebagian juga didukung.
  Faktur **tunai/bank** boleh tanpa pemasok (`supplierId` null) untuk pembelian pasar; faktur **hutang**
  wajib menunjuk master pemasok supaya hutang tertelusur per pemasok di laporan AP ageing
  (`counterpartyId`). Form pembelian bisa membuat pemasok baru langsung dari nama (kode dibuat otomatis).
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
- `liveTransaksiRiwayat` kehilangan `diskon` (0), `kembalian` (0), dan status
  pembayaran digital (dipetakan dari status penjualan). `kasir` dibaca dari `requestedByName` yang
  sudah di-resolve engine (nama, bukan GUID), `shiftId` dari deskripsi batch yang ditulis POS.
  `piutang` diambil dari
  `GET /api/reports/ar-ap/aging?side=RECEIVABLE` (`outstandingAmount` per `invoiceNumber`), karena
  dokumen penjualan tidak menyimpannya.
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
- Diskon POS + diskon per baris dilebur ke `unitPrice` (sisa pembulatan ke baris terakhir), karena
  dokumen penjualan engine tidak punya field diskon.
- `liveBiayaCatat` membebankan akun `NEXT_PUBLIC_ENGINE_BIAYA` (default `6900`); tunai memakai akun kas
  default, transfer memakai akun kas ber-kode `1111`. Akun non-EXPENSE/non-postable ditolak engine (400).
- Shift menyimpan **user pembuka** (`cashierUserId`) selain namanya. POS memakai `shift.cashierUserId`
  untuk menandai "shift dibuka oleh X" saat kasir yang login berbeda; operator yang melayani tetap
  user yang sedang login (nama itu masuk ke `requestedBy` batch → `requestedByName` di engine).
- Profil toko disinkronkan ke `GET/PUT /api/settings/company-profile` (`api.pengaturan`); store
  `useToko` hanya cache untuk struk. Di mode mock, `api.pengaturan` membaca/tulis store lokal.
- Logo toko diunggah ke engine (`POST /api/settings/company-profile/logo`, multipart) — berkasnya
  disimpan server yang mencetak faktur PDF, bukan di browser POS. URL logo dari engine relatif
  (`/uploads/logos/...`) → `urlLogoAbsolut()` di `live.ts` yang menempelkan host engine. Mode mock
  menolak unggah logo dengan pesan jelas (tidak ada penyimpanan berkas di browser).
- Dashboard menampilkan "Kesehatan usaha" dari `GET /api/analytics/health-summary?date=`
  (`api.analitik.ringkasanKesehatan`, query key `["kesehatan-usaha"]`). Angka Rasio Lancar, Rasio
  Kas, dan Modal Kerja di live datang dari engine (jurnal yang sama dengan neraca saldo); mode mock
  menghitungnya sendiri dari akun mock (hanya 3 indikator yang bisa dihitung jujur).
- Neraca saldo memakai `GET /api/reports/trial-balance?fromDate=&toDate=` dan membaca
  `openingBalance`/`closingBalance`: kolom **Saldo awal | Debit | Kredit | Saldo berjalan**.
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
- Konfirmasi QRIS dipicu dari Riwayat (tombol **Konfirmasi**, owner) saat transaksi berstatus
  `menunggu_pembayaran` dan punya pembayaran `qris`. Di mock Confirmation memindahkan dana dari
  `Penampung gateway` ke `Bank` dan menutup status jadi `lunas`. Di live rute engine
  `POST /api/sales/{id}/confirm-payment` mencari kaki `CustomerPayment` lewat **BatchId transaksi
  dokumen** — bukan `sale.BusinessTransactionId`, yang menunjuk baris dokumen itu sendiri.

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
  via `partialize`; `toko` = `pos-sinaptex-toko`; `cart` tidak pernah dipersist).
  Total keranjang memakai helper di `src/lib/store/cart.ts` (`subtotalLines`, `pajakNominal`,
  `totalTransaksi`); `api/client.ts` menghitung ulang total di sisi "server" (`hitungTotal`).
- React Query: query key berupa array string pendek (`["products"]`, `["pelanggan"]`, `["shift"]`,
  `["shift-riwayat"]`, `["transaksi"]`, `["retur"]`, `["pembelian"]`, `["biaya"]`, `["jurnal"]`,
  `["akun"]`, `["laba-rugi"]`, `["kesehatan-usaha"]`, `["users"]`, `["audit"]`). Default provider:
  `staleTime: 30_000`, `retry: 1`.
  Mutation dikelompokkan dalam hook yang mengembalikan objek mutation, contoh:
  `useTransaksiMutations() → { batal, retur, konfirmasiDigital }`, `useShiftMutations()`,
  `useProductMutations()`, `useUserMutations()`, `useImporMutations()`, `usePembayaranMutations()`,
  `useBiayaMutations()`; checkout punya hook sendiri `useCheckout(onSuccess)`.
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
  transaksi). QRIS membuat status `menunggu_pembayaran` sampai owner mengonfirmasi (mock); di live
  konfirmasi memanggil `POST /api/sales/{id}/confirm-payment`.
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
- Mock adalah in-memory: data (produk, transaksi, jurnal, shift) reset saat reload halaman; hanya
  `auth` + `toko` yang persist di localStorage.

## Caveat yang diketahui

Sudah diperbaiki (2026-10-28) dan tidak boleh dianggap bug lagi — detail di
`docs/rencana-desain-ui-ux.md` ("Yang sudah diperbaiki pada mock"): idempotensi mock, jurnal overpay tidak seimbang, akumulasi
`penjualanTunai`, role check pemilik di mock, reversal void (pajak + QRIS + piutang + snapshot HPP),
retur proporsional, dan penghapusan `src/lib/api/calc.ts`.

Batasan yang masih ada:

- Live: pembayaran campuran + overpayment (kembalian) ditolak engine; QRIS belum jadi konsep engine.
- Live: diskon dilebur ke `unitPrice`, jadi riwayat/struk live tidak menampilkan diskon.
- Live: master pemasok bisa dibuat & dinonaktifkan, tapi kode/nama tidak bisa diubah (engine sengaja
  `init`-only). Faktur lama tanpa `supplierId` (sebelum master dipakai) dikelompokkan lewat namanya.
- Live: satu shift aktif per tenant (bukan per kasir) — POS menandai "shift dibuka oleh X" kalau
  kasir yang login berbeda dengan pembuka shift.
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
src/app/           layout, login, kasir (full-screen), (app)/ grup → dashboard, produk, riwayat, shift, pembelian, supplier, keuangan, akuntansi, laporan, approval-rules, pengaturan
src/components/    shared UI + kasir/ + produk/
src/hooks/queries.ts   SEMUA TanStack Query hooks
src/lib/api/       types.ts (kontrak), client.ts (facade + switch), live.ts (HTTP engine), mock/db.ts (engine mock)
src/lib/store/     auth.ts, toko.ts (persist), cart.ts (no persist)
src/lib/           csv, format, nav, struk, utils (cn)
src-tauri/         Rust shell minimal
backend/           nested git repo (Accounting Engine .NET 10)
tools/             bootstrap-backend.py
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
- Zustand: 1 store/concern, persist `auth` & `toko` saja

### Domain Rules Ringkas
- Kasir **tidak transaksi sebelum shift buka** (panel pemblokir)
- Shift **tidak auto-open** login; nama kasir = user login; shift catat `cashierUserId`
- Checkout bawa `idempotensiKunci` → `Idempotency-Key`
- Alokasi: tunai > sisa = kembalian; transfer/QRIS ≤ sisa; kekurangan → piutang hanya bila `izinkanKredit`
- Status bayar ≠ status transaksi: `lunas | menunggu_pembayaran | dibayar_sebagian | dibatalkan`
- Void/retur/penyesuaian/konfirmasi/impor = owner only; jurnal pembalik
- Saldo dari jurnal; tidak input manual (kecuali impor saldo awal)
- Retur proporsional (neto + pajak + diskon), refund = yang dibayar pelanggan

### Gotcha Mode Live
- Engine pakai **id** dokumen; POS simpan nomor → terjemahkan dulu (`cariPenjualanByNomor`)
- Engine tolak campuran & overpayment; `kembalian`=0; bayar 0 (kredit penuh) **diizinkan**
- Diskon dilebur ke `unitPrice` → riwayat/struk live tanpa diskon
- `piutang` dari aging `side=RECEIVABLE`; `terbayar` pembelian dari `side=PAYABLE` (bukan `payableAmount`)
- Void 409 (POSTED) → fallback retur penuh
- Master pemasok: list/create/nonaktifkan saja; list pakai `?includeInactive=true`
- Satu shift aktif per tenant (bukan per kasir)
- Impor produk live all-or-nothing, `satuan` harus ada master unit, no stok awal
- Profil toko sync `/api/settings/company-profile`; field POS di localStorage
- Logo upload ke engine (mock tolak)
- QRIS bukan konsep engine; konfirmasi hanya untuk batch tertahan approval
- Batch tertahan approval: `/persetujuan` → `GET /api/transactions?status=SUBMITTED` → approve → `POST /api/cash-batches/{batchId}/post`

### Verifikasi
- Frontend: `npx tsc --noEmit` bersih + `npm run build` sukses (15 halaman statis)
- Backend: `dotnet build` 0 warning + `dotnet test` 485 unit + 714 integration lulus
- Mock: alur manual `/kasir` (buka shift → checkout → riwayat → tutup shift)

## Docs

- `README.md` — setup, fitur, arsitektur singkat, konvensi, domain rules, gotcha live, verifikasi
- `DESIGN.md` — token design system (`@theme` 42 baris) + tabel "Utility yang TIDAK ada"
- `docs/rencana-desain-ui-ux.md` — arsip historis: blueprint desain, kontrak endpoint usulan vs aktual, log perbaikan
- `backend/README.md`, `backend/AGENTS.md`, `backend/knowledge.md` — spesifikasi & aturan engine (repo terpisah)
