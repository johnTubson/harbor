import type {
  MerchantStatus,
  OrderStatus,
  SettlementStatus,
} from "@harbor/shared";

import { Badge } from "./ui/badge";

const merchantVariants: Record<
  MerchantStatus,
  "warning" | "success" | "destructive" | "muted"
> = {
  pending: "warning",
  active: "success",
  rejected: "destructive",
  suspended: "muted",
};

const orderVariants: Record<
  OrderStatus,
  "info" | "default" | "secondary" | "success" | "destructive"
> = {
  placed: "info",
  paid: "default",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
};

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  return (
    <Badge variant={merchantVariants[status]} className="capitalize">
      {status}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={orderVariants[status]} className="capitalize">
      {status}
    </Badge>
  );
}

const settlementVariants: Record<
  SettlementStatus,
  "warning" | "info" | "success"
> = {
  draft: "warning",
  finalized: "info",
  paid: "success",
};

export function SettlementStatusBadge({
  status,
}: {
  status: SettlementStatus;
}) {
  return (
    <Badge variant={settlementVariants[status]} className="capitalize">
      {status}
    </Badge>
  );
}
