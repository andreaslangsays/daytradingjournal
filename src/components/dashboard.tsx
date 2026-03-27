import { ArrowUpRight, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { DashboardMetrics, TradeRecord } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { EquityCurveChart, HeatMap, ScatterSummary } from "./charts";

export function Dashboard({ trades }: { trades: TradeRecord[] }) {
  const { copy, locale } = useI18n();
  const [sessionFilter, setSessionFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("");

  const filterOptions = useMemo(() => {
    const sessions = Array.from(new Set(trades.map((trade) => trade.sessionId))).filter(Boolean).sort();
    const days = Array.from(new Set(trades.map((trade) => trade.entryTimestamp.slice(0, 10)))).sort();
    const months = Array.from(new Set(trades.map((trade) => trade.entryTimestamp.slice(0, 7)))).sort();
    const tags = Array.from(new Set(trades.flatMap((trade) => trade.tags))).sort();
    const instruments = Array.from(new Set(trades.map((trade) => trade.instrument))).sort();
    return { sessions, days, months, tags, instruments };
  }, [trades]);

  const filteredTrades = useMemo(
    () =>
      trades.filter((trade) => {
        const matchesSession = !sessionFilter || trade.sessionId === sessionFilter;
        const matchesDay = !dayFilter || trade.entryTimestamp.slice(0, 10) === dayFilter;
        const matchesMonth = !monthFilter || trade.entryTimestamp.slice(0, 7) === monthFilter;
        const matchesTag = !tagFilter || trade.tags.includes(tagFilter);
        const matchesInstrument = !instrumentFilter || trade.instrument === instrumentFilter;
        return matchesSession && matchesDay && matchesMonth && matchesTag && matchesInstrument;
      }),
    [dayFilter, instrumentFilter, monthFilter, sessionFilter, tagFilter, trades],
  );

  const metrics = useMemo(() => buildMetrics(filteredTrades), [filteredTrades]);

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">{copy.dashboard.loading}</CardContent>
      </Card>
    );
  }

  const topTag = metrics.tagStats[0];
  const topTime = [...metrics.weekdayHeatmap].sort((left, right) => right.value - left.value)[0];
  const executionHealthy = metrics.expectancy >= 0 && metrics.profitFactor >= 1;
  const kpis = [
    { label: copy.dashboard.kpis.winRate.label, detail: copy.dashboard.kpis.winRate.detail, value: formatPercent(metrics.winRate, locale), icon: ArrowUpRight, tone: "text-success" },
    { label: copy.dashboard.kpis.expectancy.label, detail: copy.dashboard.kpis.expectancy.detail, value: formatCurrency(metrics.expectancy, locale), icon: Target, tone: "text-cyan-500" },
    { label: copy.dashboard.kpis.profitFactor.label, detail: copy.dashboard.kpis.profitFactor.detail, value: metrics.profitFactor.toFixed(2), icon: TrendingUp, tone: "text-foreground" },
    { label: copy.dashboard.kpis.maxDrawdown.label, detail: copy.dashboard.kpis.maxDrawdown.detail, value: formatCurrency(metrics.maxDrawdown, locale), icon: ShieldAlert, tone: "text-danger" },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardDescription className="text-foreground/65">{copy.dashboard.filterEyebrow}</CardDescription>
            <CardTitle className="mt-2 text-2xl text-foreground">{copy.dashboard.filterTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect value={sessionFilter} onChange={setSessionFilter} placeholder={copy.dashboard.filterSession} options={filterOptions.sessions} />
          <FilterSelect value={dayFilter} onChange={setDayFilter} placeholder={copy.dashboard.filterDay} options={filterOptions.days} />
          <FilterSelect value={monthFilter} onChange={setMonthFilter} placeholder={copy.dashboard.filterMonth} options={filterOptions.months} />
          <FilterSelect value={tagFilter} onChange={setTagFilter} placeholder={copy.dashboard.filterTag} options={filterOptions.tags} />
          <FilterSelect value={instrumentFilter} onChange={setInstrumentFilter} placeholder={copy.dashboard.filterInstrument} options={filterOptions.instruments} />
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div>
              <CardDescription className="text-foreground/65">{copy.dashboard.equityEyebrow}</CardDescription>
              <CardTitle className="mt-2 text-3xl text-foreground">{copy.dashboard.equityTitle}</CardTitle>
            </div>
            <Badge>{metrics.tradeCount} {copy.dashboard.tradesBadge}</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{copy.dashboard.equityText}</p>
            <EquityCurveChart data={metrics.equityCurve} locale={locale} labels={{ empty: copy.dashboard.noData, trajectory: copy.dashboard.balanceTrajectory, endBalance: copy.dashboard.endBalance, highWatermark: copy.dashboard.highWatermark, lowWatermark: copy.dashboard.lowWatermark }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardDescription className="text-foreground/65">{copy.dashboard.insightEyebrow}</CardDescription>
              <CardTitle className="mt-2 text-3xl text-foreground">{copy.dashboard.insightTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InsightCard label={copy.dashboard.insightCards.strongestTime} value={topTime ? topTime.bucket : copy.dashboard.insightCards.noTime} detail={topTime ? formatCurrency(topTime.value, locale) : copy.dashboard.noData} />
            <InsightCard label={copy.dashboard.insightCards.strongestTag} value={topTag ? topTag.label : copy.dashboard.insightCards.noTag} detail={topTag ? formatCurrency(topTag.pnl, locale) : copy.dashboard.noData} />
            <InsightCard label={copy.dashboard.insightCards.executionRead} value={executionHealthy ? copy.dashboard.heatPositive : copy.dashboard.heatNegative} detail={executionHealthy ? copy.dashboard.insightCards.executionGood : copy.dashboard.insightCards.executionWeak} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="items-start gap-4 pb-3">
              <kpi.icon className={kpi.tone} />
              <div className="space-y-2">
                <CardDescription className="text-foreground/65">{kpi.label}</CardDescription>
                <CardTitle className="text-3xl text-foreground">{kpi.value}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{kpi.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardDescription className="text-foreground/65">{copy.dashboard.maeMfeEyebrow}</CardDescription>
                <CardTitle className="mt-2 text-2xl text-foreground">{copy.dashboard.maeMfeTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{copy.dashboard.maeMfeText}</p>
              <ScatterSummary data={metrics.maeMfe} locale={locale} labels={{ empty: copy.dashboard.noData, bestTrade: copy.dashboard.bestTrade, worstTrade: copy.dashboard.worstTrade, efficiency: copy.dashboard.efficiency, mfeAxis: copy.dashboard.scatterMfe, maeAxis: copy.dashboard.scatterMae }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardDescription className="text-foreground/65">{copy.dashboard.timeEyebrow}</CardDescription>
                <CardTitle className="mt-2 text-2xl text-foreground">{copy.dashboard.timeTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{copy.dashboard.timeText}</p>
              <HeatMap data={metrics.weekdayHeatmap} locale={locale} labels={{ positive: copy.dashboard.heatPositive, negative: copy.dashboard.heatNegative, empty: copy.dashboard.noData }} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardDescription className="text-foreground/65">{copy.dashboard.matrixEyebrow}</CardDescription>
                <CardTitle className="mt-2 text-2xl text-foreground">{copy.dashboard.matrixTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <MetricRow label={copy.dashboard.metrics.avgWin.label} detail={copy.dashboard.metrics.avgWin.detail} value={formatCurrency(metrics.averageWin, locale)} positive />
              <MetricRow label={copy.dashboard.metrics.avgLoss.label} detail={copy.dashboard.metrics.avgLoss.detail} value={formatCurrency(metrics.averageLoss, locale)} />
              <MetricRow label={copy.dashboard.metrics.profitFactor.label} detail={copy.dashboard.metrics.profitFactor.detail} value={metrics.profitFactor.toFixed(2)} positive />
              <MetricRow label={copy.dashboard.metrics.expectancy.label} detail={copy.dashboard.metrics.expectancy.detail} value={formatCurrency(metrics.expectancy, locale)} positive={metrics.expectancy >= 0} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardDescription className="text-foreground/65">{copy.dashboard.tagEyebrow}</CardDescription>
                <CardTitle className="mt-2 text-2xl text-foreground">{copy.dashboard.tagTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">{copy.dashboard.tagText}</p>
              <div className="space-y-3">
                {metrics.tagStats.map((item) => (
                  <div key={item.label} className="grid gap-3 rounded-xl border border-border/80 bg-background/55 px-4 py-4 md:grid-cols-[minmax(0,1fr)_180px_140px]">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.count} {copy.dashboard.tagCountSuffix}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">PnL</p>
                      <p className={item.pnl >= 0 ? "mt-2 text-lg font-semibold text-success" : "mt-2 text-lg font-semibold text-danger"}>{formatCurrency(item.pnl, locale)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.dashboard.kpis.winRate.label}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatPercent((item.count / Math.max(metrics.tradeCount, 1)) * 100, locale)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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
      className="h-11 rounded-lg border border-border/80 bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
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
    <div className="grid gap-3 rounded-xl border border-border/80 bg-secondary px-4 py-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
      <p className={positive ? "text-right text-2xl font-semibold text-success" : "text-right text-2xl font-semibold text-foreground"}>{value}</p>
    </div>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-secondary px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}
