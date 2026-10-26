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

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { title?: string; items: NavItem[] };

type LucideIcon = typeof LayoutDashboard;

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operasional",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/kasir", label: "Kasir", icon: Calculator },
      { href: "/riwayat", label: "Riwayat Transaksi", icon: History },
      { href: "/shift", label: "Shift Kasir", icon: Timer },
    ],
  },
  {
    title: "Produk & Persediaan",
    items: [
      { href: "/produk", label: "Produk", icon: Package },
      { href: "/pembelian", label: "Pembelian", icon: ClipboardList },
    ],
  },
  {
    title: "Keuangan & Akuntansi",
    items: [
      { href: "/keuangan", label: "Keuangan", icon: Wallet },
      { href: "/akuntansi", label: "Akuntansi", icon: BookText },
      { href: "/laporan", label: "Laporan", icon: BarChart3 },
    ],
  },
  {
    title: "Sistem",
    items: [{ href: "/pengaturan", label: "Pengaturan", icon: Settings }],
  },
];
