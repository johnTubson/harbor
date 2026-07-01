"use client";

import type { Merchant } from "@harbor/shared";
import { CardSkeleton, PageContainer, PageHeader, StatCard } from "@harbor/ui";
import { useMerchants } from "@/lib/hooks";

export default function DashboardPage() {
  const { data: merchants, isLoading } = useMerchants();

  const pending =
    merchants?.filter((m: Merchant) => m.status === "pending").length ?? 0;
  const active =
    merchants?.filter((m: Merchant) => m.status === "active").length ?? 0;

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Platform overview and quick actions."
      />

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Pending KYC"
            value={pending}
            valueClassName="text-amber-600"
            href={pending > 0 ? "/merchants?status=pending" : undefined}
            linkLabel={pending > 0 ? "Review queue" : undefined}
          />
          <StatCard
            label="Active merchants"
            value={active}
            valueClassName="text-emerald-600"
            href="/merchants"
            linkLabel="View all"
          />
        </div>
      )}
    </PageContainer>
  );
}
