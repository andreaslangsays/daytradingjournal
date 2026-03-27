import { formatCurrency } from "@/lib/utils";

export function EquityCurveChart({
  data,
  locale,
  labels,
}: {
  data: Array<{ label: string; balance: number }>;
  locale: string;
  labels: {
    empty: string;
    trajectory: string;
    endBalance: string;
    highWatermark: string;
    lowWatermark: string;
  };
}) {
  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">{labels.empty}</div>;
  }

  const values = data.map((point) => point.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const ending = values[values.length - 1];

  const path = data
    .map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((point.balance - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_320px]">
      <div className="rounded-2xl border border-border/80 bg-secondary/75 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{labels.trajectory}</span>
          <span className="text-xl font-semibold">{formatCurrency(ending, locale)}</span>
        </div>
        <svg viewBox="0 0 100 100" className="mt-4 h-72 w-full overflow-visible">
          <defs>
            <linearGradient id="equity-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <path d={path} fill="none" stroke="url(#equity-gradient)" strokeWidth="2.8" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="grid gap-3">
        <SummaryMetric label={labels.endBalance} value={formatCurrency(ending, locale)} />
        <SummaryMetric label={labels.highWatermark} value={formatCurrency(max, locale)} tone="text-success" />
        <SummaryMetric label={labels.lowWatermark} value={formatCurrency(min, locale)} tone={min < 0 ? "text-danger" : "text-foreground"} />
      </div>
    </div>
  );
}

export function HeatMap({
  data,
  locale,
  labels,
}: {
  data: Array<{ bucket: string; value: number }>;
  locale: string;
  labels: { positive: string; negative: string; empty: string };
}) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{labels.empty}</div>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.map((cell) => {
        const opacity = Math.max(0.15, Math.min(Math.abs(cell.value) / 500, 1));
        const positive = cell.value >= 0;
        return (
          <div
            key={cell.bucket}
            className="rounded-[5px] border border-border/80 p-4"
            style={{ backgroundColor: positive ? `rgba(16, 185, 129, ${opacity * 0.78})` : `rgba(239, 68, 68, ${opacity * 0.74})` }}
          >
            <p className="text-xs uppercase tracking-wide text-foreground/72">{cell.bucket}</p>
            <p className="mt-3 text-2xl font-semibold text-foreground">{formatCurrency(cell.value, locale)}</p>
            <p className="mt-2 max-w-[22rem] text-sm text-foreground/78">{positive ? labels.positive : labels.negative}</p>
          </div>
        );
      })}
    </div>
  );
}

export function ScatterSummary({
  data,
  locale,
  labels,
}: {
  data: Array<{ tradeId: string; mae: number; mfe: number; pnl: number }>;
  locale: string;
  labels: {
    empty: string;
    bestTrade: string;
    worstTrade: string;
    efficiency: string;
    mfeAxis: string;
    maeAxis: string;
  };
}) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{labels.empty}</div>;
  }

  const safe = data.slice(0, 24);
  const sorted = [...safe].sort((left, right) => right.pnl - left.pnl);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
      <div className="relative h-72 rounded-2xl border border-border/80 bg-secondary">
        {safe.map((point) => {
          const left = `${Math.min(90, Math.max(4, ((point.mfe + 10) / 20) * 100))}%`;
          const top = `${Math.min(88, Math.max(4, 100 - ((point.mae + 10) / 20) * 100))}%`;
          return (
            <div
              key={point.tradeId}
              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
              style={{
                left,
                top,
                backgroundColor: point.pnl >= 0 ? "#10b981" : "#ef4444",
              }}
              title={`${point.tradeId}: ${point.pnl.toFixed(2)}`}
            />
          );
        })}
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">{labels.mfeAxis}</div>
        <div className="absolute left-3 top-3 max-w-24 text-xs text-muted-foreground">{labels.maeAxis}</div>
      </div>
      <div className="grid gap-3">
        <SummaryMetric label={labels.bestTrade} value={formatCurrency(best.pnl, locale)} tone="text-success" />
        <SummaryMetric label={labels.worstTrade} value={formatCurrency(worst.pnl, locale)} tone="text-danger" />
        <SummaryMetric
          label={labels.efficiency}
          value={`${((safe.filter((point) => point.pnl >= 0).length / safe.length) * 100).toFixed(0)}%`}
        />
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[5px] border border-border/80 bg-background/55 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
