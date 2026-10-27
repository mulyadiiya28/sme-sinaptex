# POS-Sinaptex — Design System

> **Desktop-first, tablet fallback.** Brand: navy `#0B2F6E`, orange `#F97316`.
> Data‑category aksen: violet/emerald/rose (kebebasan utuh, bukan brand).

---

## 1. Brand Tokens (Tailwind v4 CSS `:root` / theme vars)

| Nama | HEX | Pakai |
|---|---|---|
| `color-brand` | `#0B2F6E` | Tombol primer, heading, nav aktif, fokus input |
| `color-brand-hover` | `#082657` | Hover/pressed primer |
| `color-accent` | `#F97316` | CTA bayar/aksi utama |
| `color-accent-hover` | `#EA580C` | Hover CTA |
| `color-stat-violet` | `#7C3AED` | Aksen kategori statistik |
| `color-stat-emerald` | `#059669` | Aksen kategori statistik |
| `color-stat-rose` | `#E11D48` | Aksen kategori statistik |
| `color-canvas` | `#F8FAFC` | Latar belakang halaman |
| `color-line` | `#E2E8F0` | Border tipis |
| `color-ink` | `#0F172A` | Teks utama |
| `color-muted` | `#64748B` | Teks sekunder |
| `color-white/90` | `rgba(255,255,255,0.9)` | Panel glass |
| `color-slate-50` | `#F8FAFC` | Tabel header |
| `color-slate-100` | `#F1F5F9` | |
| `color-slate-200` | `#E2E8F0` | |
| `color-slate-500` | `#64748B` | |
| `color-slate-700` | `#334155` | |

---

## 2. Global Styles (`src/app/globals.css`)

Sudah ada — pastikan tidak diubah secular:

```css
@theme {
  --color-brand: #0b2f6e;
  --color-brand-hover: #082657;
  --color-accent: #f97316;     /* brand-orange */
  --color-canvas: #f8fafc;
  --color-line: #e2e8f0;
  --color-ink: #0f172a;
  --color-muted: #64748b;
  --color-stat-violet: #7c3aed;
  --color-stat-emerald: #059669;
  --color-stat-rose: #e11d48;
}

body { @apply bg-canvas text-ink antialiased; }

/* Panel utama — sesuai spespec */
.panel { @apply rounded-3xl border border-line/80 bg-white/90 backdrop-blur-xl; }

/* Tombol */
.btn-primary { @apply inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand; }
.btn-secondary { @apply inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand; }
.btn-accent { @apply inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent; }

/* Input */
.input { @apply w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20; }
.label { @apply mb-1.5 block text-sm font-medium text-muted; }

/* Chip (kategori filter) */
.chip { @apply rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors; }
.chip-active { @apply border-brand bg-brand text-white; }
.chip-inactive { @apply border-line bg-white text-muted hover:text-ink; }

/* Tabel */
.table { @apply w-full rounded-2xl border border-line/80 bg-white/90 overflow-hidden; }
.thead { @apply bg-slate-50; }
.trow { @apply hover:bg-slate-50/70; }
.tcell { @apply px-4 py-3 text-sm; }
.tcell-font { @apply font-medium; }
.tcell-nums { @apply tabular-nums font-mono; }

/* Uang */
.money { @apply font-tabular-nums font-bold; }
.money-sm { @apply text-sm; }
.money-lg { @apply text-lg; }
.money-xl { @apply text-2xl font-black; }

/* Badge stat */
.badge-violet { @apply text-violet-600; }
.badge-emerald { @apply text-emerald-600; }
.badge-rose { @apply text-rose-600; }