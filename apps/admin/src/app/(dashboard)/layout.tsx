"use client";

import { AppLoading, AppShell, type NavItem } from "@harbor/ui";
import { Banknote, Building2, ClipboardList, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useRequireAuth } from "@/lib/auth";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/merchants", label: "Merchants", icon: Building2 },
  { href: "/settlements", label: "Settlements", icon: Banknote },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useRequireAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading || !user) {
    return <AppLoading />;
  }

  return (
    <AppShell
      title="Harbor Admin"
      navItems={navItems}
      userEmail={user.email}
      onSignOut={logout}
      mobileOpen={sidebarOpen}
      onMobileOpenChange={setSidebarOpen}
    >
      {children}
    </AppShell>
  );
}
