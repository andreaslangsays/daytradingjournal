import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardFilterOptions } from "@/features/analytics/domain/dashboard-filters";
import type { useI18n } from "@/lib/i18n";

interface DashboardFilterBarProps {
  copy: ReturnType<typeof useI18n>["copy"];
  filterOptions: DashboardFilterOptions;
  filteredTradeCount: number;
  values: {
    session: string;
    day: string;
    month: string;
    tag: string;
    instrument: string;
    account: string;
  };
  onChange: {
    setSession: (value: string) => void;
    setDay: (value: string) => void;
    setMonth: (value: string) => void;
    setTag: (value: string) => void;
    setInstrument: (value: string) => void;
    setAccount: (value: string) => void;
  };
}

export function DashboardFilterBar({ copy, filterOptions, filteredTradeCount, values, onChange }: DashboardFilterBarProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <div>
          <CardDescription className="text-foreground/65">{copy.dashboard.filterEyebrow}</CardDescription>
          <CardTitle className="mt-1 text-base text-foreground">{copy.dashboard.filterTitle}</CardTitle>
        </div>
        <Badge>{filteredTradeCount} {copy.dashboard.tradesBadge}</Badge>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
        <FilterSelect value={values.session} onChange={onChange.setSession} placeholder={copy.dashboard.filterSession} options={filterOptions.sessions} />
        <FilterSelect value={values.day} onChange={onChange.setDay} placeholder={copy.dashboard.filterDay} options={filterOptions.days} />
        <FilterSelect value={values.month} onChange={onChange.setMonth} placeholder={copy.dashboard.filterMonth} options={filterOptions.months} />
        <FilterSelect value={values.tag} onChange={onChange.setTag} placeholder={copy.dashboard.filterTag} options={filterOptions.tags} />
        <FilterSelect value={values.instrument} onChange={onChange.setInstrument} placeholder={copy.dashboard.filterInstrument} options={filterOptions.instruments} />
        <FilterSelect value={values.account} onChange={onChange.setAccount} placeholder="Konto" options={filterOptions.accounts} />
      </CardContent>
    </Card>
  );
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
