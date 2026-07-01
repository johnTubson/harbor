"use client";

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
import { Package } from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/lib/hooks";
import { formatCents } from "@/lib/format";

export default function ProductsPage() {
  const { data: products, isLoading, error } = useProducts();

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Manage your catalog and inventory."
        actions={
          <Button asChild>
            <Link href="/products/new">Add product</Link>
          </Button>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load products.</p>
        ) : !products?.length ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Create your first product to start selling."
            action={
              <Button asChild>
                <Link href="/products/new">Add product</Link>
              </Button>
            }
          />
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Variants
                  </TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const totalStock = p.variants.reduce(
                    (sum, v) => sum + v.stock,
                    0
                  );
                  const minPrice = Math.min(
                    ...p.variants.map((v) => v.priceCents)
                  );
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-muted-foreground sm:hidden">
                          {p.variants.length} variants · from{" "}
                          {formatCents(minPrice)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {p.variants.length}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {totalStock}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" asChild className="h-auto p-0">
                          <Link href={`/products/${p.id}/edit`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
