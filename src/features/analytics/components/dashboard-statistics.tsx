import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurveChart, HeatMap, ScatterSummary } from "@/components/charts";
import type { DashboardMetrics } from "@/lib/types";
import type { useI18n } from "@/lib/i18n";
import type { DashboardInsight } from "@/features/analytics/presentation/dashboard-view-model";
import { DashboardInsightsCard, DashboardMetricsMatrix, DashboardTagStatsCard } from "@/features/analytics/components/dashboard-primitives";

interface DashboardStatisticsProps {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
  insights: DashboardInsight;
}

export function DashboardStatistics({ copy, locale, metrics, insights }: DashboardStatisticsProps) {
  return (
    <div className="grid gap-3 2xl:grid-cols-[1.25fr_1fr]">
      <div className="grid gap-3">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
          <Card className="shadow-none">
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

          <DashboardInsightsCard eyebrow={copy.dashboard.insightEyebrow} title={copy.dashboard.insightTitle} insights={insights} />
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <div>
              <CardDescription>{copy.dashboard.maeMfeEyebrow}</CardDescription>
              <CardTitle className="mt-1 text-base">{copy.dashboard.maeMfeTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScatterSummary data={metrics.maeMfe} locale={locale} labels={{ empty: copy.dashboard.noData, bestTrade: copy.dashboard.bestTrade, worstTrade: copy.dashboard.worstTrade, efficiency: copy.dashboard.efficiency, mfeAxis: copy.dashboard.scatterMfe, maeAxis: copy.dashboard.scatterMae }} />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <div>
              <CardDescription>{copy.dashboard.timeEyebrow}</CardDescription>
              <CardTitle className="mt-1 text-base">{copy.dashboard.timeTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <HeatMap data={metrics.weekdayHeatmap} locale={locale} labels={{ positive: copy.dashboard.heatPositive, negative: copy.dashboard.heatNegative, empty: copy.dashboard.noData }} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3">
        <DashboardMetricsMatrix copy={copy} locale={locale} metrics={metrics} includeExpectancy />
        <DashboardTagStatsCard copy={copy} locale={locale} metrics={metrics} />
      </div>
    </div>
  );
}
