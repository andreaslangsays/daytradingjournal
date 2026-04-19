import { ArrowUpRight, ShieldAlert, Target, TrendingUp } from "lucide-react";
import type { DashboardMetrics } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { useI18n } from "@/lib/i18n";

export interface DashboardKpi {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  trend: string;
}

export interface DashboardInsight {
  strongestTimeLabel: string;
  strongestTimeValue: string;
  strongestTimeDetail: string;
  strongestTagLabel: string;
  strongestTagValue: string;
  strongestTagDetail: string;
  executionLabel: string;
  executionValue: string;
  executionDetail: string;
}

export function buildDashboardPresentationModel({
  copy,
  locale,
  metrics,
}: {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
}) {
  const topTag = metrics.tagStats[0];
  const topTime = [...metrics.weekdayHeatmap].sort((left, right) => right.value - left.value)[0];
  const executionHealthy = metrics.expectancy >= 0 && metrics.profitFactor >= 1;

  const kpis: DashboardKpi[] = [
    {
      label: copy.dashboard.kpis.winRate.label,
      value: formatPercent(metrics.winRate, locale),
      icon: ArrowUpRight,
      tone: "text-success",
      trend: metrics.winRate >= 50 ? "Stabil" : "Unter 50%",
    },
    {
      label: copy.dashboard.kpis.expectancy.label,
      value: formatCurrency(metrics.expectancy, locale),
      icon: Target,
      tone: "text-cyan-500",
      trend: metrics.expectancy >= 0 ? "Positiv" : "Negativ",
    },
    {
      label: copy.dashboard.kpis.profitFactor.label,
      value: metrics.profitFactor.toFixed(2),
      icon: TrendingUp,
      tone: "text-foreground",
      trend: metrics.profitFactor >= 1 ? "Robust" : "Druck",
    },
    {
      label: copy.dashboard.kpis.maxDrawdown.label,
      value: formatCurrency(metrics.maxDrawdown, locale),
      icon: ShieldAlert,
      tone: "text-danger",
      trend: "Risiko",
    },
  ];

  const insights: DashboardInsight = {
    strongestTimeLabel: copy.dashboard.insightCards.strongestTime,
    strongestTimeValue: topTime ? topTime.bucket : copy.dashboard.insightCards.noTime,
    strongestTimeDetail: topTime ? formatCurrency(topTime.value, locale) : copy.dashboard.noData,
    strongestTagLabel: copy.dashboard.insightCards.strongestTag,
    strongestTagValue: topTag ? topTag.label : copy.dashboard.insightCards.noTag,
    strongestTagDetail: topTag ? formatCurrency(topTag.pnl, locale) : copy.dashboard.noData,
    executionLabel: copy.dashboard.insightCards.executionRead,
    executionValue: executionHealthy ? copy.dashboard.heatPositive : copy.dashboard.heatNegative,
    executionDetail: executionHealthy ? copy.dashboard.insightCards.executionGood : copy.dashboard.insightCards.executionWeak,
  };

  return {
    executionHealthy,
    insights,
    kpis,
    topTag,
    topTime,
  };
}
