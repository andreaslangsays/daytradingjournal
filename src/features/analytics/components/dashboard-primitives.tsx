import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";
import type { useI18n } from "@/lib/i18n";
import type { DashboardInsight, DashboardKpi } from "@/features/analytics/presentation/dashboard-view-model";

export function DashboardKpiGrid({ items }: { items: DashboardKpi[] }) {
  return (
    <>
      {items.map((kpi) => (
        <Card key={kpi.label} className="shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardDescription>{kpi.label}</CardDescription>
              <kpi.icon className={kpi.tone} />
            </div>
            <CardTitle className={`metric-value text-[26px] ${kpi.tone}`}>{kpi.value}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{kpi.trend}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function DashboardInsightsCard({
  eyebrow,
  title,
  insights,
}: {
  eyebrow: string;
  title: string;
  insights: DashboardInsight;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <div>
          <CardDescription>{eyebrow}</CardDescription>
          <CardTitle className="mt-1 text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <InsightCard label={insights.strongestTimeLabel} value={insights.strongestTimeValue} detail={insights.strongestTimeDetail} />
        <InsightCard label={insights.strongestTagLabel} value={insights.strongestTagValue} detail={insights.strongestTagDetail} />
        <InsightCard label={insights.executionLabel} value={insights.executionValue} detail={insights.executionDetail} />
      </CardContent>
    </Card>
  );
}

export function DashboardMetricsMatrix({
  copy,
  locale,
  metrics,
  includeExpectancy = false,
}: {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
  includeExpectancy?: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <div>
          <CardDescription>{copy.dashboard.matrixEyebrow}</CardDescription>
          <CardTitle className="mt-1 text-base">{copy.dashboard.matrixTitle}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <MetricRow label={copy.dashboard.metrics.avgWin.label} detail={copy.dashboard.metrics.avgWin.detail} value={formatCurrency(metrics.averageWin, locale)} positive />
        <MetricRow label={copy.dashboard.metrics.avgLoss.label} detail={copy.dashboard.metrics.avgLoss.detail} value={formatCurrency(metrics.averageLoss, locale)} />
        <MetricRow label={copy.dashboard.metrics.profitFactor.label} detail={copy.dashboard.metrics.profitFactor.detail} value={metrics.profitFactor.toFixed(2)} positive />
        {includeExpectancy ? (
          <MetricRow label={copy.dashboard.metrics.expectancy.label} detail={copy.dashboard.metrics.expectancy.detail} value={formatCurrency(metrics.expectancy, locale)} positive={metrics.expectancy >= 0} />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DashboardTagStatsCard({
  copy,
  locale,
  metrics,
}: {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <div>
          <CardDescription>{copy.dashboard.tagEyebrow}</CardDescription>
          <CardTitle className="mt-1 text-base">{copy.dashboard.tagTitle}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2">
          {metrics.tagStats.map((item) => (
            <div key={item.label} className="grid gap-2 rounded-[5px] border border-border/80 bg-background/55 px-3 py-3 md:grid-cols-[minmax(0,1fr)_110px_90px]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.count} {copy.dashboard.tagCountSuffix}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">PnL</p>
                <p className={`metric-value mt-1 text-base font-semibold ${item.pnl >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(item.pnl, locale)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{copy.dashboard.kpis.winRate.label}</p>
                <p className="metric-value mt-1 text-base font-semibold text-foreground">{formatPercent((item.count / Math.max(metrics.tradeCount, 1)) * 100, locale)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, detail, value, positive }: { label: string; detail: string; value: string; positive?: boolean }) {
  return (
    <div className="grid gap-2 rounded-[5px] border border-border/80 bg-secondary px-3 py-3 md:grid-cols-[minmax(0,1fr)_140px] md:items-center">
      <div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
      <p className={positive ? "metric-value text-right text-xl font-semibold text-success" : "metric-value text-right text-xl font-semibold text-foreground"}>{value}</p>
    </div>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[5px] border border-border/80 bg-secondary px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
