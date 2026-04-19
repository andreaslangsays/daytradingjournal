import type { TradeRecord } from "@/lib/types";

export interface DashboardFilters {
  session: string;
  day: string;
  month: string;
  tag: string;
  instrument: string;
  account: string;
}

export interface DashboardFilterOptions {
  sessions: string[];
  days: string[];
  months: string[];
  tags: string[];
  instruments: string[];
  accounts: string[];
}

export const defaultDashboardFilters: DashboardFilters = {
  session: "",
  day: "",
  month: "",
  tag: "",
  instrument: "",
  account: "",
};

export function buildDashboardFilterOptions(trades: TradeRecord[]): DashboardFilterOptions {
  const sessions = Array.from(new Set(trades.map((trade) => trade.sessionId))).filter(Boolean).sort();
  const days = Array.from(new Set(trades.map((trade) => trade.entryTimestamp.slice(0, 10)))).sort();
  const months = Array.from(new Set(trades.map((trade) => trade.entryTimestamp.slice(0, 7)))).sort();
  const tags = Array.from(new Set(trades.flatMap((trade) => trade.tags))).sort();
  const instruments = Array.from(new Set(trades.map((trade) => trade.instrument))).sort();
  const accounts = Array.from(new Set(trades.map((trade) => trade.account).filter(Boolean))).sort();

  return { sessions, days, months, tags, instruments, accounts };
}

export function filterTradesForDashboard(trades: TradeRecord[], filters: DashboardFilters) {
  return trades.filter((trade) => {
    const matchesSession = !filters.session || trade.sessionId === filters.session;
    const matchesDay = !filters.day || trade.entryTimestamp.slice(0, 10) === filters.day;
    const matchesMonth = !filters.month || trade.entryTimestamp.slice(0, 7) === filters.month;
    const matchesTag = !filters.tag || trade.tags.includes(filters.tag);
    const matchesInstrument = !filters.instrument || trade.instrument === filters.instrument;
    const matchesAccount = !filters.account || trade.account === filters.account;
    return matchesSession && matchesDay && matchesMonth && matchesTag && matchesInstrument && matchesAccount;
  });
}
