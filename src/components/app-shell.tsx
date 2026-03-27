import { BarChart3, FileSpreadsheet, History, PlusSquare, Settings2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface AppShellProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  const { copy } = useI18n();
  const tabs = [
    { id: "dashboard", label: copy.tabs.dashboard, icon: BarChart3 },
    { id: "trades", label: copy.tabs.trades, icon: History },
    { id: "new", label: copy.tabs.new, icon: PlusSquare },
    { id: "csv", label: copy.tabs.csv, icon: FileSpreadsheet },
    { id: "settings", label: copy.tabs.settings, icon: Settings2 },
  ] as const;

  return (
    <div className="min-h-screen p-5 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="glass rounded-2xl border border-border/80 p-4 shadow-glow">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="rounded-xl border border-border/70 bg-mesh px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/62">{copy.shell.eyebrow}</p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">{copy.shell.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.shell.subtitle}</p>
            </div>

            <nav className="flex flex-wrap gap-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition",
                    activeTab === id
                      ? "border-border bg-secondary text-foreground"
                      : "border-border/70 bg-background/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="rounded-xl border border-border/70 bg-background/50 px-4 py-3">
              <p className="text-sm font-medium">{copy.shell.portableTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{copy.shell.portableBody}</p>
              <Button className="mt-3" variant="secondary">
                {copy.shell.offlineReady}
              </Button>
            </div>
          </div>
        </section>

        <main className="space-y-5">
          {children}
        </main>
      </div>
    </div>
  );
}
