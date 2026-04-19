import { useMemo, useState } from "react";
import { buildDashboardFilterOptions, defaultDashboardFilters, filterTradesForDashboard } from "@/features/analytics/domain/dashboard-filters";
import { buildDashboardMetrics } from "@/features/analytics/domain/dashboard-metrics";
import type { TradeRecord } from "@/lib/types";

export function useDashboardState(trades: TradeRecord[]) {
  const [sessionFilter, setSessionFilter] = useState(defaultDashboardFilters.session);
  const [dayFilter, setDayFilter] = useState(defaultDashboardFilters.day);
  const [monthFilter, setMonthFilter] = useState(defaultDashboardFilters.month);
  const [tagFilter, setTagFilter] = useState(defaultDashboardFilters.tag);
  const [instrumentFilter, setInstrumentFilter] = useState(defaultDashboardFilters.instrument);
  const [accountFilter, setAccountFilter] = useState(defaultDashboardFilters.account);

  const filterOptions = useMemo(() => buildDashboardFilterOptions(trades), [trades]);

  const filteredTrades = useMemo(
    () =>
      filterTradesForDashboard(trades, {
        session: sessionFilter,
        day: dayFilter,
        month: monthFilter,
        tag: tagFilter,
        instrument: instrumentFilter,
        account: accountFilter,
      }),
    [accountFilter, dayFilter, instrumentFilter, monthFilter, sessionFilter, tagFilter, trades],
  );

  const metrics = useMemo(() => buildDashboardMetrics(filteredTrades), [filteredTrades]);

  return {
    accountFilter,
    dayFilter,
    filterOptions,
    filteredTrades,
    instrumentFilter,
    metrics,
    monthFilter,
    sessionFilter,
    tagFilter,
    setAccountFilter,
    setDayFilter,
    setInstrumentFilter,
    setMonthFilter,
    setSessionFilter,
    setTagFilter,
  };
}
