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
- `.chip` → active = `border-brand bg-brand text-white`, inactive = `border-line bg-white text-muted`
- `.money` → `font-tabular-nums font-bold` untuk uang rapi
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
- Grid 4 kolom xl, gap-3, overflow-y-auto
- Filter kategori via Chip (active/inactive styling)
- Setiap produk panel `rounded-2xl`, hover border navy/40
- **Fitur keyboard baru** (ditambahkan saat init):
  - `ArrowUp/ArrowDown` navigasi antar produk
  - `Home/End` ke pertama/terakhir
  - `Enter` memilih produk yang difokuskan
  - `Esc` batal & fokus kembali ke input
  - Auto-focus ke item pertama saat daftar tampil
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
- Otomatis: setoran kas `kasTunaiSistem` & `kas.bank` ter-update setiap transaksi

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
- Backend C# belum disambung (ada `throw new Error("API C# belum disambung.")` jika `API_MODE="live"`).

---

## 9. Jalankan Uji Coba

```bash
cd abc-sinaptex
npm run dev  # http://localhost:3001 (atau 3000 jika free)
```

**Test alur:**
1. Buka http://localhost:3001
2. Login: `kasir` / `kasir123` → langsung ke `/kasir` dengan shift sudah buka
3. Atau: `pemilik` / `pemilik123` → dashboard utama `/`
4. Coba navigasi sidebar, filter kategori, tambah produk ke keranjang, bayar (F4)
5. Coba logout, login sebagai pemilik, lihat dashboard KPI

---

## 10. Selanjutnya (Saran)

Fitur yang masih bisa ditambahkan di iterasi berikutnya:
- **Scan barcode** dari keyboard wedge (F2 fokus + Enter sudah ada, bisa tambah scanning manual)
- **Riwayat transaksi lengkap** dengan filter tanggal & ekspor
- **Shift tutup & pelaporan uang hari** (sudah ada API, perlu UX)
- **CRUD Produk** dari halaman Produk (sudah ada mock create/update/delete)
- **Integrasi printer thermal** untuk struk (Phase 1: dialog cetak, Phase 2: ESC/POS native)
- **PWA offline** — agar kasir tetap jalan tanpa internet (serwist sudah ada tapi disabled di dev)

---