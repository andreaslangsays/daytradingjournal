import { Moon, RefreshCw, Sun } from "lucide-react";
import { AppShell } from "./components/app-shell";
import { CsvPanel } from "./components/csv-panel";
import { Dashboard } from "./components/dashboard";
import { SettingsScreen } from "./components/settings-screen";
import { TradeForm } from "./components/trade-form";
import { TradeHistory } from "./components/trade-history";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { I18nContext } from "./lib/i18n";
import { useAppState } from "./features/app/hooks/use-app-state";

export default function App() {
  const {
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
    actions,
  } = useAppState();

  return (
    <I18nContext.Provider
      value={{
        language,
        locale: dictionary.locale,
        copy: dictionary,
        preferences,
        setLanguage: actions.setLanguage,
      }}
    >
      <AppShell
        activeTab={activeTab}
        onTabChange={actions.handleTabChange}
        currentJournal={currentJournal || dictionary.app.defaultJournal}
        tradeCount={trades.length}
        sessionCount={sessionCount}
        statusMessage={statusMessage || dictionary.app.statusReady}
        topBarActions={
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" onClick={actions.toggleTheme}>
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
            <Button variant="secondary" onClick={() => void actions.handleOpenJournal()}>
              {dictionary.app.openJournal}
            </Button>
            <Button variant="secondary" onClick={() => void actions.handleSaveJournal()}>
              {dictionary.app.saveJournal}
            </Button>
            <Button onClick={() => void actions.refresh()}>
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
              actions.setEditingTrade(trade);
              actions.handleTabChange("new");
            }}
          />
        ) : null}
        {activeTab === "new" ? (
          <TradeForm
            initialTrade={editingTrade}
            onSubmit={actions.handleSaveTrade}
            availableTags={tags}
            feePresets={feePresets}
          />
        ) : null}
        {activeTab === "stats" ? <Dashboard trades={trades} variant="stats" /> : null}
        {activeTab === "settings" ? (
          <div className="grid gap-4">
            <SettingsScreen
              language={language}
              onLanguageChange={actions.setLanguage}
              theme={theme}
              onThemeChange={actions.setThemeState}
              tags={tags}
              onSaveTag={actions.handleSaveTag}
              onDeleteTag={actions.handleDeleteTag}
              onClearJournal={actions.handleClearJournal}
              feePresets={feePresets}
              onSaveFeePresets={actions.handleSaveFeePresets}
            />
            <CsvPanel
              preview={csvPreview}
              onPreview={actions.handlePreviewImport}
              onImport={actions.handleImportTrades}
              onExportCsv={actions.handleExportCsv}
              onExportExcel={actions.handleExportExcel}
            />
          </div>
        ) : null}
      </AppShell>
    </I18nContext.Provider>
  );
}
