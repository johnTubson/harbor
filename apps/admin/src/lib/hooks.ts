import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  Merchant,
  MerchantRejectInput,
  MerchantWithKyc,
  PaginatedAuditLogs,
  Settlement,
  SettlementBatchInput,
  SettlementPreviewResponse,
} from "@harbor/shared";
import { apiFetch } from "./api";
import { defaultSettlementPeriod, settlementPeriodQuery } from "./settlements";

export function useMerchants(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery({
    queryKey: ["merchants", status ?? "all"],
    queryFn: () => apiFetch<Merchant[]>(`/merchants${query}`),
  });
}

export function useMerchant(id: string) {
  return useQuery({
    queryKey: ["merchants", id],
    queryFn: () => apiFetch<MerchantWithKyc>(`/merchants/${id}`),
    enabled: Boolean(id),
  });
}

export function useApproveMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Merchant>(`/merchants/${id}/approve`, { method: "PATCH" }),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: ["merchants"] });
      void qc.invalidateQueries({ queryKey: ["merchants", id] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useRejectMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<Merchant>(`/merchants/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason } satisfies MerchantRejectInput),
      }),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ["merchants"] });
      void qc.invalidateQueries({ queryKey: ["merchants", id] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useAuditLog(page: number, limit = 20) {
  return useQuery({
    queryKey: ["audit", page, limit],
    queryFn: () =>
      apiFetch<PaginatedAuditLogs>(`/audit?page=${page}&limit=${limit}`),
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

export function useSettlements() {
  return useQuery({
    queryKey: ["settlements"],
    queryFn: () =>
      apiFetch<(Settlement & { merchant?: { name: string } })[]>(
        "/settlements"
      ),
  });
}

export function useCreateSettlementBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettlementBatchInput) =>
      apiFetch<Settlement[]>("/settlements/batch", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settlements"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
