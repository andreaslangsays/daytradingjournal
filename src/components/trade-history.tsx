import { ChevronLeft, ChevronRight, Expand, Images, Layers3, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { readTradeImageBytes } from "@/lib/tauri";
import type { TradeImage, TradeRecord } from "@/lib/types";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

const moodColors: Record<string, string> = {
  "😄": "#22c55e",
  "🙂": "#38bdf8",
  "😐": "#94a3b8",
  "😵": "#fb923c",
  "😤": "#ef4444",
};

const tagPalette = ["#38bdf8", "#22c55e", "#f59e0b", "#f97316", "#a78bfa", "#ec4899", "#14b8a6", "#eab308"];

type ViewerMode = "trade" | "session";

export function TradeHistory({ trades, onEditTrade }: { trades: TradeRecord[]; onEditTrade: (trade: TradeRecord) => void }) {
  const { copy, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const imageUrlsRef = useRef<Record<string, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("trade");
  const [detailsOpen, setDetailsOpen] = useState(true);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const haystack =
        `${trade.sessionId} ${trade.account} ${trade.instrument} ${trade.setupDescription} ${trade.tags.join(" ")} ${trade.mood}`.toLowerCase();
      return haystack.includes(query.toLowerCase()) && (instrumentFilter === "" || trade.instrument === instrumentFilter) && (accountFilter === "" || trade.account === accountFilter);
    });
  }, [accountFilter, instrumentFilter, query, trades]);

  const groupedTrades = useMemo(() => {
    const groups = new Map<string, TradeRecord[]>();
    for (const trade of filteredTrades) {
      const current = groups.get(trade.sessionId) ?? [];
      current.push(trade);
      groups.set(trade.sessionId, current);
    }
    return Array.from(groups.entries()).map(([sessionId, sessionTrades]) => ({
      sessionId,
      trades: sessionTrades.sort((left, right) => left.entryTimestamp.localeCompare(right.entryTimestamp)),
      sessionImageCount: sessionTrades[0]?.sessionImages.length ?? 0,
    }));
  }, [filteredTrades]);

  const selectedTrade = useMemo(
    () => filteredTrades.find((trade) => trade.id === selectedTradeId) ?? filteredTrades[0] ?? null,
    [filteredTrades, selectedTradeId],
  );

  const selectedSessionTrades = useMemo(
    () => filteredTrades.filter((trade) => trade.sessionId === selectedTrade?.sessionId),
    [filteredTrades, selectedTrade?.sessionId],
  );

  const selectedTradeIndex = useMemo(
    () => filteredTrades.findIndex((trade) => trade.id === selectedTrade?.id),
    [filteredTrades, selectedTrade],
  );

  const currentImages = useMemo<TradeImage[]>(() => {
    if (!selectedTrade) {
      return [];
    }
    return viewerMode === "session" ? selectedTrade.sessionImages : selectedTrade.images;
  }, [selectedTrade, viewerMode]);

  const activeImage = currentImages[activeImageIndex] ?? null;

  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  useEffect(() => {
    if (!selectedTrade) {
      return;
    }

    setSelectedTradeId(selectedTrade.id);
    void (async () => {
      const allImages = [...selectedTrade.images, ...selectedTrade.sessionImages];
      const pairs = await Promise.all(
        allImages.map(async (image) => {
          if (imageUrlsRef.current[image.id]) {
            return [image.id, imageUrlsRef.current[image.id]] as const;
          }
          const bytes = await readTradeImageBytes(image.relativePath);
          const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)]));
          return [image.id, url] as const;
        }),
      );

      setImageUrls((current) => {
        const next = { ...current };
        for (const [id, url] of pairs) {
          next[id] = url;
        }
        return next;
      });
    })();
  }, [selectedTrade]);

  useEffect(() => {
    if (!selectedTrade) {
      return;
    }

    const preferredModeStillAvailable =
      (viewerMode === "trade" && selectedTrade.images.length > 0) ||
      (viewerMode === "session" && selectedTrade.sessionImages.length > 0);

    if (!preferredModeStillAvailable) {
      if (selectedTrade.images.length > 0) {
        setViewerMode("trade");
      } else if (selectedTrade.sessionImages.length > 0) {
        setViewerMode("session");
      }
    }
  }, [selectedTrade?.id, viewerMode]);

  useEffect(() => {
    if (activeImageIndex <= currentImages.length - 1) {
      return;
    }
    setActiveImageIndex(0);
  }, [activeImageIndex, currentImages.length]);

  useEffect(() => {
    return () => {
      Object.values(imageUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const selectNeighborTrade = (direction: -1 | 1) => {
    if (selectedTradeIndex < 0) return;
    const nextTrade = filteredTrades[selectedTradeIndex + direction];
    if (!nextTrade) return;
    setSelectedTradeId(nextTrade.id);
  };

  const openViewer = (mode: ViewerMode, index = 0) => {
    setViewerMode(mode);
    setActiveImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className={detailsOpen ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-3"}>
        <Card>
          <CardHeader>
            <div>
              <CardDescription className="text-foreground/65">{copy.history.eyebrow}</CardDescription>
              <CardTitle className="mt-1 text-base text-foreground">{copy.history.title}</CardTitle>
            </div>
            <Button type="button" variant="secondary" onClick={() => setDetailsOpen((current) => !current)}>
              {detailsOpen ? "Details ausblenden" : "Details anzeigen"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
              <Input placeholder={copy.history.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
              <Input placeholder={copy.history.filterPlaceholder} value={instrumentFilter} onChange={(event) => setInstrumentFilter(event.target.value.toUpperCase())} />
              <Input placeholder="Konto filtern" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} />
            </div>

            <div className="space-y-3">
              {groupedTrades.map((group) => (
                <section key={group.sessionId} className="rounded-[5px] border border-border/80 bg-background/40">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-3 py-2.5">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{copy.history.sessionSummary}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{group.sessionId}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{group.trades.length} {copy.history.tradesInSession}</Badge>
                      <Badge className="bg-secondary/90 text-foreground">{group.sessionImageCount} {copy.history.sessionScreenshotCount}</Badge>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{copy.history.timestamp}</TableHead>
                          <TableHead>{copy.history.instrument}</TableHead>
                          <TableHead>Konto</TableHead>
                          <TableHead>{copy.history.side}</TableHead>
                          <TableHead>{copy.history.contracts}</TableHead>
                          <TableHead>{copy.history.entry}</TableHead>
                          <TableHead>{copy.history.exit}</TableHead>
                          <TableHead>{copy.history.pnl}</TableHead>
                          <TableHead>{copy.history.rMultiple}</TableHead>
                          <TableHead>{copy.history.mood}</TableHead>
                          <TableHead>{copy.history.tradeScreenshotCount}</TableHead>
                          <TableHead>{copy.history.comment}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.trades.map((trade) => (
                          <TableRow
                            key={trade.id}
                            className={selectedTrade?.id === trade.id ? "bg-muted/70" : undefined}
                            onClick={() => setSelectedTradeId(trade.id)}
                          >
                            <TableCell>{trade.entryTimestamp.slice(0, 16).replace("T", " ")}</TableCell>
                            <TableCell className="font-medium text-foreground">{trade.instrument}</TableCell>
                            <TableCell>{trade.account || "-"}</TableCell>
                            <TableCell>{trade.side}</TableCell>
                            <TableCell>{trade.contracts}</TableCell>
                            <TableCell>{trade.entryPrice}</TableCell>
                            <TableCell>{trade.exitPrice}</TableCell>
                            <TableCell className={trade.netPnl >= 0 ? "text-success" : "text-danger"}>{formatCurrency(trade.netPnl, locale)}</TableCell>
                            <TableCell>{trade.rMultiple.toFixed(2)}</TableCell>
                            <TableCell>
                              <MoodBadge mood={trade.mood} compact />
                            </TableCell>
                            <TableCell>{trade.images.length}</TableCell>
                            <TableCell className="max-w-[520px] truncate text-muted-foreground">{trade.setupDescription}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              ))}
            </div>
          </CardContent>
        </Card>

        {detailsOpen ? (
        <Card>
          <CardHeader>
            <div>
              <CardDescription className="text-foreground/65">{copy.history.details}</CardDescription>
              <CardTitle className="mt-1 text-base text-foreground">
                {selectedTrade ? `${selectedTrade.instrument} ${selectedTrade.side}` : copy.history.details}
              </CardTitle>
            </div>
            {selectedTrade ? (
              <Button type="button" variant="secondary" onClick={() => onEditTrade(selectedTrade)}>
                {copy.history.editTrade}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedTrade ? (
              <p className="text-sm text-muted-foreground">{copy.history.selectTrade}</p>
            ) : (
              <>
                <section className="rounded-[5px] border border-slate-200 bg-[#f5f5f0] dark:border-[#334155] dark:bg-[#18181b]">
                  <div className="grid gap-x-4 gap-y-3 border-b border-slate-200 px-3 py-3 dark:border-[#334155] sm:grid-cols-2 xl:grid-cols-4">
                    <DetailMetric label={copy.history.session} value={selectedTrade.sessionId} />
                    <DetailMetric label={copy.history.timestamp} value={selectedTrade.entryTimestamp.slice(0, 16).replace("T", " ")} />
                    <DetailMetric label={copy.history.instrument} value={selectedTrade.instrument} />
                    <DetailMetric label={copy.history.side} value={selectedTrade.side} />
                    <DetailMetric label={copy.history.contracts} value={String(selectedTrade.contracts)} />
                    <DetailMetric label={copy.history.hold} value={formatDuration(selectedTrade.holdMinutes)} />
                    <DetailMetric
                      label={copy.history.pnl}
                      value={formatCurrency(selectedTrade.netPnl, locale)}
                      tone={selectedTrade.netPnl >= 0 ? "positive" : "negative"}
                    />
                    <DetailMetric label={copy.history.mood} value={<MoodBadge mood={selectedTrade.mood} />} />
                  </div>

                  <div className="grid gap-4 px-3 py-3">
                    <div className="grid gap-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{copy.history.fullComment}</h4>
                      <div className="max-h-56 overflow-auto rounded-[5px] border border-slate-200 bg-white px-3 py-3 text-[14px] leading-6 text-foreground dark:border-[#334155] dark:bg-[#121212]">
                        <div className="whitespace-pre-wrap break-words">{selectedTrade.setupDescription || "-"}</div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{copy.history.tags}</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrade.tags.length > 0 ? selectedTrade.tags.map((tag) => (
                          <TagBadge key={tag} label={tag} subtle />
                        )) : <span className="text-sm text-muted-foreground">-</span>}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[13px] font-semibold text-foreground">{copy.history.tradeShots}</h4>
                    {selectedTrade.images.length > 0 ? (
                      <Button type="button" variant="secondary" onClick={() => openViewer("trade")}>
                        <Expand className="mr-2" size={16} />
                        {copy.history.openLightbox}
                      </Button>
                    ) : null}
                  </div>
                  {selectedTrade.images.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{copy.history.noScreenshots}</p>
                  ) : (
                    <ScreenshotGrid
                      images={selectedTrade.images}
                      imageUrls={imageUrls}
                      emptyLabel={copy.history.noScreenshots}
                      onOpen={(index) => openViewer("trade", index)}
                    />
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[13px] font-semibold text-foreground">{copy.history.sessionShots}</h4>
                    {selectedTrade.sessionImages.length > 0 ? (
                      <Button type="button" variant="secondary" onClick={() => openViewer("session")}>
                        <Layers3 className="mr-2" size={16} />
                        {copy.history.openSessionLightbox}
                      </Button>
                    ) : null}
                  </div>
                  {selectedTrade.sessionImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{copy.history.noSessionScreenshots}</p>
                  ) : (
                    <ScreenshotGrid
                      images={selectedTrade.sessionImages}
                      imageUrls={imageUrls}
                      emptyLabel={copy.history.noSessionScreenshots}
                      onOpen={(index) => openViewer("session", index)}
                    />
                  )}
                </section>
              </>
            )}
          </CardContent>
        </Card>
        ) : null}
      </div>

      {lightboxOpen && selectedTrade ? (
        <div className="fixed inset-0 z-50 bg-[#faf7f2] dark:bg-[#121212]">
          <div className="mx-auto grid h-screen max-w-[1700px] grid-rows-[48px_minmax(0,1fr)_280px]">
            <div className="flex h-12 items-center justify-between gap-3 border-b border-slate-300 px-3 text-foreground dark:border-[#2a2a2a]">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant={viewerMode === "trade" ? "default" : "secondary"}
                  className="h-8"
                  onClick={() => {
                    setViewerMode("trade");
                    setActiveImageIndex(0);
                  }}
                  disabled={selectedTrade.images.length === 0}
                >
                  <Images className="mr-2" size={16} />
                  {copy.history.switchToTrade}
                </Button>
                <Button
                  type="button"
                  variant={viewerMode === "session" ? "default" : "secondary"}
                  className="h-8"
                  onClick={() => {
                    setViewerMode("session");
                    setActiveImageIndex(0);
                  }}
                  disabled={selectedTrade.sessionImages.length === 0}
                >
                  <Layers3 className="mr-2" size={16} />
                  {copy.history.switchToSession}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {currentImages.length > 1 ? (
                  <>
                    <Button type="button" variant="secondary" className="h-8" onClick={() => setActiveImageIndex((current) => Math.max(0, current - 1))} disabled={activeImageIndex === 0}>
                      <ChevronLeft size={16} />
                      {copy.history.previousScreenshot}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8"
                      onClick={() => setActiveImageIndex((current) => Math.min(currentImages.length - 1, current + 1))}
                      disabled={activeImageIndex === currentImages.length - 1}
                    >
                      {copy.history.nextScreenshot}
                      <ChevronRight size={16} />
                    </Button>
                  </>
                ) : null}
                <Button type="button" variant="secondary" className="h-8 border-border bg-background text-foreground dark:border-[#3a3a3a] dark:bg-[#1a1a1a]" onClick={() => setLightboxOpen(false)}>
                  <X className="mr-2" size={16} />
                  {copy.history.closeLightbox}
                </Button>
              </div>
            </div>

            <div className="min-h-0 border-b border-slate-300 bg-[#faf7f2] p-4 dark:border-[#2a2a2a] dark:bg-[#121212]">
              {activeImage && imageUrls[activeImage.id] ? (
                <div className="flex h-full items-center justify-center">
                  <img src={imageUrls[activeImage.id]} alt={activeImage.description ?? "Trade screenshot"} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="grid h-full place-items-center border border-slate-200 bg-[#f5f5f0] dark:border-[#2f2f2f] dark:bg-[#18181b]">
                  {currentImages.length > 0 ? (
                    <div className="h-[72%] w-[72%] animate-pulse border border-slate-200 bg-[#eeece4] dark:border-[#343434] dark:bg-[#202020]" />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {viewerMode === "trade" ? copy.history.noScreenshots : copy.history.noSessionScreenshots}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative grid h-[280px] grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] border-t-0 border-slate-300 bg-[#f5f5f0] dark:border-[#2a2a2a] dark:bg-[#121212]">
              <Button
                type="button"
                variant="secondary"
                className="absolute left-3 top-3 z-10 h-8 px-2"
                onClick={() => selectNeighborTrade(-1)}
                disabled={selectedTradeIndex <= 0}
              >
                <ChevronLeft size={15} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="absolute right-3 top-3 z-10 h-8 px-2"
                onClick={() => selectNeighborTrade(1)}
                disabled={selectedTradeIndex >= filteredTrades.length - 1}
              >
                <ChevronRight size={15} />
              </Button>

              <div className="grid min-h-0 grid-rows-[auto_1fr] border-r border-slate-300 px-4 pb-4 pt-12 dark:border-[#2a2a2a]">
                <div className="grid grid-cols-4 gap-x-4 gap-y-3">
                  <DetailMetric label={copy.history.session} value={selectedTrade.sessionId} compact />
                  <DetailMetric label={copy.history.timestamp} value={selectedTrade.entryTimestamp.slice(0, 16).replace("T", " ")} compact />
                  <DetailMetric label={copy.history.instrument} value={selectedTrade.instrument} compact />
                  <DetailMetric label={copy.history.side} value={selectedTrade.side} compact />
                  <DetailMetric label={copy.history.contracts} value={String(selectedTrade.contracts)} compact />
                  <DetailMetric
                    label={copy.history.pnl}
                    value={formatCurrency(selectedTrade.netPnl, locale)}
                    tone={selectedTrade.netPnl >= 0 ? "positive" : "negative"}
                    compact
                  />
                  <DetailMetric label={copy.history.mood} value={<MoodBadge mood={selectedTrade.mood} compact />} compact />
                  <DetailMetric label={copy.history.rMultiple} value={selectedTrade.rMultiple.toFixed(2)} compact />
                </div>
                <div className="mt-3 min-h-0 overflow-hidden border-t border-slate-300 pt-3 dark:border-[#2a2a2a]">
                  <div className="grid h-full grid-cols-3 gap-4">
                    <div className="border-r border-slate-300 pr-4 dark:border-[#2a2a2a]">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{copy.history.entry}</p>
                      <div className="metric-value mt-1 text-sm font-semibold text-foreground">{selectedTrade.entryPrice}</div>
                    </div>
                    <div className="border-r border-slate-300 pr-4 dark:border-[#2a2a2a]">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{copy.history.exit}</p>
                      <div className="metric-value mt-1 text-sm font-semibold text-foreground">{selectedTrade.exitPrice}</div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{copy.history.hold}</p>
                      <div className="metric-value mt-1 text-sm font-semibold text-foreground">{formatDuration(selectedTrade.holdMinutes)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 grid-rows-[108px_minmax(0,1fr)] bg-[#f5f5f0] px-4 py-4 dark:bg-[#121212]">
                <div className="min-h-0 overflow-auto border-b border-slate-300 pb-3 dark:border-[#2a2a2a]">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{copy.history.tags}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTrade.tags.length > 0 ? selectedTrade.tags.map((tag) => (
                      <TagBadge key={tag} label={tag} subtle />
                    )) : <span className="text-sm text-muted-foreground">-</span>}
                  </div>
                </div>
                <div className="min-h-0 overflow-auto pt-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{copy.history.fullComment}</p>
                  <div className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 text-foreground">
                    {selectedTrade.setupDescription || "-"}
                  </div>
                  {activeImage?.description ? (
                    <p className="mt-3 border-t border-slate-300 pt-2 text-xs text-muted-foreground dark:border-[#2a2a2a]">
                      {copy.history.screenshotLabel}: {activeImage.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ScreenshotGrid({
  images,
  imageUrls,
  emptyLabel,
  onOpen,
}: {
  images: TradeImage[];
  imageUrls: Record<string, string>;
  emptyLabel: string;
  onOpen: (index: number) => void;
}) {
  if (images.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="grid gap-4">
      {images.map((image, index) => (
        <button
          key={image.id}
          type="button"
          className="rounded-[5px] border border-border/80 bg-secondary/60 p-2.5 text-left"
          onClick={() => onOpen(index)}
        >
          {imageUrls[image.id] ? (
            <img src={imageUrls[image.id]} alt={image.description ?? "Screenshot"} className="h-48 w-full rounded-[5px] object-cover" />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-[5px] bg-muted text-sm text-muted-foreground">Loading...</div>
          )}
          {image.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{image.description}</p> : null}
        </button>
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-[5px] border border-border/80 bg-secondary/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={`metric-value mt-1.5 text-base font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  tone = "default",
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "positive" | "negative";
  compact?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "dark:drop-shadow-[0_0_12px_rgba(16,185,129,0.22)]"
      : tone === "negative"
        ? "dark:drop-shadow-[0_0_12px_rgba(244,63,94,0.20)]"
        : "";
  const valueClass =
    tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "negative"
        ? "text-rose-700 dark:text-rose-300"
        : "text-foreground";

  return (
    <div className={`min-w-0 border-r border-slate-200 pr-3 last:border-r-0 dark:border-[#334155] ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className={`metric-value mt-1 ${compact ? "text-sm" : "text-base"} font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function MoodBadge({ mood, compact = false }: { mood: string; compact?: boolean }) {
  const color = moodColors[mood] ?? "#94a3b8";
  return (
    <span
      className={compact ? "inline-flex h-8 w-8 items-center justify-center rounded-[5px] border text-[1rem] shadow-sm" : "inline-flex h-11 w-11 items-center justify-center rounded-[5px] border text-[1.45rem] shadow-sm"}
      style={{ borderColor: color, backgroundColor: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}44` }}
    >
      {mood}
    </span>
  );
}

function InfoChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "mood";
}) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : tone === "negative"
        ? "border-rose-500/30 bg-rose-500/10"
        : tone === "mood"
          ? "border-sky-500/20 bg-sky-500/08"
          : "border-border/80 bg-secondary/65";

  const valueClass =
    tone === "positive"
      ? "text-emerald-500"
      : tone === "negative"
        ? "text-rose-500"
        : "text-foreground";

  return (
    <div className={`rounded-[5px] border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={`metric-value mt-1 text-sm font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function TagBadge({ label, subtle = false }: { label: string; subtle?: boolean }) {
  const color = tagPalette[Math.abs(hashString(label)) % tagPalette.length];
  return (
    <Badge
      className="text-foreground"
      style={{
        borderColor: `${color}66`,
        backgroundColor: subtle ? "transparent" : `${color}18`,
        boxShadow: subtle ? "none" : `inset 0 0 0 1px ${color}22`,
      }}
    >
      {label}
    </Badge>
  );
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
