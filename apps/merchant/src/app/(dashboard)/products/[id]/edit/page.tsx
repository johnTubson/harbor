"use client";

import type { CreateProductInput, UpdateProductInput } from "@harbor/shared";
import {
  Alert,
  AlertDescription,
  Button,
  CardSkeleton,
  PageContainer,
  PageHeader,
  toast,
} from "@harbor/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ProductForm } from "@/components/product-form";
import { useProduct, useUpdateProduct } from "@/lib/hooks";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id);
  const update = useUpdateProduct();
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(input: CreateProductInput) {
    setFormError(null);
    const payload: UpdateProductInput = {
      title: input.title,
      description: input.description ?? null,
      slug: input.slug,
      variants: input.variants,
    };
    try {
      await update.mutateAsync({ id, input: payload });
      toast.success("Product saved");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to update product"
      );
    }
  }

  if (isLoading) {
    return (
      <PageContainer size="md">
        <CardSkeleton />
      </PageContainer>
    );
  }

  if (error || !product) {
    return (
      <PageContainer size="md">
        <p className="text-sm text-destructive">Product not found.</p>
        <Button variant="link" asChild className="mt-4 h-auto p-0">
          <Link href="/products">← Products</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md">
      <Button variant="link" asChild className="h-auto p-0">
        <Link href="/products">← Products</Link>
      </Button>
      <div className="mt-4">
        <PageHeader title="Edit product" />
      </div>
      {formError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <ProductForm
        className="mt-6"
        initial={{
          title: product.title,
          description: product.description ?? "",
          slug: product.slug,
          variants: product.variants.map((v) => ({
            sku: v.sku,
            name: v.name,
            priceCents: v.priceCents,
            stock: v.stock,
          })),
        }}
        submitting={update.isPending}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </PageContainer>
  );
}
