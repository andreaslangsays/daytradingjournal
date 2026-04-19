import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurveChart } from "@/components/charts";
import type { DashboardMetrics } from "@/lib/types";
import type { useI18n } from "@/lib/i18n";
import type { DashboardInsight, DashboardKpi } from "@/features/analytics/presentation/dashboard-view-model";
import { DashboardInsightsCard, DashboardKpiGrid, DashboardMetricsMatrix } from "@/features/analytics/components/dashboard-primitives";

interface DashboardOverviewProps {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
  insights: DashboardInsight;
  kpis: DashboardKpi[];
}

export function DashboardOverview({ copy, locale, metrics, insights, kpis }: DashboardOverviewProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
      <div className="grid gap-3 md:grid-cols-2">
        <DashboardKpiGrid items={kpis} />

        <Card className="shadow-none md:col-span-2">
          <CardHeader className="pb-2">
            <div>
              <CardDescription>{copy.dashboard.equityEyebrow}</CardDescription>
              <CardTitle className="mt-1 text-base">{copy.dashboard.equityTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <EquityCurveChart
              data={metrics.equityCurve}
              locale={locale}
              labels={{
                empty: copy.dashboard.noData,
                trajectory: copy.dashboard.balanceTrajectory,
                endBalance: copy.dashboard.endBalance,
                highWatermark: copy.dashboard.highWatermark,
                lowWatermark: copy.dashboard.lowWatermark,
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3">
        <DashboardInsightsCard eyebrow={copy.dashboard.insightEyebrow} title={copy.dashboard.insightTitle} insights={insights} />
        <DashboardMetricsMatrix copy={copy} locale={locale} metrics={metrics} />
      </div>
    </div>
  );
}
