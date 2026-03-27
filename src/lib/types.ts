export type Instrument = "ES" | "NQ" | "CL" | "CUSTOM";
export type Side = "LONG" | "SHORT";

export interface TradeImage {
  id: string;
  tradeId: string;
  relativePath: string;
  description?: string | null;
}

export interface TradeTag {
  id: string;
  name: string;
  color: string;
}

export interface TradeRecord {
  id: string;
  sessionId: string;
  instrument: Instrument;
  customInstrument?: string | null;
  side: Side;
  entryTimestamp: string;
  exitTimestamp: string;
  entryPrice: number;
  exitPrice: number;
  contracts: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  grossPnl: number;
  netPnl: number;
  rMultiple: number;
  mae?: number | null;
  mfe?: number | null;
  holdMinutes: number;
  mood: string;
  setupDescription: string;
  tags: string[];
  images: TradeImage[];
  sessionImages: TradeImage[];
}

export interface DashboardMetrics {
  accountBalance: number;
  equityCurve: Array<{ label: string; balance: number }>;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  tradeCount: number;
  maxDrawdown: number;
  maeMfe: Array<{ tradeId: string; mae: number; mfe: number; pnl: number }>;
  weekdayHeatmap: Array<{ bucket: string; value: number }>;
  tagStats: Array<{ label: string; count: number; pnl: number }>;
}

export interface CsvPreview {
  headers: string[];
  sampleRows: string[][];
}

export interface CsvMapping {
  [key: string]: string;
}

export type LanguageCode = "de" | "en" | "es";
export type ThemeMode = "light" | "dark";

export interface AppPreferences {
  language: LanguageCode;
  activeTab: string;
  theme: ThemeMode;
}

export interface PendingScreenshot {
  id: string;
  bytes: number[];
  previewUrl: string;
  description: string;
  fileName?: string;
}
