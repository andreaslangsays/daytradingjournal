import { DashboardFilterBar } from "@/features/analytics/components/dashboard-filter-bar";
import { DashboardOverview } from "@/features/analytics/components/dashboard-overview";
import { DashboardStatistics } from "@/features/analytics/components/dashboard-statistics";
import { useDashboardPresentation } from "@/features/analytics/hooks/use-dashboard-presentation";
import { useDashboardState } from "@/features/analytics/hooks/use-dashboard-state";
import { useI18n } from "@/lib/i18n";
import type { TradeRecord } from "@/lib/types";

export function Dashboard({ trades, variant = "stats" }: { trades: TradeRecord[]; variant?: "overview" | "stats" }) {
  const { copy, locale } = useI18n();
  const dashboardState = useDashboardState(trades);
  const presentation = useDashboardPresentation({
    copy,
    locale,
    metrics: dashboardState.metrics,
  });

  return (
    <div className="space-y-4">
      <DashboardFilterBar
        copy={copy}
        filterOptions={dashboardState.filterOptions}
        filteredTradeCount={dashboardState.filteredTrades.length}
        values={{
          session: dashboardState.sessionFilter,
          day: dashboardState.dayFilter,
          month: dashboardState.monthFilter,
          tag: dashboardState.tagFilter,
          instrument: dashboardState.instrumentFilter,
          account: dashboardState.accountFilter,
        }}
        onChange={{
          setSession: dashboardState.setSessionFilter,
          setDay: dashboardState.setDayFilter,
          setMonth: dashboardState.setMonthFilter,
          setTag: dashboardState.setTagFilter,
          setInstrument: dashboardState.setInstrumentFilter,
          setAccount: dashboardState.setAccountFilter,
        }}
      />

      {variant === "overview" ? (
        <DashboardOverview
          copy={copy}
          locale={locale}
          metrics={dashboardState.metrics}
          insights={presentation.insights}
          kpis={presentation.kpis}
        />
      ) : (
        <DashboardStatistics
          copy={copy}
          locale={locale}
          metrics={dashboardState.metrics}
          insights={presentation.insights}
        />
      )}
    </div>
  );
}
