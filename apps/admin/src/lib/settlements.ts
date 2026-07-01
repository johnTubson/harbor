export function defaultSettlementPeriod() {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

export function settlementPeriodQuery(period?: {
  periodStart: string;
  periodEnd: string;
}) {
  const { periodStart, periodEnd } = period ?? defaultSettlementPeriod();
  return `periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}`;
}
