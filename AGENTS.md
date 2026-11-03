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
dotnet run --project src/AccountingEngine.Api/AccountingEngine.Api   # http://localhost:5121
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
                           pembelian, keuangan, akuntansi, laporan, pengaturan
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
daftar jurnal (`GET /api/journal`), biaya (`GET/POST /api/expenses`), pelunasan piutang
(`POST /api/sales/{id}/payments`), pelunasan hutang (`POST /api/purchases/{id}/payments`),
penyesuaian stok (`POST /api/inventory/adjustments`), konfirmasi QRIS
(`POST /api/sales/{id}/confirm-payment`), buat user kasir (`POST /api/users/direct`),
daftar/ubah/hapus user (`GET/PUT/DELETE /api/users`), jejak audit (`GET /api/audit-log`).

Tidak ada lagi jalur 501: `engineBelumAda` sudah dihapus. Bila akun kas untuk kode akun yang dipakai
checkout/pelunasan/biaya belum ada, POS membuatnya lewat `POST /api/cash-accounts`.

Perilaku live yang menyimpang dari mock:

- `liveCheckout` menolak pembayaran campuran (tunai + non-tunai), overpayment, dan **pembayaran 0**
  (penjualan kredit tanpa uang muka) — batch penjualan engine menolak `paymentAmount: 0` dengan 409.
  `kembalian` selalu 0.
- `livePembelianBuat` menolak `metode: "hutang"` (pembelian 100% hutang) dengan alasan yang sama;
  pembelian DP sebagian didukung dan sisanya jadi hutang.
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

Sudah diperbaiki (2026-10-28) dan tidak boleh dianggap bug lagi — detail di `knowledge.md`
("Yang sudah diperbaiki pada mock"): idempotensi mock, jurnal overpay tidak seimbang, akumulasi
`penjualanTunai`, role check pemilik di mock, reversal void (pajak + QRIS + piutang + snapshot HPP),
retur proporsional, dan penghapusan `src/lib/api/calc.ts`.

Batasan yang masih ada:

- Live: pembayaran campuran + overpayment (kembalian) ditolak engine; QRIS belum jadi konsep engine.
- Live: diskon dilebur ke `unitPrice`, jadi riwayat/struk live tidak menampilkan diskon.
- Live: pembelian belum memakai master supplier (`supplierId` dikirim `null`), jadi hutang belum
  tertelusur per pemasok.
- Live: satu shift aktif per tenant (bukan per kasir) — POS menandai "shift dibuka oleh X" kalau
  kasir yang login berbeda dengan pembuka shift.
- Mock: uang memakai `number` JS, bukan decimal — pembulatan bisa berbeda dari engine.

## Docs

- `knowledge.md` — blueprint penuh, kontrak endpoint C#, catatan status implementasi + log perbaikan
  (referensi terbaik).
- `DESIGN.md` — token design system (utility yang disebut di sana sebagian belum ada di `globals.css`).
- `INIT_STATUS.md` — snapshot status inisialisasi dan cara menjalankan (sebagian usang).
- `README.md` — setup, fitur, caveat mode mock.
- `backend/README.md`, `backend/AGENTS.md`, `backend/knowledge.md` — spesifikasi & aturan engine (repo terpisah).
