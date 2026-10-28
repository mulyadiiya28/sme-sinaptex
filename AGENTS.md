# AGENTS.md — POS-Sinaptex

## Project Overview

Next.js 15 (App Router, static export) POS application for UMKM retail stores, wrapped as a
Tauri 2 desktop app (`POS-Sinaptex.exe`). Backend is an external C# engine (Windows Service,
REST + JWT) that is **not wired yet** — all data comes from an in-memory mock engine.

- Static export: `output: "export"` → `out/` (consumed by Tauri `frontendDist`)
- PWA via `@serwist/next` (service worker disabled in dev)
- Offline LAN topology (Mode A): POS.exe → `http://<server-toko>:PORT/api`

## Commands

```bash
npm run dev          # Next dev server (http://localhost:3000)
npm run build        # Static export to out/ (required before Tauri build)
npx tauri dev        # Tauri desktop dev (runs npm run dev automatically)
npx tauri build      # Windows installer (nsis + msi)
npx tsc --noEmit     # Typecheck (no lint/test tooling configured in this repo)
```

Demo accounts (mock): `pemilik` / `pemilik123` (owner), `kasir` / `kasir123` (cashier).

## Architecture

```
src/
  app/
    login/page.tsx       → login (no shell)
    kasir/page.tsx       → full-screen POS, intentionally outside (app) group
    (app)/               → AppShell group: dashboard, produk, riwayat, shift,
                           pembelian, keuangan, akuntansi, laporan, pengaturan
  components/            → shared UI + kasir/ + produk/ subfolders
  hooks/queries.ts       → ALL TanStack Query hooks (queries + mutation groups)
  lib/
    api/types.ts         → domain types (single source of truth / C# contract)
    api/client.ts        → `api` facade, API_MODE mock|live switch
    api/live.ts          → live client: fetch ke engine C# + pemetaan DTO→domain
    api/mock/db.ts       → in-memory mock engine (double-entry journal, GL, P&L)
    store/               → zustand: auth.ts (persist), cart.ts, toko.ts (persist)
    csv.ts, format.ts, nav.ts, struk.ts, utils.ts
  sw.ts                  → Serwist service worker
src-tauri/               → Rust shell (tauri-plugin-log only, no native APIs yet)
backend/                 → nested git repo: engine Accounting Engine (.NET 10)
tools/                   → bootstrap-backend.py (tenant + owner + RBAC + kas + periode)
```

### Layer rules

- **All data access goes through `src/lib/api/client.ts` (`api.*`).** Components never call
  `mock/db.ts` directly.
- `API_MODE === "live"` memakai `src/lib/api/live.ts` (fetch ke engine C# + pemetaan DTO→domain);
  jalur HTTP (header, JWT, refresh, idempotensi) hanya boleh disentuh di file itu. Alur yang engine-nya
  belum punya endpoint melempar `engineBelumAda(...)` — pesan eksplisit, bukan data mock.
- Engine (`backend/`) adalah nested git repo: perubahan di sana **tidak** ikut commit repo POS.
- Business/accounting logic (stok, saldo, jurnal) belongs in the engine layer, not components.
- `API_MODE` is read from `process.env.NEXT_PUBLIC_API_MODE` (default `mock`).

## Conventions

- TypeScript strict mode. `type` aliases over `interface`; named exports; default export only
  for Next.js `page.tsx` / `layout.tsx`.
- `"use client"` only when hooks/state/browser APIs are needed; presentational components stay
  server-compatible.
- Path alias `@/*` → `src/*` (never relative `../../`).
- Inline prop types: `{ children }: { children: React.ReactNode }` — no `React.FC`.
- Every component accepts `className?: string` merged with `cn()` from `src/lib/utils.ts`.
- Tailwind v4 CSS-first tokens in `src/app/globals.css` (`@theme`). Use semantic utilities
  (`panel`, `btn-primary`, `btn-secondary`, `btn-accent`, `input`, `label`, `chip`, `money`)
  instead of raw hex values. Brand navy `#0B2F6E`, accent orange `#F97316`.
- Money: always `<MoneyDisplay value={...} />` / `formatIDR()`; never manual currency strings.
- Status values are string-literal unions with `STATUS_LABEL` / `STATUS_TONE` maps.
- Zustand: one store per concern, explicit `type XState`, `persist` only where needed
  (`auth` excludes `accessToken` via `partialize`; `cart` is never persisted).
- React Query: query keys are short string arrays (`["products"]`, `["shift"]`, `["jurnal"]`).
  Mutations invalidate affected keys (GL changes invalidate `["jurnal"]`, `["akun"]`,
  `["laba-rugi"]`).
- Validation: Zod schemas declared at module level, `safeParse` on submit, Indonesian messages,
  field errors + server error shown separately.
- Dialogs are hand-rolled fixed overlays (no dialog library). Icons from `lucide-react` with
  `aria-hidden`; icon-only buttons need `aria-label`.
- Do not add comments unless explicitly requested. Do not add libraries without checking
  existing usage first.

## Domain Rules (must be preserved)

- Kasir cannot transact before a shift is open; the POS screen redirects to `/shift`.
- Checkout must carry an `idempotensiKunci` — duplicate keys are rejected.
- Payment status ≠ sale status: `lunas | menunggu_pembayaran | dibayar_sebagian | dibatalkan`.
- Mixed payment allocations must be fully explained; excess cash becomes change, a shortfall
  becomes a receivable only when credit sales are enabled (toko policy).
- Digital payments (QRIS) are never auto-successful; owner confirms them.
- Void/return/stock adjustment = owner only, keep the original transaction referenced, and
  post reversal journals.
- Journals must balance (total debit = total kredit). Balances are derived from the journal,
  never entered directly by the user.
- Cash balance = opening float + cash in − cash out + cash sales (excludes transfer/QRIS).
- Shift close records the difference between physical and system cash as a warning.

## Docs

- `knowledge.md` — full blueprint, C# endpoint contract, implementation status notes.
- `DESIGN.md` — design system tokens and component standards.
- `INIT_STATUS.md` — initialization status and run instructions.
- `README.md` — setup, features, and mock-mode caveats.
