"use client";

import type { CreateProductInput } from "@harbor/shared";
import {
  Alert,
  AlertDescription,
  Button,
  PageContainer,
  PageHeader,
} from "@harbor/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProductForm } from "@/components/product-form";
import { useCreateProduct } from "@/lib/hooks";

const emptyVariant = {
  sku: "",
  name: "",
  priceCents: 0,
  stock: 0,
};

export default function NewProductPage() {
  const router = useRouter();
  const create = useCreateProduct();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: CreateProductInput) {
    setError(null);
    try {
      const product = await create.mutateAsync(input);
      router.push(`/products/${product.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    }
  }

  return (
    <PageContainer size="md">
      <Button variant="link" asChild className="h-auto p-0">
        <Link href="/products">← Products</Link>
      </Button>
      <div className="mt-4">
        <PageHeader title="New product" />
      </div>
      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <ProductForm
        className="mt-6"
        initial={{
          title: "",
          description: "",
          slug: "",
          variants: [{ ...emptyVariant }],
        }}
        submitting={create.isPending}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
