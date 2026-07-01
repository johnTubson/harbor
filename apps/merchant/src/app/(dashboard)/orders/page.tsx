"use client";

import {
  Button,
  EmptyState,
  OrderStatusBadge,
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
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useOrders } from "@/lib/hooks";
import { formatCents } from "@/lib/format";

export default function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();

  return (
    <PageContainer>
      <PageHeader title="Orders" description="View orders for your store." />

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load orders.</p>
        ) : !orders?.length ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="Orders will appear here when customers place them."
          />
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-medium font-mono">
                        #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {order.lines.length}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(order.totalCents, order.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="link" asChild className="h-auto p-0">
                        <Link href={`/orders/${order.id}`}>View</Link>
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
