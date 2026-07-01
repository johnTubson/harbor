"use client";

import {
  Card,
  CardContent,
  Input,
  PageContainer,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@harbor/ui";
import { useState } from "react";
import { useProductSearch } from "@/lib/hooks";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data, isFetching, error } = useProductSearch(query);

  return (
    <PageContainer>
      <PageHeader
        title="Product search"
        description="Search the public catalog across all active merchants."
      />

      <div className="mt-6 max-w-xl">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products (e.g. honey, organic, ceramic)"
        />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive">Search failed.</p>
      ) : null}

      {query.trim().length >= 2 ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Variants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Searching…
                    </TableCell>
                  </TableRow>
                ) : data && data.results.length > 0 ? (
                  data.results.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-medium">{product.title}</p>
                        {product.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>{product.merchantName}</TableCell>
                      <TableCell className="text-right">
                        {product.variants.length}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No products found for “{query}”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Enter at least 2 characters to search.
        </p>
      )}
    </PageContainer>
  );
}
