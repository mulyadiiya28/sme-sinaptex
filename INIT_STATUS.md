# POS-Sinaptex — Status Awal (Setelah Init)

> **Tanggal inisialisasi:** Mon Oct 26 2026 (diuji Tue Oct 27 2026)
> **Desktops-first, tablet fallback.** Brand: navy `#0B2F6E`, orange `#F97316`.
> **Backend:** Mock data siap pakai (`API_MODE=mock`), push ke `sme-sinaptex`.

---

## 1. Design System & Token Brand

### `src/app/globals.css` — `@theme` vars:
| Variabel | Nilai | Pakai |
|---|---|---|
| `--color-brand` | `#0B2F6E` | Tombol primer, heading, nav aktif, fokus input |
| `--color-brand-hover` | `#082657` | Hover/pressed primer |
| `--color-accent` | `#F97316` | CTA bayar/aksi utama |
| `--color-accent-hover` | `#EA580C` | Hover CTA |
| `--color-stat-violet` | `#7C3AED` | Aksen kategori statistik |
| `--color-stat-emerald` | `#059669` | Aksen kategori statistik |
| `--color-stat-rose` | `#E11D48` | Aksen kategori statistik |
| `--color-canvas` | `#F8FAFC` | Latar belakang halaman |
| `--color-line` | `#E2E8F0` | Border tipis |
| `--color-ink` | `#0F172A` | Teks utama |
| `--color-muted` | `#64748B` | Teks sekunder |

### Komponen visual (sudah konsisten):
- `.panel` → `rounded-3xl border-line/80 bg-white/90 backdrop-blur-xl` (panel utama)
- `.btn-primary` → navy fill, hover ke `#082657`
- `.btn-secondary` → putih border `slate-200`, teks `slate-700`
- `.btn-accent` → orange fill (`color-accent`), hover opacity 90%
- `.input` → rounded-xl, border `color-line`, focus ring `color-brand/20`
- `.label` → label form (`mb-1.5 block text-sm font-medium text-muted`)
- **Tidak ada** kelas `.chip`, `.money`, `.table`, `.badge-*` di `globals.css` — chip & tabel memakai
  Tailwind inline, uang memakai utilitas `tabular-nums` lewat `<MoneyDisplay>` (lihat `DESIGN.md` §2)
- H1 → `font-black text-brand` (navy)

---

## 2. Layout Desktop-First

### `src/components/app-shell.tsx`
- **Sidebar** 240px → collapse ke 72px icon rail (state localStorage)
- **Topbar** 64px: nama toko, search input (`input`), user avatar + role, notifikasi, logout
- **Content** full-width, padding 24-32px, transition `margin-left` 200ms

### `src/components/app-topbar.tsx`
- Search `Ctrl+F2`-style, placeholder "Cari..."
- User dropdown dengan role & nama toko
- Logout ke `/login`

### `src/components/sidebar.tsx`
- Nav grup (Dasbor, Kasir, Produk, Transaksi, Laporan, Setelan)
- Item aktif: `bg-white text-brand shadow-sm` (kaval saat collapsed)
- Chevron toggle untuk expand/collapse

---

## 3. Kasir Page (`/kasir`) — Alur Lengkap

### Header (per-spec):
- `h1.font-black.text-brand` → "Kasir — Transaksi Baru"
- Info shift: kasir + ID shift
- Chip "Shift aktif" warna emerald

### Kiri: Product Catalog (ditenhance fitur keyboard)
- Tabel produk (Produk/Kategori/Harga Jual/Stok/Aksi) dengan scroll vertikal, tanpa grid kartu
- Filter kategori via tombol pill Tailwind inline (bukan kelas CSS `.chip`)
- **Fitur keyboard**:
  - `ArrowUp/ArrowDown` navigasi antar produk tersedia (baris habis dilewati)
  - `Home/End` ke produk tersedia pertama/terakhir
  - `ArrowDown` dari kolom pencarian masuk ke daftar
  - `Enter` menambah produk yang difokuskan (atau hasil pertama dari pencarian)
  - `Esc` kembali ke kolom pencarian
  - Fokus pencarian dipertahankan saat katalog tampil; `F2` memfokuskannya lagi
- Stok warning: `amber-600` menipis, `rose-600` habis

### Kanan: Cart Panel
- Daftar item per baris panel `rounded-2xl padding-3.5`
- Qty input `tabular-nums font-bold` lebar `w-12`
- Tombol `+`/`-`Minus/Plus ukuran `size-3.5`
- Input diskon `tabular-nums text-right text-sm`
- Total akhir `font-black text-brand text-2xl`
- Tombol "`Pembayaran → (F4)`" warna brand-primary

### Keyboard shortcuts (sudah diwire di `KasirScreen`):
- `F2` → Fokus ke search produk
- `F4` → Buka modal pembayaran
- `Escape` → Tutup modal

---

## 4. Modal Pembayaran (`PaymentDialog`)
- Metode: `Tunai`, `Transfer bank`, `QRIS`
- Alokasi uang per metode, total vs bayar vs kembalian
- **Kembalian** tampil warna `emerald-700 font-black`
- **Sisa pembayaran** tampil warna `rose-700 font-black`
- Tombol `Konfirmasi Pembayaran` warna brand-primary
- Tombol `Batal` warna secondary
- Setelah sukses: cetak struk, atau transaksi baru

---

## 5. Dashboard/Pemilik (`/`)

### KPI Cards (4 kolom xl):
1. **Penjualan hari ini** — `MoneyDisplay` + jumlah transaksi
2. **Kas tunai sistem** — saldo shift (`shiftAktif.kasTunaiSistem`)
3. **Stok menipis** — count + nama produk pertama dua
4. **Piutang hari ini** — total piutang transaksi belum lunas

### Laporan terbaru — daftar 6 transaksi terakhir dengan badge status
### Peringatan:
- Stok menipis → warning badge
- Pembayaran menunggu konfirmasi QRIS → warning badge
- Piutang ada → danger badge
- Engine akuntansi aktif → success badge

### Aksi: "Buka Kasir" → link ke `/kasir` dengan tombol accent orange

---

## 6. Auth & Shift Auto-Open

### Login:
- `pemilik / pemilik123` → role pemilik → dialihkan ke `/` (dashboard)
- `kasir / kasir123` → role kasir → `api.shift.buka({kasir, saldoAwal: 1_500_000})` → dialihkan ke `/kasir` (shift langsung terbuka)

### Shift management:
- `bukaShift` — cek "masih ada shift aktif", buat shift baru
- `mutasiKas` — masuk/keluar kas (validasi saldo cukup)
- `tutupShift` — hitung sistem vs uang fisik, selisih, simpan ke riwayat
- Otomatis: `kasTunaiSistem` & `kas.bank` ter-update setiap transaksi. Mock kini mengakumulasi
  `penjualanTunai` dari checkout tunai, refund retur tunai, dan pelunasan piutang tunai (lihat caveat);
  live memakai saldo akun kas dari engine.

---

## 7. Mock Data & API

### `src/lib/api/mock/db.ts` — Seed 10 produk:
| ID | Nama | Kategori | HJual | Stok | Min |
|---|---|---|---|---|---|
| p1 | Beras 5 kg | Sembako | 75.000 | 12 | 5 |
| p2 | Minyak 1 L | Sembako | 18.000 | 40 | 10 |
| p3 | Gula 1 kg | Sembako | 17.000 | 25 | 8 |
| p4 | Telur 1 kg | Sembako | 28.000 | 18 | 6 |
| p5 | Kecap 600 ml | Bumbu | 15.000 | 30 | 10 |
| p6 | Paket A | Paket | 150.000 | 6 | 3 |
| p7 | Tepung 200 g | Sembako | 7.000 | 50 | 12 |
| p8 | Kopi Bubuk 1 kg | Minuman | 42.000 | 4 | 6 |
| p9 | Sabun Batiul | Kebersihan | 5.500 | 60 | 20 |
| p10 | Deterjen 800 g | Kebersihan | 12.500 | 22 | 10 |

### User: `pemilik / pemilik123` (role pemilik) & `kasir / kasir123` (role kasir)
Semua API pakai `API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? "mock"`.

---

## 8. Policy Push
- **Semua perubahan push ke `sme-sinaptex`** — terpisah dari repo backend, sebagaimana yang telah direncana pengguna.
- Backend C# sudah terpasang di `backend/` (repo nested .NET 10, diabaikan repo POS lewat `/backend/`). Mode live (`NEXT_PUBLIC_API_MODE=live`) menyambung lewat `src/lib/api/live.ts`: login/JWT + refresh, produk, satuan, pelanggan, shift, kasir (batch penjualan), pembelian (batch pembelian), void/retur + riwayat retur, neraca saldo, laba-rugi, daftar jurnal, biaya.
- Alur yang engine-nya belum punya endpoint (impor pelanggan/saldo awal, penyesuaian stok, pelunasan piutang/hutang, audit log, daftar pengguna) **menampilkan pesan eksplisit**, bukan data palsu. Rincian endpoint & batasnya ada di `knowledge.md` § Kontrak engine AKTUAL.
- `tools/bootstrap-backend.py` menyiapkan tenant + pemilik (level 99) + RBAC + akun kas + periode fiskal; idempoten, aman diulang.

---

## 8b. Menjalankan Backend (engine Accounting Engine)

```bash
cd backend
dotnet build AccountingEngine.slnx
dotnet ef database update -p src/AccountingEngine.Infrastructure -s src/AccountingEngine.Api
dotnet run --project src/AccountingEngine.Api/AccountingEngine.Api   # http://localhost:5121
```

```bash
# dari root repo POS
pip install bcrypt
python tools/bootstrap-backend.py
curl -X POST http://localhost:5121/api/accounts/seed -H "X-Business-Id: toko-utama"
```

- Tenant default `toko-utama`, akun `pemilik` / `pemilik123` (level 99 = owner), kas `1121` (default) + `1111`.
- Chart of accounts: 37 akun SAK EMKM (`POST /api/accounts/seed`); jurnal hanya boleh menyebut akun level 3.
- `.env.example` → `.env.local` untuk `NEXT_PUBLIC_API_MODE=live`, base URL engine, id tenant, dan kode akun.
- Diperlukan satu **periode fiskal OPEN** yang menutup tanggal transaksi; `tools/bootstrap-backend.py` membuat periode bulan berjalan.

---

## 9. Jalankan Uji Coba

```bash
cd sme-sinaptex
npm install
npm run dev  # http://localhost:3000
```

**Test alur:**
1. Buka http://localhost:3000
2. Login: `kasir` / `kasir123` → langsung ke `/kasir` dengan shift sudah buka
3. Atau: `pemilik` / `pemilik123` → dashboard utama `/`
4. Coba navigasi sidebar, filter kategori, tambah produk ke keranjang, bayar (F4)
5. Coba logout, login sebagai pemilik, lihat dashboard KPI

---

## 10. Selanjutnya (Saran)

Fitur yang sudah selesai (tidak lagi masuk daftar ini): CRUD produk, tutup shift + selisih UX,
PWA/Serwist + manifest + ikon, riwayat transaksi dengan filter tanggal & ekspor CSV, void/retur,
penyesuaian stok, pajak, struk thermal, impor CSV, kelola pengguna, buku besar, mode live (sebagian).

Yang masih terbuka:

**Perbaikan mock (sudah dikerjakan 2026-10-28)**
- Idempotensi ditegakkan (`mockDb.kunciCheckout`), alokasi pembayaran + kembalian dihitung benar,
  `penjualanTunai` terakumulasi (checkout/refund retur/pelunasan piutang), role pemilik ditegakkan
  di mock db, reversal void diperbaiki (pajak + QRIS gateway + piutang terlayar, HPP pakai snapshot
  harga beli waktu transaksi), retur membalik pajak dan diskon proporsional, `api/calc.ts` dihapus.

**Endpoint engine yang belum ada (menghambat live mode)**
- `GET/PUT/DELETE /api/users`, `GET /api/audit-log`
- `POST /api/transactions/{id}/confirm-payment` (QRIS), `POST /api/inventory/adjustments`
- Impor CSV pelanggan/saldo awal (`/api/customers/import`, `/api/accounts/opening-balances`)
- Pelunasan hutang/piutang

**Fitur produk**
- Scan barcode dari keyboard wedge (F2 fokus + Enter sudah ada, bisa tambah scanning manual)
- Integrasi printer thermal native (ESC/POS) — Phase 1 saat ini dialog cetak browser
- Transfer kas↔bank, pajak & fee configurable per toko, retention arsip
- Multi-outlet / multi-gudang (P2)

---