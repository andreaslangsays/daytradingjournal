import { useEffect, useMemo, useState, useTransition } from "react";
import { Moon, RefreshCw, Sun } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { AppShell } from "./components/app-shell";
import { CsvPanel } from "./components/csv-panel";
import { Dashboard } from "./components/dashboard";
import { SettingsScreen } from "./components/settings-screen";
import { TradeForm } from "./components/trade-form";
import { TradeHistory } from "./components/trade-history";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { getDictionary, I18nContext } from "./lib/i18n";
import { addSessionScreenshotBytes, addTradeScreenshotBytes, clearJournal, deleteSessionImage, deleteTagDefinition, deleteTradeImage, executeAtasImport, exportCsv, getAppPreferences, getInstrumentFeePresets, listTagDefinitions, listTrades, openJournalFromPath, previewAtasImport, saveAppPreferences, saveInstrumentFeePresets, saveJournalToPath, saveTagDefinition, saveTrade } from "./lib/tauri";
import type { AppPreferences, CsvPreview, InstrumentFeePresets, LanguageCode, PendingScreenshot, ThemeMode, TradeFormSubmission, TradeRecord, TradeTag } from "./lib/types";

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
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [feePresets, setFeePresets] = useState<InstrumentFeePresets>({});
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [currentJournal, setCurrentJournal] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();

  const preferences = useMemo<AppPreferences>(() => ({ language, activeTab, theme }), [activeTab, language, theme]);
  const dictionary = useMemo(() => getDictionary(language), [language]);
  const sessionCount = useMemo(() => new Set(trades.map((trade) => trade.sessionId)).size, [trades]);

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
        const presetRows = await getInstrumentFeePresets();
        setTrades(tradeRows);
        setTags(tagRows);
        setFeePresets(presetRows);
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

  useEffect(() => {
    if (!statusMessage) {
      setStatusMessage(dictionary.app.statusReady);
    }
  }, [dictionary.app.statusReady, statusMessage]);

  const handleSaveTrade = async ({ trade, newTradeScreenshots, newSessionScreenshots, removedTradeImageIds, removedSessionImageIds }: TradeFormSubmission) => {
    const savedTrade = await saveTrade(trade);

    await Promise.all([
      ...removedTradeImageIds.map((imageId) => deleteTradeImage(imageId)),
      ...removedSessionImageIds.map((imageId) => deleteSessionImage(imageId)),
      ...newTradeScreenshots.map((shot) =>
        addTradeScreenshotBytes(savedTrade.id, shot.bytes, shot.description || undefined, shot.fileName),
      ),
      ...newSessionScreenshots.map((shot) =>
        addSessionScreenshotBytes(savedTrade.sessionId, shot.bytes, shot.description || undefined, shot.fileName),
      ),
    ]);

    await refresh();
    setEditingTrade(null);
    setActiveTab("trades");
    return savedTrade;
  };

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
  };

  const toggleTheme = () => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleTabChange = (tab: string) => {
    if (tab === "new") {
      setEditingTrade(null);
    }
    setActiveTab(tab);
  };

  const handleOpenJournal = async () => {
    try {
      const selected = await open({
        title: dictionary.app.openJournalTitle,
        multiple: false,
        filters: [{ name: "Trader Journal", extensions: ["trj"] }],
      });
      if (!selected || Array.isArray(selected)) {
        setStatusMessage(dictionary.app.statusReady);
        return;
      }
      const path = await openJournalFromPath(selected);
      if (!path) {
        setStatusMessage(dictionary.app.statusReady);
        return;
      }
      setCurrentJournal(path.split(/[\\/]/).pop() || path);
      setStatusMessage(dictionary.app.statusJournalLoaded);
      await refresh();
    } catch (error) {
      console.error("Failed to open journal", error);
      setStatusMessage(`${dictionary.app.statusOpenFailed}: ${String(error)}`);
    }
  };

  const handleSaveJournal = async () => {
    try {
      const selected = await save({
        title: dictionary.app.saveJournalTitle,
        filters: [{ name: "Trader Journal", extensions: ["trj"] }],
      });
      if (!selected) {
        setStatusMessage(dictionary.app.statusReady);
        return;
      }
      const path = await saveJournalToPath(selected);
      if (!path) {
        setStatusMessage(dictionary.app.statusReady);
        return;
      }
      setCurrentJournal(path.split(/[\\/]/).pop() || path);
      setStatusMessage(dictionary.app.statusJournalSaved);
    } catch (error) {
      console.error("Failed to save journal", error);
      setStatusMessage(`${dictionary.app.statusSaveFailed}: ${String(error)}`);
    }
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
      <AppShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentJournal={currentJournal || dictionary.app.defaultJournal}
        tradeCount={trades.length}
        sessionCount={sessionCount}
        statusMessage={statusMessage || dictionary.app.statusReady}
        topBarActions={
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
            <Button variant="secondary" onClick={() => void handleOpenJournal()}>
              {dictionary.app.openJournal}
            </Button>
            <Button variant="secondary" onClick={() => void handleSaveJournal()}>
              {dictionary.app.saveJournal}
            </Button>
            <Button onClick={() => void refresh()}>
              <RefreshCw className="mr-1.5" size={14} />
              {dictionary.app.refresh}
            </Button>
          </div>
        }
      >

        {pending ? (
          <Card>
            <CardContent className="py-2 text-sm text-muted-foreground">{dictionary.app.refreshing}</CardContent>
          </Card>
        ) : null}

        {activeTab === "dashboard" ? <Dashboard trades={trades} variant="overview" /> : null}
        {activeTab === "trades" ? (
          <TradeHistory
            trades={trades}
            onEditTrade={(trade) => {
              setEditingTrade(trade);
              setActiveTab("new");
            }}
          />
        ) : null}
        {activeTab === "new" ? (
          <TradeForm
            initialTrade={editingTrade}
            onSubmit={handleSaveTrade}
            availableTags={tags}
            feePresets={feePresets}
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
              feePresets={feePresets}
              onSaveFeePresets={async (presets) => {
                const saved = await saveInstrumentFeePresets(presets);
                setFeePresets(saved);
              }}
            />
            <CsvPanel
              preview={csvPreview}
              onPreview={async (path) => setCsvPreview(await previewAtasImport(path))}
              onImport={async (path) => {
                await executeAtasImport(path);
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
