import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  CreateProductInput,
  OrderWithLines,
  ProductWithVariants,
  Settlement,
  SettlementPreviewResponse,
  UpdateProductInput,
} from "@harbor/shared";
import { apiFetch } from "./api";
import { defaultSettlementPeriod, settlementPeriodQuery } from "./settlements";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<ProductWithVariants[]>("/products"),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => apiFetch<ProductWithVariants>(`/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      apiFetch<ProductWithVariants>("/products", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      apiFetch<ProductWithVariants>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["products", id] });
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => apiFetch<OrderWithLines[]>("/orders"),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiFetch<OrderWithLines>(`/orders/${id}`),
    enabled: Boolean(id),
  });
}

export function useSettlements() {
  return useQuery({
    queryKey: ["settlements"],
    queryFn: () => apiFetch<Settlement[]>("/settlements"),
  });
}

export function useSettlementPreview(period?: {
  periodStart: string;
  periodEnd: string;
}) {
  const defaultPeriod = useMemo(() => defaultSettlementPeriod(), []);
  const { periodStart, periodEnd } = period ?? defaultPeriod;
  return useQuery({
    queryKey: ["settlements", "preview", periodStart, periodEnd],
    queryFn: () =>
      apiFetch<SettlementPreviewResponse>(
        `/settlements/preview?${settlementPeriodQuery({
          periodStart,
          periodEnd,
        })}`
      ),
  });
}
