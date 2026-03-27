import { BarChart3, History, LineChart, PlusSquare, Settings2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AppShellProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentJournal: string;
  tradeCount: number;
  sessionCount: number;
  topBarActions: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  activeTab,
  onTabChange,
  currentJournal,
  tradeCount,
  sessionCount,
  topBarActions,
  children,
}: AppShellProps) {
  const { copy } = useI18n();
  const tabs = [
    { id: "dashboard", label: copy.tabs.dashboard, icon: BarChart3 },
    { id: "trades", label: copy.tabs.trades, icon: History },
    { id: "new", label: copy.tabs.new, icon: PlusSquare },
    { id: "stats", label: copy.tabs.stats, icon: LineChart },
    { id: "settings", label: copy.tabs.settings, icon: Settings2 },
  ] as const;

  return (
    <div className="min-h-screen bg-background/60">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/96 backdrop-blur-sm">
        <div className="flex h-11 items-center justify-between gap-3 px-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2 border-r border-border/70 pr-3">
              <div className="h-4 w-4 rounded-[3px] border border-primary/40 bg-primary/15" />
              <span className="truncate text-[12px] font-semibold tracking-wide text-foreground">{copy.shell.title}</span>
            </div>

            <nav className="flex min-w-0 items-center gap-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2.5 text-[12px] transition",
                    activeTab === id
                      ? "border-border bg-secondary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/55 hover:text-foreground",
                  )}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 items-center gap-2 border-r border-border/70 pr-3 xl:flex">
              <span className="truncate text-[11px] text-muted-foreground">{currentJournal}</span>
            </div>
            {topBarActions}
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-68px)] px-2 py-2">{children}</main>

      <footer className="sticky bottom-0 z-20 border-t border-border/80 bg-background/96">
        <div className="flex h-6 items-center justify-between gap-3 px-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {copy.shell.offlineReady}
            </span>
            <span>Journal geladen</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Trades {tradeCount}</span>
            <span>Sessions {sessionCount}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
