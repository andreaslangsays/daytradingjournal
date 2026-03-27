import { BarChart3, History, LineChart, PlusSquare, Settings2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AppShellProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentJournal: string;
  tradeCount: number;
  sessionCount: number;
  statusMessage: string;
  topBarActions: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  activeTab,
  onTabChange,
  currentJournal,
  tradeCount,
  sessionCount,
  statusMessage,
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
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-r border-border bg-card">
          <div className="flex h-11 items-center gap-2 border-b border-border px-3">
            <div className="h-4 w-1 rounded-[2px] bg-primary" />
            <span className="truncate text-[12px] font-semibold tracking-wide text-foreground">{copy.shell.title}</span>
          </div>

          <nav className="py-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={cn(
                  "relative flex h-9 w-full items-center gap-2 pl-5 pr-3 text-left text-[12px] transition-colors",
                  activeTab === id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full w-px bg-transparent",
                    activeTab === id && "bg-primary",
                  )}
                />
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="grid min-h-screen grid-rows-[44px_minmax(0,1fr)_24px]">
          <header className="border-b border-border bg-background">
            <div className="flex h-11 items-center justify-between gap-3 px-3">
              <div className="min-w-0">
                <span className="truncate text-[11px] text-muted-foreground">{currentJournal}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">{topBarActions}</div>
            </div>
          </header>

          <main className="min-h-0 px-2 py-2">{children}</main>

          <footer className="border-t border-border bg-background">
            <div className="flex h-6 items-center justify-between gap-3 px-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {copy.shell.offlineReady}
                </span>
                <span className="truncate">{statusMessage}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Trades {tradeCount}</span>
                <span>Sessions {sessionCount}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
