"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardSkeleton,
  CardTitle,
  EmptyState,
  PageContainer,
  PageHeader,
  SettlementStatusBadge,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from "@harbor/ui";
import { Wallet } from "lucide-react";
import { useSettlementPreview, useSettlements } from "@/lib/hooks";
import { formatCents } from "@/lib/format";

export default function PayoutsPage() {
  const { data, isLoading: previewLoading } = useSettlementPreview();
  const { data: settlements, isLoading: settlementsLoading } = useSettlements();
  const totals = data?.totals;

  return (
    <PageContainer>
      <PageHeader
        title="Payouts"
        description="Settlement preview and payout history for your store."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {previewLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : totals ? (
          <>
            <StatCard
              label="Gross (30 days)"
              value={formatCents(totals.grossCents)}
            />
            <StatCard
              label="Platform fees"
              value={formatCents(totals.feeCents)}
            />
            <StatCard
              label="Net payout"
              value={formatCents(totals.netCents)}
            />
          </>
        ) : null}
      </div>

      {totals && !previewLoading ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Fee breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Percent fee ({totals.feeBreakdown.percentFeeLabel})
              </span>
              <span>{formatCents(totals.feeBreakdown.percentFeeCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Flat fee ({totals.feeBreakdown.flatFeeDescription})
              </span>
              <span>{formatCents(totals.feeBreakdown.flatFeeCents)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total fees</span>
              <span>{formatCents(totals.feeCents)}</span>
            </div>
            <p className="text-muted-foreground">
              {totals.orderCount} settleable order
              {totals.orderCount === 1 ? "" : "s"} in the last 30 days
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">
          Settlement history
        </h2>
        <div className="mt-4">
          {settlementsLoading ? (
            <TableSkeleton />
          ) : !settlements?.length ? (
            <EmptyState
              icon={Wallet}
              title="No settlements yet"
              description="Draft settlements are created nightly when you have paid orders."
            />
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(settlement.periodStart).toLocaleDateString()} –{" "}
                        {new Date(settlement.periodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <SettlementStatusBadge status={settlement.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCents(settlement.grossCents)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCents(settlement.feeCents)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCents(settlement.netCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
