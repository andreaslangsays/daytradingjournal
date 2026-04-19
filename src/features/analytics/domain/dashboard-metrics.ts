import type { DashboardMetrics, TradeRecord } from "@/lib/types";

export function buildDashboardMetrics(trades: TradeRecord[]): DashboardMetrics {
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
