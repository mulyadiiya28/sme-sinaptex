"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { useAuth } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || !user || i.roles.includes(user.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex flex-col bg-brand text-white transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-0")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black">
          S
        </span>
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-sm font-black tracking-wide">SINAPTEX</span>
            <span className="block text-[10px] text-white/70">Smart Retail & Accounting</span>
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group.title ?? group.items[0].href}>
            {group.title && !collapsed && (
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-white text-brand shadow-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <item.icon className="size-5 shrink-0" aria-hidden />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
        className="mx-2 mb-4 flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        {!collapsed && "Ciutkan"}
      </button>
    </aside>
  );
}
