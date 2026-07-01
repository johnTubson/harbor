"use client";

import type { Merchant } from "@harbor/shared";
import {
  Button,
  EmptyState,
  MerchantStatusBadge,
  PageContainer,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from "@harbor/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMerchants } from "@/lib/hooks";

const filters = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Rejected", value: "rejected" },
];

function MerchantsContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const {
    data: merchants,
    isLoading,
    error,
  } = useMerchants(status || undefined);

  return (
    <PageContainer>
      <PageHeader
        title="Merchants"
        description="Review KYC submissions and manage merchant accounts."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.value || "all"}
            variant={status === f.value ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={f.value ? `/merchants?status=${f.value}` : "/merchants"}
            >
              {f.label}
            </Link>
          </Button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load merchants.</p>
        ) : !merchants?.length ? (
          <EmptyState
            title="No merchants found"
            description="Try a different status filter."
          />
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.map((m: Merchant) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="hidden font-mono text-muted-foreground sm:table-cell">
                      {m.slug}
                    </TableCell>
                    <TableCell>
                      <MerchantStatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" asChild className="h-auto p-0">
                        <Link href={`/merchants/${m.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function MerchantsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <MerchantsContent />
    </Suspense>
  );
}
