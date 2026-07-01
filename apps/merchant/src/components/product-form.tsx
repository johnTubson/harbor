"use client";

import type { CreateProductInput } from "@harbor/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@harbor/ui";
import { type ChangeEvent, useState } from "react";
import { slugify } from "@/lib/format";

type VariantRow = CreateProductInput["variants"][number];

export function ProductForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Create product",
  className = "",
}: {
  initial: CreateProductInput & { description?: string };
  onSubmit: (input: CreateProductInput) => Promise<void>;
  submitting: boolean;
  submitLabel?: string;
  className?: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [slug, setSlug] = useState(initial.slug);
  const [slugManual, setSlugManual] = useState(Boolean(initial.slug));
  const [variants, setVariants] = useState<VariantRow[]>(initial.variants);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
  }

  function updateVariant(
    index: number,
    field: keyof VariantRow,
    value: string | number
  ) {
    setVariants((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addVariant() {
    setVariants((rows) => [
      ...rows,
      { sku: "", name: "", priceCents: 0, stock: 0 },
    ]);
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) return;
    setVariants((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: ChangeEvent) {
    e.preventDefault();
    await onSubmit({
      title,
      description: description || undefined,
      slug,
      variants: variants.map((v) => ({
        ...v,
        priceCents: Number(v.priceCents),
        stock: Number(v.stock),
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value);
              }}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Variants</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={addVariant}>
            + Add variant
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {variants.map((variant, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <Input
                  required
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, "sku", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  required
                  value={variant.name}
                  onChange={(e) => updateVariant(index, "name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Price (cents)
                </Label>
                <Input
                  required
                  type="number"
                  min={0}
                  value={variant.priceCents}
                  onChange={(e) =>
                    updateVariant(index, "priceCents", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Stock</Label>
                <Input
                  required
                  type="number"
                  min={0}
                  value={variant.stock}
                  onChange={(e) =>
                    updateVariant(index, "stock", e.target.value)
                  }
                />
              </div>
              {variants.length > 1 ? (
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeVariant(index)}
                  >
                    Remove variant
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
