import { ArrowUpRight, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { DashboardMetrics, TradeRecord } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { EquityCurveChart, HeatMap, ScatterSummary } from "./charts";

export function Dashboard({ trades, variant = "stats" }: { trades: TradeRecord[]; variant?: "overview" | "stats" }) {
  const { copy, locale } = useI18n();
  const [sessionFilter, setSessionFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const filterOptions = useMemo(() => {
    const sessions = Array.from(new Set(trades.map((trade) => trade.sessionId))).filter(Boolean).sort();
    const days = Array.from(new Set(trades.map((trade) => trade.entryTimestamp.slice(0, 10)))).sort();
    const months = Array.from(new Set(trades.map((trade) => trade.entryTimestamp.slice(0, 7)))).sort();
    const tags = Array.from(new Set(trades.flatMap((trade) => trade.tags))).sort();
    const instruments = Array.from(new Set(trades.map((trade) => trade.instrument))).sort();
    const accounts = Array.from(new Set(trades.map((trade) => trade.account).filter(Boolean))).sort();
    return { sessions, days, months, tags, instruments, accounts };
  }, [trades]);

  const filteredTrades = useMemo(
    () =>
      trades.filter((trade) => {
        const matchesSession = !sessionFilter || trade.sessionId === sessionFilter;
        const matchesDay = !dayFilter || trade.entryTimestamp.slice(0, 10) === dayFilter;
        const matchesMonth = !monthFilter || trade.entryTimestamp.slice(0, 7) === monthFilter;
        const matchesTag = !tagFilter || trade.tags.includes(tagFilter);
        const matchesInstrument = !instrumentFilter || trade.instrument === instrumentFilter;
        const matchesAccount = !accountFilter || trade.account === accountFilter;
        return matchesSession && matchesDay && matchesMonth && matchesTag && matchesInstrument && matchesAccount;
      }),
    [accountFilter, dayFilter, instrumentFilter, monthFilter, sessionFilter, tagFilter, trades],
  );

  const metrics = useMemo(() => buildMetrics(filteredTrades), [filteredTrades]);

  const topTag = metrics.tagStats[0];
  const topTime = [...metrics.weekdayHeatmap].sort((left, right) => right.value - left.value)[0];
  const executionHealthy = metrics.expectancy >= 0 && metrics.profitFactor >= 1;
  const kpis = [
    { label: copy.dashboard.kpis.winRate.label, value: formatPercent(metrics.winRate, locale), icon: ArrowUpRight, tone: "text-success", trend: metrics.winRate >= 50 ? "Stabil" : "Unter 50%" },
    { label: copy.dashboard.kpis.expectancy.label, value: formatCurrency(metrics.expectancy, locale), icon: Target, tone: "text-cyan-500", trend: metrics.expectancy >= 0 ? "Positiv" : "Negativ" },
    { label: copy.dashboard.kpis.profitFactor.label, value: metrics.profitFactor.toFixed(2), icon: TrendingUp, tone: "text-foreground", trend: metrics.profitFactor >= 1 ? "Robust" : "Druck" },
    { label: copy.dashboard.kpis.maxDrawdown.label, value: formatCurrency(metrics.maxDrawdown, locale), icon: ShieldAlert, tone: "text-danger", trend: "Risiko" },
  ];

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <div>
            <CardDescription className="text-foreground/65">{copy.dashboard.filterEyebrow}</CardDescription>
            <CardTitle className="mt-1 text-base text-foreground">{copy.dashboard.filterTitle}</CardTitle>
          </div>
          <Badge>{filteredTrades.length} {copy.dashboard.tradesBadge}</Badge>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <FilterSelect value={sessionFilter} onChange={setSessionFilter} placeholder={copy.dashboard.filterSession} options={filterOptions.sessions} />
          <FilterSelect value={dayFilter} onChange={setDayFilter} placeholder={copy.dashboard.filterDay} options={filterOptions.days} />
          <FilterSelect value={monthFilter} onChange={setMonthFilter} placeholder={copy.dashboard.filterMonth} options={filterOptions.months} />
          <FilterSelect value={tagFilter} onChange={setTagFilter} placeholder={copy.dashboard.filterTag} options={filterOptions.tags} />
          <FilterSelect value={instrumentFilter} onChange={setInstrumentFilter} placeholder={copy.dashboard.filterInstrument} options={filterOptions.instruments} />
          <FilterSelect value={accountFilter} onChange={setAccountFilter} placeholder="Konto" options={filterOptions.accounts} />
        </CardContent>
      </Card>

      {variant === "overview" ? (
        <OverviewGrid
          copy={copy}
          locale={locale}
          metrics={metrics}
          kpis={kpis}
          topTag={topTag}
          topTime={topTime}
          executionHealthy={executionHealthy}
        />
      ) : (
        <StatisticsGrid
          copy={copy}
          locale={locale}
          metrics={metrics}
          topTag={topTag}
          topTime={topTime}
          executionHealthy={executionHealthy}
        />
      )}
    </div>
  );
}

function OverviewGrid({
  copy,
  locale,
  metrics,
  kpis,
  topTag,
  topTime,
  executionHealthy,
}: {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
  kpis: Array<{ label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: string; trend: string }>;
  topTag?: { label: string; count: number; pnl: number };
  topTime?: { bucket: string; value: number };
  executionHealthy: boolean;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
      <div className="grid gap-3 md:grid-cols-2">
        {kpis.map((kpi) => (
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
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <div>
              <CardDescription>{copy.dashboard.insightEyebrow}</CardDescription>
              <CardTitle className="mt-1 text-base">{copy.dashboard.insightTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            <InsightCard label={copy.dashboard.insightCards.strongestTime} value={topTime ? topTime.bucket : copy.dashboard.insightCards.noTime} detail={topTime ? formatCurrency(topTime.value, locale) : copy.dashboard.noData} />
            <InsightCard label={copy.dashboard.insightCards.strongestTag} value={topTag ? topTag.label : copy.dashboard.insightCards.noTag} detail={topTag ? formatCurrency(topTag.pnl, locale) : copy.dashboard.noData} />
            <InsightCard label={copy.dashboard.insightCards.executionRead} value={executionHealthy ? copy.dashboard.heatPositive : copy.dashboard.heatNegative} detail={executionHealthy ? copy.dashboard.insightCards.executionGood : copy.dashboard.insightCards.executionWeak} />
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatisticsGrid({
  copy,
  locale,
  metrics,
  topTag,
  topTime,
  executionHealthy,
}: {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
  topTag?: { label: string; count: number; pnl: number };
  topTime?: { bucket: string; value: number };
  executionHealthy: boolean;
}) {
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

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <div>
                <CardDescription>{copy.dashboard.insightEyebrow}</CardDescription>
                <CardTitle className="mt-1 text-base">{copy.dashboard.insightTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              <InsightCard label={copy.dashboard.insightCards.strongestTime} value={topTime ? topTime.bucket : copy.dashboard.insightCards.noTime} detail={topTime ? formatCurrency(topTime.value, locale) : copy.dashboard.noData} />
              <InsightCard label={copy.dashboard.insightCards.strongestTag} value={topTag ? topTag.label : copy.dashboard.insightCards.noTag} detail={topTag ? formatCurrency(topTag.pnl, locale) : copy.dashboard.noData} />
              <InsightCard label={copy.dashboard.insightCards.executionRead} value={executionHealthy ? copy.dashboard.heatPositive : copy.dashboard.heatNegative} detail={executionHealthy ? copy.dashboard.insightCards.executionGood : copy.dashboard.insightCards.executionWeak} />
            </CardContent>
          </Card>
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
            <MetricRow label={copy.dashboard.metrics.expectancy.label} detail={copy.dashboard.metrics.expectancy.detail} value={formatCurrency(metrics.expectancy, locale)} positive={metrics.expectancy >= 0} />
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}

function buildMetrics(trades: TradeRecord[]): DashboardMetrics {
  const tradeCount = trades.length;
  const wins = trades.filter((trade) => trade.netPnl > 0);
  const losses = trades.filter((trade) => trade.netPnl < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.netPnl, 0);
  const grossLoss = losses.reduce((sum, trade) => sum + Math.abs(trade.netPnl), 0);
  const totalPnl = trades.reduce((sum, trade) => sum + trade.netPnl, 0);

  let running = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const chronological = [...trades].sort((a, b) => a.exitTimestamp.localeCompare(b.exitTimestamp));
  const equityCurve = chronological.map((trade) => {
    running += trade.netPnl;
    peak = Math.max(peak, running);
    maxDrawdown = Math.min(maxDrawdown, running - peak);
    return { label: trade.exitTimestamp, balance: running };
  });

  const weekdayHeatmap = Array.from(
    trades.reduce((map, trade) => {
      const date = new Date(trade.entryTimestamp);
      const label = `${date.toLocaleDateString("en-US", { weekday: "short" })} ${String(date.getHours()).padStart(2, "0")}:00`;
      map.set(label, (map.get(label) ?? 0) + trade.netPnl);
      return map;
    }, new Map<string, number>()),
  )
    .map(([bucket, value]) => ({ bucket, value }))
    .slice(0, 12);

  const tagStats = Array.from(
    trades.reduce((map, trade) => {
      for (const tag of trade.tags) {
        const current = map.get(tag) ?? { label: tag, count: 0, pnl: 0 };
        current.count += 1;
        current.pnl += trade.netPnl;
        map.set(tag, current);
      }
      return map;
    }, new Map<string, { label: string; count: number; pnl: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  return {
    accountBalance: totalPnl,
    equityCurve,
    winRate: tradeCount === 0 ? 0 : (wins.length / tradeCount) * 100,
    averageWin: wins.length === 0 ? 0 : grossProfit / wins.length,
    averageLoss: losses.length === 0 ? 0 : -grossLoss / losses.length,
    profitFactor: grossLoss === 0 ? grossProfit : grossProfit / grossLoss,
    expectancy: tradeCount === 0 ? 0 : totalPnl / tradeCount,
    tradeCount,
    maxDrawdown,
    maeMfe: trades.map((trade) => ({ tradeId: trade.id, mae: trade.mae ?? 0, mfe: trade.mfe ?? 0, pnl: trade.netPnl })),
    weekdayHeatmap,
    tagStats,
  };
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-[5px] border border-border/80 bg-secondary px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
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
