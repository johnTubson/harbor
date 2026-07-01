"use client";

import type { KycDocument } from "@harbor/shared";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardSkeleton,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  MerchantStatusBadge,
  PageContainer,
  Textarea,
  toast,
} from "@harbor/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useApproveMerchant,
  useMerchant,
  useRejectMerchant,
} from "@/lib/hooks";

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: merchant, isLoading, error } = useMerchant(id);
  const approve = useApproveMerchant();
  const reject = useRejectMerchant();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleApprove() {
    setActionError(null);
    try {
      await approve.mutateAsync(id);
      setApproveOpen(false);
      toast.success("Merchant approved");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setActionError(null);
    try {
      await reject.mutateAsync({ id, reason: rejectReason.trim() });
      setRejectOpen(false);
      setRejectReason("");
      toast.success("Merchant rejected");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
    }
  }

  if (isLoading) {
    return (
      <PageContainer size="md">
        <CardSkeleton />
      </PageContainer>
    );
  }

  if (error || !merchant) {
    return (
      <PageContainer size="md">
        <p className="text-sm text-destructive">Merchant not found.</p>
        <Button variant="link" asChild className="mt-4 h-auto p-0">
          <Link href="/merchants">← Back to merchants</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md">
      <Button variant="link" asChild className="h-auto p-0">
        <Link href="/merchants">← Merchants</Link>
      </Button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {merchant.name}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {merchant.slug}
          </p>
        </div>
        <MerchantStatusBadge status={merchant.status} />
      </div>

      {merchant.rejectReason ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            Rejection reason: {merchant.rejectReason}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">KYC Documents</h2>
        {merchant.kycDocuments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No documents uploaded.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {merchant.kycDocuments.map((doc: KycDocument) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{doc.fileName}</p>
                  <p className="text-muted-foreground capitalize">
                    {doc.type.replace(/_/g, " ")}
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {doc.objectKey}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {merchant.status === "pending" ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Review actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionError ? (
              <Alert variant="destructive">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setApproveOpen(true)}
                disabled={approve.isPending}
              >
                Approve merchant
              </Button>
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve merchant</DialogTitle>
            <DialogDescription>
              This will activate {merchant.name} and allow them to manage
              products and orders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={approve.isPending}
            >
              {approve.isPending ? "Approving…" : "Confirm approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject merchant</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {merchant.name}. This will be
              recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={reject.isPending || !rejectReason.trim()}
            >
              {reject.isPending ? "Rejecting…" : "Confirm rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
