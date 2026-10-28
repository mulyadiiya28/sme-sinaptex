# POS-Sinaptex — Frontend

Smart Retail Operations & Accounting untuk toko UMKM: kasir, persediaan, keuangan, dan akuntansi otomatis. Dokumen rencana desain/knowledge utama ada di [`knowledge.md`](./knowledge.md).

- **Stack**: Next.js (App Router) · TypeScript · Tailwind CSS 4 · TanStack Query · Zustand · Zod · Serwist (PWA)
- **Mode produksi**: build statis (`next build` → `out/`) yang dibungkus Tauri menjadi `POS-Sinaptex.exe` — komputer toko tanpa Node.js/terminal; engine backend C# (ASP.NET Core, .NET 10) berjalan sebagai aplikasi terpisah dan menyediakan REST API + JWT.
- **Saat ini**: data default memakai **mock** (`src/lib/api/mock/`); engine C# sudah terpasang di `backend/` dan mode `live` (`NEXT_PUBLIC_API_MODE=live`) menyambung sebagian besar alur kasir ke engine sungguhan.

## Menjalankan

```bash
npm install
npm run dev     # http://localhost:3000 — layar kasir di /kasir
npm run build   # verifikasi build statis → out/
npx tauri dev   # aplikasi desktop (menjalankan npm run dev otomatis)
npx tauri build # installer Windows (nsis + msi)
npx tsc --noEmit # typecheck — repo ini tanpa lint/test tooling
```

## Backend — engine Accounting Engine (C# / .NET 10)

Engine berada di repo nested `backend/` (repo git terpisah, diabaikan repo POS lewat `/backend/`).

```bash
cd backend
dotnet build AccountingEngine.slnx
dotnet ef database update -p src/AccountingEngine.Infrastructure -s src/AccountingEngine.Api
dotnet run --project src/AccountingEngine.Api/AccountingEngine.Api   # http://localhost:5121
```

Langkah pertama setelah migrate: buat tenant, pengguna pemilik, RBAC, akun kas, dan periode fiskal berjalan.

```bash
pip install bcrypt
python tools/bootstrap-backend.py        # dari root repo POS
```

Script bersifat idempoten — baris yang sudah ada dilewati. Default: tenant `toko-utama`, akun `pemilik` / `pemilik123` (level 99 = owner di engine), akun kas `1121` (tunai, default) + `1111` (bank).

Seed chart of accounts (37 akun SAK EMKM, level 3 = postable) lewat API:

```bash
curl -X POST http://localhost:5121/api/accounts/seed -H "X-Business-Id: toko-utama"
```

Mode POS memakai engine:

```bash
cp .env.example .env.local      # set NEXT_PUBLIC_API_MODE=live
npm run dev
```

Lihat `.env.example` untuk base URL engine, id tenant, dan kode akun. Kode akun wajib level 3 — jurnal hanya boleh menyebut akun postable (`1121`, `1111`, `1200`, `1300`, `2101`, `4000`, `5000`, `2402`, `6900`).

> Mode live sudah menyambung: login/JWT, produk, satuan, pelanggan, shift, kasir (batch penjualan), pembelian (batch pembelian), void/retur + riwayat retur, impor produk (CSV/XLSX), neraca saldo, laba-rugi, daftar jurnal, biaya operasional. Alur yang engine-nya belum punya endpoint (impor pelanggan, penyesuaian stok, pelunasan piutang/hutang, audit log, daftar pengguna) menampilkan pesan eksplisit — bukan data palsu. Rinciannya di `knowledge.md` § Kontrak API.

## Fokus MVP (Tahap 2)

- **Kasir** interaktif: pencarian/barcode, keranjang, diskon, pelanggan — butuh **shift aktif** (ditolak bila belum dibuka).
- **Pembayaran** tunggal/campuran: tunai/transfer/QRIS, kembalian, sisa→piutang, status hasil (lunas/menunggu/dibayar sebagian).
- **Produk & Stok** CRUD dengan validasi Zod.
- **Shift kasir**: buka shift (saldo awal), kas masuk/keluar, tutup shift (uang fisik vs sistem → selisih), riwayat shift.
- **Riwayat transaksi**: tabel + pencarian + dialog detail rinci (item, diskon, kembalian, piutang, status).
- **Dashboard**: KPI & daftar transaksi terhitung dari data mock nyata (omzet hari ini, kas tunai shift, stok menipis, piutang).

## Tahap 3 (P1)

- **Pembelian**: faktur pembelian (pemasok, item, metode tunai/bank/hutang) — stok bertambah, `hargaBeli` produk ter-update, jurnal otomatis, kas/bank berkurang atau hutang bertambah.
- **Keuangan**: 4 tab — Kas & Bank (rekonsiliasi), Biaya (catat + tabel), Piutang (pelunasan), Hutang (pelunasan ke pemasok).
- **Akuntansi**: neraca saldo dengan indikator keseimbangan debit=kredit, jurnal otomatis expandable, laba-rugi (pendapatan − HPP − biaya).
- **Laporan**: omzet & rata-rata per transaksi, penjualan per hari, nilai persediaan (stok × harga beli).
- **Login & hak akses**: halaman login (demo: `pemilik/pemilik123`, `kasir/kasir123`); role `pemilik` = akses penuh, `kasir` = Kasir/Riwayat/Shift; menu sidebar & akses halaman difilter per role; logout di topbar; audit log sesi di Pengaturan > Keamanan.
- **Pengaturan**: profil toko (nama, alamat, telepon, mata uang, zona waktu, footer struk) — dipakai topbar.
- **Void transaksi**: pemilik dapat membatalkan transaksi dari Riwayat — stok kembali, jurnal reversal, status `dibatalkan`, tercatat di audit log.
- **Penyesuaian stok**: pemilik dapat mengganti stok sistem dengan stok fisik (opname/rusak/hilang) — jurnal akun "Selisih stok" otomatis.
- **Idempotensi**: setiap sesi dialog pembayaran membawa kunci unik (`Idempotency-Key`); engine live dan mock sama-sama menolak pengiriman ulang dengan kunci yang sama.

## PWA (Serwist)

Build statis juga bisa dipakai sebagai **PWA installable** (jalur kedua selain Tauri):

- Service worker (`public/sw.js`, hasil bundel `src/sw.ts`): precache semua aset + fallback navigasi ke `index.html` — aplikasi tetap terbuka walau jaringan/LAN ke engine terputus.
- GET ke `**/api/**` memakai strategi NetworkFirst (fallback cache maksimal 24 jam). POST (checkout, bayar, dsb.) **tidak** di-cache — tetap butuh engine hidup.
- Installable: manifest (`src/app/manifest.ts`) + ikon placeholder di `public/`. Serve `out/` via HTTPS/localhost lalu "Install app" dari browser.
- SW dinonaktifkan saat `next dev`; aktif hanya di build produksi.
- Catatan: dalam Tauri, registrasi SW bisa ditolak WebView — tidak fatal, Tauri tetap jalur utama produksi.

Data mock tersimpan in-memory (`src/lib/api/mock/db.ts`) dan reset saat refresh — disengaja.

### Caveat mock yang diketahui (bukan fitur)

- Di mode live, engine menolak pembayaran campuran (tunai + non-tunai) dan overpayment; QRIS belum jadi konsep engine.
