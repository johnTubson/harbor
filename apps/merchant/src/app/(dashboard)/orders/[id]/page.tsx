"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardSkeleton,
  CardTitle,
  OrderStatusBadge,
  PageContainer,
  Separator,
} from "@harbor/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrder } from "@/lib/hooks";
import { formatCents } from "@/lib/format";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, error } = useOrder(id);

  if (isLoading) {
    return (
      <PageContainer size="md">
        <CardSkeleton />
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer size="md">
        <p className="text-sm text-destructive">Order not found.</p>
        <Button variant="link" asChild className="mt-4 h-auto p-0">
          <Link href="/orders">← Orders</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md">
      <Button variant="link" asChild className="h-auto p-0">
        <Link href="/orders">← Orders</Link>
      </Button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-mono">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {order.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between px-6 py-4 text-sm"
              >
                <div>
                  <p className="font-medium">{line.productTitle}</p>
                  {line.variantName ? (
                    <p className="text-muted-foreground">{line.variantName}</p>
                  ) : null}
                  <p className="text-muted-foreground">Qty {line.quantity}</p>
                </div>
                <p className="font-medium">
                  {formatCents(line.lineTotalCents, order.currency)}
                </p>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex justify-between px-6 py-4">
            <span className="font-medium">Total</span>
            <span className="text-lg font-semibold">
              {formatCents(order.totalCents, order.currency)}
            </span>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
