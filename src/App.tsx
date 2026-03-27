import { useEffect, useMemo, useState, useTransition } from "react";
import { Moon, RefreshCw, Sun } from "lucide-react";
import { AppShell } from "./components/app-shell";
import { CsvPanel } from "./components/csv-panel";
import { Dashboard } from "./components/dashboard";
import { SettingsScreen } from "./components/settings-screen";
import { TradeForm } from "./components/trade-form";
import { TradeHistory } from "./components/trade-history";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { getDictionary, I18nContext } from "./lib/i18n";
import { addSessionScreenshotBytes, addTradeScreenshotBytes, clearJournal, deleteTagDefinition, executeCsvImport, exportCsv, getAppPreferences, listTagDefinitions, listTrades, openJournal, previewCsvImport, saveAppPreferences, saveJournal, saveTagDefinition, saveTrade } from "./lib/tauri";
import type { AppPreferences, CsvPreview, LanguageCode, PendingScreenshot, ThemeMode, TradeRecord, TradeTag } from "./lib/types";

const defaultPreferences: AppPreferences = {
  language: "de",
  activeTab: "dashboard",
  theme: "light",
};

export default function App() {
  const [activeTab, setActiveTab] = useState(defaultPreferences.activeTab);
  const [language, setLanguageState] = useState<LanguageCode>(defaultPreferences.language);
  const [theme, setThemeState] = useState<ThemeMode>(defaultPreferences.theme);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [currentJournal, setCurrentJournal] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();

  const preferences = useMemo<AppPreferences>(() => ({ language, activeTab, theme }), [activeTab, language, theme]);
  const dictionary = useMemo(() => getDictionary(language), [language]);

  const refresh = async () => {
    const [tradeRows, tagRows] = await Promise.all([
      listTrades(),
      listTagDefinitions(),
    ]);
    setTrades(tradeRows);
    setTags(tagRows);
  };

  useEffect(() => {
    startTransition(() => {
      void (async () => {
        const [tradeRows, savedPreferences, tagRows] = await Promise.all([
          listTrades(),
          getAppPreferences(),
          listTagDefinitions(),
        ]);
        setTrades(tradeRows);
        setTags(tagRows);
        setLanguageState(savedPreferences.language);
        setThemeState(savedPreferences.theme as ThemeMode);
        setActiveTab(savedPreferences.activeTab === "analysis" ? "dashboard" : savedPreferences.activeTab);
        setHydrated(true);
      })();
    });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    document.documentElement.lang = language;
    document.documentElement.classList.toggle("dark", theme === "dark");
    void saveAppPreferences(preferences);
  }, [hydrated, language, preferences, theme]);

  const handleSaveTrade = async (payload: Partial<TradeRecord>) => {
    const savedTrade = await saveTrade(payload);
    await refresh();
    setActiveTab("trades");
    return savedTrade;
  };

  const handleAttachScreenshots = async (tradeId: string, screenshots: PendingScreenshot[]) => {
    await Promise.all(
      screenshots.map((shot) =>
        addTradeScreenshotBytes(tradeId, shot.bytes, shot.description || undefined, shot.fileName),
      ),
    );
    await refresh();
  };

  const handleAttachSessionScreenshots = async (sessionId: string, screenshots: PendingScreenshot[]) => {
    await Promise.all(
      screenshots.map((shot) =>
        addSessionScreenshotBytes(sessionId, shot.bytes, shot.description || undefined, shot.fileName),
      ),
    );
    await refresh();
  };

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
  };

  const toggleTheme = () => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        locale: dictionary.locale,
        copy: dictionary,
        preferences,
        setLanguage,
      }}
    >
      <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
        <header className="glass flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border/80 px-4 py-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/55">{dictionary.app.currentJournal}</p>
            <p className="truncate text-sm font-medium text-foreground">{currentJournal || dictionary.app.defaultJournal}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2" size={16} /> : <Moon className="mr-2" size={16} />}
              {theme === "dark" ? dictionary.app.themeLight : dictionary.app.themeDark}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const path = await openJournal();
                setCurrentJournal(path.split(/[\\/]/).pop() || path);
                await refresh();
              }}
            >
              {dictionary.app.openJournal}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const path = await saveJournal();
                setCurrentJournal(path.split(/[\\/]/).pop() || path);
              }}
            >
              {dictionary.app.saveJournal}
            </Button>
            <Button onClick={() => void refresh()}>
              <RefreshCw className="mr-2" size={16} />
              {dictionary.app.refresh}
            </Button>
          </div>
        </header>

        {pending ? (
          <Card>
            <CardContent className="py-3 text-sm text-muted-foreground">{dictionary.app.refreshing}</CardContent>
          </Card>
        ) : null}

        {activeTab === "dashboard" ? <Dashboard trades={trades} variant="overview" /> : null}
        {activeTab === "trades" ? <TradeHistory trades={trades} /> : null}
        {activeTab === "new" ? (
          <TradeForm
            onSubmit={handleSaveTrade}
            availableTags={tags}
            onAttachScreenshots={handleAttachScreenshots}
            onAttachSessionScreenshots={handleAttachSessionScreenshots}
          />
        ) : null}
        {activeTab === "stats" ? <Dashboard trades={trades} variant="stats" /> : null}
        {activeTab === "settings" ? (
          <div className="grid gap-4">
            <SettingsScreen
              language={language}
              onLanguageChange={setLanguage}
              theme={theme}
              onThemeChange={setThemeState}
              tags={tags}
              onSaveTag={async (tag) => {
                await saveTagDefinition(tag);
                await refresh();
              }}
              onDeleteTag={async (tagId) => {
                await deleteTagDefinition(tagId);
                await refresh();
              }}
              onClearJournal={async (confirmation) => {
                await clearJournal(confirmation);
                await refresh();
                setActiveTab("dashboard");
              }}
            />
            <CsvPanel
              preview={csvPreview}
              onPreview={async (path) => setCsvPreview(await previewCsvImport(path))}
              onImport={async (path, mapping) => {
                await executeCsvImport(path, mapping);
                await refresh();
              }}
              onExport={async (path) => {
                await exportCsv(path);
              }}
            />
          </div>
        ) : null}
      </AppShell>
    </I18nContext.Provider>
  );
}
