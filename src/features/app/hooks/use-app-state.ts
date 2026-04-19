import { open, save } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getDictionary } from "@/lib/i18n";
import {
  addSessionScreenshotBytes,
  addTradeScreenshotBytes,
  clearJournal,
  deleteSessionImage,
  deleteTagDefinition,
  deleteTradeImage,
  executeAtasImport,
  exportCsv,
  exportExcel,
  getAppPreferences,
  getInstrumentFeePresets,
  listTagDefinitions,
  listTrades,
  openJournalFromPath,
  previewAtasImport,
  saveAppPreferences,
  saveInstrumentFeePresets,
  saveJournalToPath,
  saveTagDefinition,
  saveTrade,
} from "@/lib/tauri";
import type {
  AppPreferences,
  CsvPreview,
  InstrumentFeePresets,
  LanguageCode,
  ThemeMode,
  TradeFormSubmission,
  TradeRecord,
  TradeTag,
} from "@/lib/types";

const defaultPreferences: AppPreferences = {
  language: "de",
  activeTab: "dashboard",
  theme: "light",
};

export function useAppState() {
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
    const [tradeRows, tagRows] = await Promise.all([listTrades(), listTagDefinitions()]);
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

  const handleSaveTrade = async ({
    trade,
    newTradeScreenshots,
    newSessionScreenshots,
    removedTradeImageIds,
    removedSessionImageIds,
  }: TradeFormSubmission) => {
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

  const handleSaveTag = async (tag: TradeTag) => {
    await saveTagDefinition(tag);
    await refresh();
  };

  const handleDeleteTag = async (tagId: string) => {
    await deleteTagDefinition(tagId);
    await refresh();
  };

  const handleClearJournal = async (confirmation: string) => {
    await clearJournal(confirmation);
    await refresh();
    setActiveTab("dashboard");
  };

  const handleSaveFeePresets = async (presets: InstrumentFeePresets) => {
    const saved = await saveInstrumentFeePresets(presets);
    setFeePresets(saved);
  };

  const handlePreviewImport = async (path: string) => {
    setCsvPreview(await previewAtasImport(path));
  };

  const handleImportTrades = async (path: string) => {
    await executeAtasImport(path);
    await refresh();
  };

  const handleExportCsv = async (path: string) => {
    try {
      const savedPath = await exportCsv(path);
      setStatusMessage(`${dictionary.csv.exportSaved}: ${savedPath}`);
    } catch (error) {
      console.error("Failed to export CSV", error);
      setStatusMessage(`${dictionary.csv.exportFailed}: ${String(error)}`);
    }
  };

  const handleExportExcel = async (path: string) => {
    try {
      const savedPath = await exportExcel(path);
      setStatusMessage(`${dictionary.csv.exportSaved}: ${savedPath}`);
    } catch (error) {
      console.error("Failed to export Excel", error);
      setStatusMessage(`${dictionary.csv.exportFailed}: ${String(error)}`);
    }
  };

  return {
    activeTab,
    csvPreview,
    currentJournal,
    dictionary,
    editingTrade,
    feePresets,
    language,
    pending,
    preferences,
    sessionCount,
    statusMessage,
    tags,
    theme,
    trades,
    actions: {
      handleClearJournal,
      handleDeleteTag,
      handleExportCsv,
      handleExportExcel,
      handleImportTrades,
      handleOpenJournal,
      handlePreviewImport,
      handleSaveFeePresets,
      handleSaveJournal,
      handleSaveTag,
      handleSaveTrade,
      handleTabChange,
      refresh,
      setEditingTrade,
      setLanguage,
      setThemeState,
      toggleTheme,
    },
  };
}
