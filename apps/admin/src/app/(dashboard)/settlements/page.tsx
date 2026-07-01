"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardSkeleton,
  CardTitle,
  EmptyState,
  PageContainer,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  toast,
} from "@harbor/ui";
import { Banknote } from "lucide-react";
import { useMemo } from "react";
import { useCreateSettlementBatch, useSettlementPreview } from "@/lib/hooks";
import { formatCents } from "@/lib/format";
import { defaultSettlementPeriod } from "@/lib/settlements";

export default function SettlementsPage() {
  const { data, isLoading } = useSettlementPreview();
  const batchMutation = useCreateSettlementBatch();
  const period = useMemo(() => defaultSettlementPeriod(), []);

  const totals = data?.totals;
  const merchants = data?.merchants ?? [];

  async function handleCreateBatch() {
    try {
      const created = await batchMutation.mutateAsync({
        periodStart: new Date(period.periodStart),
        periodEnd: new Date(period.periodEnd),
      });
      toast.success(`Created ${created.length} draft settlement(s)`);
    } catch {
      toast.error("Failed to create settlement batch");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settlements"
        description="Preview platform fees and create draft settlement batches."
        actions={
          <Button
            onClick={() => void handleCreateBatch()}
            disabled={batchMutation.isPending || isLoading}
          >
            {batchMutation.isPending ? "Creating…" : "Create draft batch"}
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : totals ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total gross (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCents(totals.grossCents)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total platform fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCents(totals.feeCents)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total net payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCents(totals.netCents)}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : !merchants.length ? (
          <EmptyState
            icon={Banknote}
            title="No active merchants"
            description="Settlement previews appear for active merchants with settleable orders."
          />
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    % fee
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    Flat fees
                  </TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.map((preview) => (
                  <TableRow key={preview.merchantId}>
                    <TableCell className="font-medium">
                      {preview.merchantName ?? preview.merchantId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {preview.orderCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(preview.grossCents)}
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                      {formatCents(preview.feeBreakdown.percentFeeCents)}{" "}
                      <span className="text-xs">
                        ({preview.feeBreakdown.percentFeeLabel})
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                      {formatCents(preview.feeBreakdown.flatFeeCents)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(preview.netCents)}
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
