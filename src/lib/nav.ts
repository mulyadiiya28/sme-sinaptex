import {
  BarChart3,
  BookText,
  Calculator,
  ClipboardList,
  History,
  LayoutDashboard,
  Package,
  Settings,
  Timer,
  Wallet,
} from "lucide-react";
import type { Role } from "@/lib/api/types";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[] };
export type NavGroup = { title?: string; items: NavItem[] };

type LucideIcon = typeof LayoutDashboard;

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operasional",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["pemilik"] },
      { href: "/kasir", label: "Kasir", icon: Calculator },
      { href: "/riwayat", label: "Riwayat Transaksi", icon: History },
      { href: "/shift", label: "Shift Kasir", icon: Timer },
    ],
  },
  {
    title: "Produk & Persediaan",
    items: [
      { href: "/produk", label: "Produk", icon: Package, roles: ["pemilik"] },
      { href: "/pembelian", label: "Pembelian", icon: ClipboardList, roles: ["pemilik"] },
    ],
  },
  {
    title: "Keuangan & Akuntansi",
    items: [
      { href: "/keuangan", label: "Keuangan", icon: Wallet, roles: ["pemilik"] },
      { href: "/akuntansi", label: "Akuntansi", icon: BookText, roles: ["pemilik"] },
      { href: "/laporan", label: "Laporan", icon: BarChart3, roles: ["pemilik"] },
    ],
  },
  {
    title: "Sistem",
    items: [{ href: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["pemilik"] }],
  },
];
