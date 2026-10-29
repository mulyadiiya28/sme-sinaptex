# Audit Sinkronisasi Frontend ↔ Backend (POS-Sinaptex ↔ Accounting Engine)

Tanggal: 29 Oktober 2026
Cakupan: `src/lib/api/*`, seluruh halaman `src/app/**`, kontrak controller di `backend/src/AccountingEngine.Api/Controllers`.

---

## 1. Kesimpulan singkat

- **Layer data sudah bersih.** Semua akses data lewat `api.*` (`src/lib/api/client.ts`); setiap method punya
  cabang `API_MODE === "live"`. Tidak ada komponen yang memanggil `mockDb` langsung.
- **Tidak ada lagi jalur 501.** `engineBelumAda()` sudah dihapus; satu-satunya pemakaian tersisa
  (`akunKasDefault` → `POST /api/cash-accounts`) ternyata endpoint-nya **sudah ada** dan kini dipakai.
- **Masalah utama bukan "masih mock", tetapi (a) environment live tidak pernah aktif dan (b) beberapa
  fungsi live yang salah kontrak** — sudah diperbaiki di sesi ini (lihat §3).
- **Uji E2E live sudah dijalankan ke engine sungguhan: 23/23 cek lulus** (lihat §3a). Tiga bug kontrak
  tambahan ditemukan lewat uji itu dan langsung diperbaiki.
- **Satu batasan produk masih terbuka:** penjualan/pembelian kredit **tanpa uang muka** belum bisa
  (engine menolak pembayaran 0, dan alur dokumen kredit butuh maker-checker). Butuh keputusan Anda.

---

## 2. Temuan kritis

| # | Temuan | Dampak | Status |
|---|--------|--------|--------|
| 1 | `.env.local` **tidak ada** di repo, sehingga `NEXT_PUBLIC_API_MODE` jatuh ke default `mock`. Uji "E2E live" sebelumnya sebenarnya berjalan di mock. | Semua uji ke backend tidak menyentuh backend. | **Diperbaiki** — `.env.local` dibuat (`live`, base URL `localhost:5121`). File ini gitignored. |
| 2 | `livePenyesuaianStok` membaca `/api/inventory/stock` sebagai `{ quantities: Record<string, number> }`, padahal respons engine `{ warehouseId, items: [{ productId, quantity }] }`; lalu mengirim `FormData` ke endpoint yang menerima JSON `[FromBody]`. | Penyesuaian stok live selalu gagal (TypeError lalu 400/415). | **Diperbaiki** — baca `items`, hitung delta, kirim JSON + `Idempotency-Key`, `unitCost` = harga beli, `costingMethod: AVERAGE`. |
| 3 | `liveBayarPiutang` / `liveBayarHutang` mengirim `cashAccountId` berisi **kode akun** (`1121`/`1111`), bukan id `CashAccount`. | Pelunasan piutang/hutang live selalu 404/400. | **Diperbaiki** — memakai `akunKasDefault(kode)` yang mengembalikan id. |
| 4 | `akunKasDefault` melempar 501 "belum ada `POST /api/cash-accounts`" padahal endpoint itu ada. | Checkout live gagal pada tenant yang belum punya akun kas default. | **Diperbaiki** — akun kas dibuat otomatis (`isDefault` bila belum ada). |

---

## 3. Yang sudah dikerjakan di sesi ini

**Layer API**
- `livePenyesuaianStok`, `liveBayarPiutang`, `liveBayarHutang`, `akunKasDefault` diperbaiki (lihat §2).
- `liveBayarPiutang` nomor→id (`cariPenjualanByNomor`); `liveTransaksiRiwayat` & `livePembelianList`
  membaca sisa piutang/hutang dari laporan AR/AP ageing (lihat §3a bug #5–#7).
- `liveCheckout` & `livePembelianBuat` menolak transaksi kredit tanpa uang muka dengan pesan Indonesia
  (bukan 409 berbahasa Inggris).
- `engineBelumAda()` + import mati di `client.ts` dihapus.

**UI/UX — loading skeleton**
- Komponen baru `src/components/skeleton.tsx` (`Skeleton`, `KpiSkeleton`, `TableSkeleton`, `ListSkeleton`).
- `DataTable` dapat prop `loading` + `skeletonRows` (header tetap tampil, baris jadi skeleton).
- Dipakai di: dashboard, produk, riwayat (+retur), pembelian, laporan, akuntansi (neraca/jurnal/buku besar/laba-rugi),
  keuangan (KPI + tabel), shift (+riwayat), kasir (layar penuh), pengaturan (pengguna & audit), auth-guard.

**UI/UX — buka shift**
- Nama kasir **tidak lagi input bebas**: mengikuti akun yang sedang masuk (read-only, `@username · peran`).
- Kas awal laci: nilai awal dari **Pengaturan → Operasional → "Kas awal laci saat buka shift"**, dengan hint
  bahwa kasir menyesuaikan dengan uang fisik. Sebelumnya hardcoded 200.000 di form dan 1.500.000 di auto-open login.
- Auto-buka shift saat login dihapus (shift tanpa hitung laci membuat selisih tutup shift tidak bermakna).
  Kasir diarahkan ke `/kasir`; panel pemblokir menyebut nama kasir + link Buka Shift.
- Label "Akun demo (mock)" → "Akun demo" (akun yang sama juga di-seed di engine).

---

## 3a. Hasil uji E2E live (29 Oktober 2026)

Skrip uji meniru persis body yang dikirim `src/lib/api/live.ts` ke engine (`toko-utama`, engine lokal
`localhost:5121`). **23 cek, 23 lulus**, trial-balance seimbang, stok akhir sesuai hitungan.

Yang terverifikasi berjalan:

| Jalur | Bukti |
|---|---|
| Produk + master unit/gudang | `POST /api/products` 201, gudang default dibuat otomatis |
| Penyesuaian stok | `POST /api/inventory/adjustments` 201, stok terbaca 20 |
| Checkout tunai lunas | `POST /api/cash-batches/sales` 201, outstanding 0 |
| Checkout DP sebagian | 201, outstanding 5000 → jadi piutang |
| Pelunasan piutang | pakai **id** 200; pakai **nomor** 404 (lihat bug #5) |
| Pembelian DP sebagian | 201, outstanding 19000 |
| Pelunasan hutang | 200 |
| Daftar pembelian | `terbayar`/`metode` benar setelah pakai AP ageing |
| Biaya | `POST /api/expenses` 201 |
| Retur penjualan | `POST /api/sale-returns` 201, 3000 |
| Void transaksi POSTED | 409 → POS jatuh ke retur (sesuai rancangan) |
| Laporan | `trial-balance` debit = kredit |

**Tiga bug kontrak baru ditemukan & diperbaiki di sesi ini** (`src/lib/api/live.ts`):

| # | Bug | Akibat sebelum diperbaiki |
|---|---|---|
| 5 | `liveBayarPiutang` mengirim **nomor** dokumen (`SALE-00001`) ke `/api/sales/{id}/payments`. Rute engine hanya menerima id → **404**. | Tombol "Bayar" di tab Piutang selalu gagal. |
| 6 | `liveTransaksiRiwayat` mengisi `piutang: 0` hardcoded. | Tab Piutang & KPI piutang selalu kosong; status penjualan kredit selalu "lunas". |
| 7 | `livePembelianList` memakai `payableAmount` dokumen sebagai sisa hutang, padahal itu nilai **bruto** (terbukti 20000 untuk total 20000). | Semua pembelian tampil "hutang, terbayar 0", termasuk yang sudah lunas. |

Perbaikan: nomor→id lewat `cariPenjualanByNomor`; `piutang` dan `terbayar` dihitung dari
`GET /api/reports/ar-ap/aging?side=RECEIVABLE|PAYABLE` (`outstandingAmount` per `invoiceNumber`).

**Dua jalur kredit kini ditolak lebih awal dengan pesan Indonesia** (bukan 409 berbahasa Inggris):
`liveCheckout` saat total bayar 0, dan `livePembelianBuat` saat `metode: "hutang"`. Alasannya bukan
sekadar `paymentAmount: 0` — alur dokumen kredit butuh maker-checker (pembuat ≠ penyetuju), dan POS
belum punya UI approval maupun akun penyetuju kedua.

---

## 4. Gap yang masih terbuka (prioritas berikutnya)

### P1 — data yang diinput user tidak sampai ke engine
1. **Profil toko hanya di localStorage** (`useToko`), sementara engine punya
   `GET/PUT /api/settings/company-profile` + `POST .../logo`. Akibatnya: nama/alamat/NPWP di
   Faktur PDF engine kosong, dan profil tidak sama antar perangkat.
2. **Stok awal produk diabaikan di live**: `liveCreateProduct` tidak mengirim `stok` (engine tidak menerima
   stok di `POST /api/products`). Solusi: setelah create, panggil `POST /api/inventory/adjustments`
   (`STOCK_ADJUSTMENT_IN`, `unitCost` = harga beli) bila `stok > 0`. Hint di form produk juga masih menyebut "mock".
3. **Kebijakan operasional** (`izinkanKredit`, `saldoAwalShift`) hanya localStorage — tidak ada padanan engine;
   keputusan kredit di live sepenuhnya ditentukan engine (kebijakan POS hanya mematikan checkbox).

### P2 — endpoint engine yang belum dipakai POS
| Endpoint engine | Kegunaan di POS |
|---|---|
| `GET /api/reports/daily-movement` (+ `/export`) | Laporan "Daily Movement" belum ada di halaman Laporan (sekarang hanya agregasi dari riwayat). |
| `GET /api/reports/ar-ap/aging`, `/reconciliation` | Umur piutang/hutang di Keuangan. |
| `GET /api/reports/trial-balance/export` | Ekspor neraca saldo resmi (xlsx/CSV) — sekarang ekspor hanya CSV transaksi buatan sendiri. |
| `GET /api/analytics/*` (12 laporan) | Rasio & health summary belum tampil di mana pun. |
| `GET /api/fiscal-periods`, `POST .../close`, `.../close-year` | Tab Pengaturan → Akuntansi masih berlabel "Menyusul (P2)". |
| `GET/POST /api/approval-rules`, `/api/approvals` | Belum ada UI approval; POS hanya memakai `approvedBy = NEXT_PUBLIC_ENGINE_APPROVER`. |
| `GET/POST /api/suppliers` | Pembelian masih menyimpan `pemasok` sebagai teks bebas. |
| `GET/POST /api/branches`, `/api/warehouses/branch/{id}` | Multi-cabang & gudang belum ada UI. |
| `POST /api/cash-transfers`, `GET/POST /api/loans`, `GET/POST /api/backups` | Belum ada UI. |
| `GET /api/sales/{id}/pdf`, `/qrcode` | Struk POS dicetak sendiri (`src/lib/struk.ts`), bukan Faktur resmi engine. |
| `GET /api/audit-log/entity` | Audit per entitas belum dipakai (baru list global). |

### P3 — perilaku live yang menyimpang (sudah terdokumentasi di AGENTS.md)- Riwayat live kehilangan `diskon`, `kembalian`, `shiftId` (dokumen penjualan engine tidak menyimpan diskon;
  POS melebur diskon ke `unitPrice`).
- Pembayaran campuran + overpayment (kembalian) ditolak engine; QRIS bukan konsep engine.
- `liveBuatUser` hanya peran kasir.
- Impor produk live all-or-nothing; `satuan` harus sudah ada di master unit; stok awal tidak diimpor.
- Otorisasi live berbasis header (`X-Actor-Id`, `X-Actor-Level`) + JWT; permission RBAC engine belum dipetakan
  ke menu POS (menu masih memakai `role` lokal).
- Belum ada antrean offline untuk topologi LAN Mode A.

---

### Temuan di sisi engine (dicatat, belum diperbaiki — repo terpisah)

Semua di bawah ini **terverifikasi lewat E2E**, bukan dugaan:

1. **`POST /api/cash-batches/sales` dan `/purchases` menolak `paymentAmount: 0`** →
   `409 "A payment must be greater than zero; 0.00 is not a payable amount."` Jadi penjualan/pembelian
   kredit **tanpa DP** tidak bisa lewat jalur kasir. POS saat ini menolaknya lebih awal dengan pesan
   Indonesia; butuh keputusan produk + perubahan engine.
2. **`outstandingAfter` pada `POST /api/sales/{id}/payments` dan `/purchases/{id}/payments` mengabaikan
   DP dari batch.** Contoh terukur: total 6000, DP 1000, bayar 2000 → respons `outstandingAfter` 4000,
   padahal AR ageing benar 3000. POS tidak memakai angka ini (dihitung ulang dari ageing), tetapi
   klien lain akan salah.
3. **`GET /api/purchases` → `payableAmount` adalah hutang bruto, bukan sisa.** Terukur: total 20000,
   DP 1000, bayar 5000 → `payableAmount` tetap 20000. Nama field menyesatkan; sebaiknya diganti
   `payableTotal` atau diisi sisa sebenarnya.
4. **`POST /api/inventory/adjustments` tidak memvalidasi keberadaan `productId`/`warehouseId`**: dikirim
   id asal-asalan, engine menjawab **201** dan menulis `InventoryMovement` + `CostLayer` (dengan
   `ProductId = "tidak-ada"`), tanpa jurnal. Melanggar semangat "Unknown ≠ Zero".
5. **Alur kredit langsung butuh dua akun.** `POST /api/transactions/{id}/approve` menolak
   `403 "Maker cannot approve own transaction"`; DB dev hanya punya satu user (`pemilik`). Selama belum
   ada user penyetuju kedua (atau aturan approval yang mengizinkan auto-approve kredit), jalur dokumen
   kredit tidak bisa dipakai POS.
6. `GET /api/inventory/stock` mengembalikan `{ warehouseId, items[] }` — POS sempat salah membaca
   (`quantities`), lihat §2 no. 2.
7. Pesan galat engine masih bahasa Inggris (`ProblemDetails`), POS meneruskannya apa adanya ke UI
   berbahasa Indonesia.

---

## 5. Cara menjalankan mode live

```bash
# 1. backend
cd backend
dotnet ef database update -p src/AccountingEngine.Infrastructure -s src/AccountingEngine.Api
python ../tools/bootstrap-backend.py
dotnet run --project src/AccountingEngine.Api/AccountingEngine.Api   # http://localhost:5121

# 2. frontend (butuh .env.local — sudah dibuat, gitignored)
npm run dev                                                          # http://localhost:3000
```

Untuk kembali ke mock: ubah `NEXT_PUBLIC_API_MODE=mock` di `.env.local`, lalu restart dev server
(env `NEXT_PUBLIC_*` di-inline saat build, bukan dibaca runtime).
