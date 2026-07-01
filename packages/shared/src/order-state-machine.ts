import type { OrderStatus } from "./enums";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) {
    return false;
  }
  return TRANSITIONS[from].includes(to);
}

export function assertValidOrderTransition(
  from: OrderStatus,
  to: OrderStatus
): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
}

export const SETTLEABLE_ORDER_STATUSES = [
  "paid",
  "shipped",
  "delivered",
] as const satisfies readonly OrderStatus[];
