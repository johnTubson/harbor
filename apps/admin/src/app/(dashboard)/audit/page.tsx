"use client";

import type { AuditLog } from "@harbor/shared";
import {
  Button,
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
} from "@harbor/ui";
import { useState } from "react";
import { useAuditLog } from "@/lib/hooks";

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useAuditLog(page);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Audit Log"
        description="Append-only record of platform admin actions."
      />

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load audit log.</p>
        ) : !data?.items.length ? (
          <EmptyState title="No audit entries yet" />
        ) : (
          <>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Actor
                    </TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry: AuditLog) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.action}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {entry.actorEmail ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {entry.entityType} / {entry.entityId.slice(0, 8)}…
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}
