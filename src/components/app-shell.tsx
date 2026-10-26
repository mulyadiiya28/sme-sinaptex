"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/app-topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main
        style={{ marginLeft: collapsed ? 64 : 256 }}
        className="min-h-screen transition-[margin-left] duration-200"
      >
        <Topbar />
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
