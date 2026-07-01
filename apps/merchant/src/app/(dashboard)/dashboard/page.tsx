"use client";

import { CardSkeleton, PageContainer, PageHeader, StatCard } from "@harbor/ui";
import { useProducts, useOrders } from "@/lib/hooks";
import { formatCents } from "@/lib/format";

export default function DashboardPage() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: orders, isLoading: ordersLoading } = useOrders();

  const isLoading = productsLoading || ordersLoading;

  return (
    <PageContainer>
      <PageHeader title="Dashboard" description="Your store at a glance." />

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Products"
            value={products?.length ?? 0}
            href="/products"
            linkLabel="Manage products"
          />
          <StatCard
            label="Orders"
            value={orders?.length ?? 0}
            href="/orders"
            linkLabel="View orders"
          />
          {orders && orders.length > 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              Latest order:{" "}
              {formatCents(orders[0].totalCents, orders[0].currency)}
            </p>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
