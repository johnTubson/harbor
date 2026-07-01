"use client";

import { AppLoading, AppShell, type NavItem } from "@harbor/ui";
import { LayoutDashboard, Package, ShoppingCart, Wallet } from "lucide-react";
import { useState } from "react";
import { useRequireAuth } from "@/lib/auth";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/payouts", label: "Payouts", icon: Wallet },
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
      title="Harbor Merchant"
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
