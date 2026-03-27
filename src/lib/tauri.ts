import { invoke } from "@tauri-apps/api/core";
import type { AppPreferences, CsvMapping, CsvPreview, DashboardMetrics, TradeRecord, TradeTag } from "./types";

export async function listTrades() {
  return invoke<TradeRecord[]>("list_trades");
}

export async function getDashboardMetrics() {
  return invoke<DashboardMetrics>("get_dashboard_metrics");
}

export async function saveTrade(payload: Partial<TradeRecord>) {
  return invoke<TradeRecord>("upsert_trade", { payload });
}

export async function openJournal() {
  return invoke<string>("open_journal_dialog");
}

export async function saveJournal() {
  return invoke<string>("save_journal_dialog");
}

export async function previewCsvImport(filePath: string) {
  return invoke<CsvPreview>("preview_csv_import", { filePath });
}

export async function executeCsvImport(filePath: string, mapping: CsvMapping) {
  return invoke<number>("execute_csv_import", { filePath, mapping });
}

export async function exportCsv(filePath: string) {
  return invoke<string>("export_flat_csv", { filePath });
}

export async function getAppPreferences() {
  return invoke<AppPreferences>("get_app_preferences");
}

export async function saveAppPreferences(preferences: AppPreferences) {
  return invoke<AppPreferences>("save_app_preferences", { preferences });
}

export async function addTradeScreenshotBytes(
  tradeId: string,
  bytes: number[],
  description?: string,
  fileName?: string,
) {
  return invoke("add_trade_screenshot_bytes", { tradeId, bytes, description, fileName });
}

export async function listTagDefinitions() {
  return invoke<TradeTag[]>("list_tag_definitions");
}

export async function saveTagDefinition(tag: TradeTag) {
  return invoke<TradeTag>("upsert_tag_definition", { tag });
}

export async function deleteTagDefinition(tagId: string) {
  return invoke<void>("delete_tag_definition", { tagId });
}

export async function clearJournal(confirmation: string) {
  return invoke<void>("clear_journal", { confirmation });
}

export async function readTradeImageBytes(relativePath: string) {
  return invoke<number[]>("read_trade_image_bytes", { relativePath });
}

export async function addSessionScreenshotBytes(
  sessionId: string,
  bytes: number[],
  description?: string,
  fileName?: string,
) {
  return invoke("add_session_screenshot_bytes", { sessionId, bytes, description, fileName });
}
