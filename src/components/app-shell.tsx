import { BarChart3, History, LineChart, PlusSquare, Settings2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
    { id: "stats", label: copy.tabs.stats, icon: LineChart },
    { id: "settings", label: copy.tabs.settings, icon: Settings2 },
  ] as const;

  return (
    <div className="min-h-screen">
      <aside className="terminal-sidebar fixed inset-y-0 left-0 z-20 flex w-[82px] flex-col overflow-hidden border-r border-white/10 px-3 py-4 text-slate-100 lg:w-[220px]">
          <div className="border-b border-white/10 pb-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-200/75">{copy.shell.eyebrow}</p>
            <h1 className="mt-2 hidden text-sm font-semibold leading-5 text-white lg:block">{copy.shell.title}</h1>
          </div>

          <nav className="mt-4 flex-1 space-y-1.5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[5px] border px-3 py-2 text-left text-[13px] transition",
                  activeTab === id
                    ? "border-cyan-400/30 bg-cyan-400/10 text-white"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                )}
                title={label}
              >
                <Icon size={16} />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-[11px] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
              <span className="hidden lg:inline">{copy.shell.offlineReady}</span>
            </div>
            <p className="mt-2 hidden text-[11px] leading-5 text-slate-400 lg:block">{copy.shell.portableBody}</p>
          </div>
      </aside>

      <div className="min-h-screen pl-[82px] lg:pl-[220px]">
        <div className="min-w-0 bg-background/55">
          <main className="min-h-screen p-3 md:p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
