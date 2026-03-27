import { ChevronLeft, ChevronRight, Expand, Images, Layers3, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type ViewerMode = "trade" | "session";

export function TradeHistory({ trades }: { trades: TradeRecord[] }) {
  const { copy, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("trade");

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const haystack =
        `${trade.sessionId} ${trade.instrument} ${trade.setupDescription} ${trade.tags.join(" ")} ${trade.mood}`.toLowerCase();
      return haystack.includes(query.toLowerCase()) && (instrumentFilter === "" || trade.instrument === instrumentFilter);
    });
  }, [instrumentFilter, query, trades]);

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
    if (!selectedTrade) {
      return;
    }

    setSelectedTradeId(selectedTrade.id);
    void (async () => {
      const allImages = [...selectedTrade.images, ...selectedTrade.sessionImages];
      const pairs = await Promise.all(
        allImages.map(async (image) => {
          if (imageUrls[image.id]) {
            return [image.id, imageUrls[image.id]] as const;
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
    if (selectedTrade.images.length > 0) {
      setViewerMode("trade");
    } else if (selectedTrade.sessionImages.length > 0) {
      setViewerMode("session");
    }
    setActiveImageIndex(0);
  }, [selectedTrade?.id]);

  useEffect(() => {
    if (activeImageIndex <= currentImages.length - 1) {
      return;
    }
    setActiveImageIndex(0);
  }, [activeImageIndex, currentImages.length]);

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

  const selectNeighborTrade = (direction: -1 | 1) => {
    if (selectedTradeIndex < 0) return;
    const nextTrade = filteredTrades[selectedTradeIndex + direction];
    if (!nextTrade) return;
    setSelectedTradeId(nextTrade.id);
    setActiveImageIndex(0);
  };

  const openViewer = (mode: ViewerMode, index = 0) => {
    setViewerMode(mode);
    setActiveImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardDescription className="text-foreground/65">{copy.history.eyebrow}</CardDescription>
              <CardTitle className="mt-2 text-2xl text-foreground">{copy.history.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Input placeholder={copy.history.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
              <Input placeholder={copy.history.filterPlaceholder} value={instrumentFilter} onChange={(event) => setInstrumentFilter(event.target.value.toUpperCase())} />
            </div>

            <div className="space-y-4">
              {groupedTrades.map((group) => (
                <section key={group.sessionId} className="rounded-xl border border-border/80 bg-background/40">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.history.sessionSummary}</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">{group.sessionId}</p>
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
                            <TableCell>{trade.side}</TableCell>
                            <TableCell>{trade.contracts}</TableCell>
                            <TableCell>{trade.entryPrice}</TableCell>
                            <TableCell>{trade.exitPrice}</TableCell>
                            <TableCell className={trade.netPnl >= 0 ? "text-success" : "text-danger"}>{formatCurrency(trade.netPnl, locale)}</TableCell>
                            <TableCell>{trade.rMultiple.toFixed(2)}</TableCell>
                            <TableCell>
                              <MoodBadge mood={trade.mood} />
                            </TableCell>
                            <TableCell>{trade.images.length}</TableCell>
                            <TableCell className="max-w-[320px] truncate text-muted-foreground">{trade.setupDescription}</TableCell>
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

        <Card>
          <CardHeader>
            <div>
              <CardDescription className="text-foreground/65">{copy.history.details}</CardDescription>
              <CardTitle className="mt-2 text-2xl text-foreground">
                {selectedTrade ? `${selectedTrade.instrument} ${selectedTrade.side}` : copy.history.details}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedTrade ? (
              <p className="text-sm text-muted-foreground">{copy.history.selectTrade}</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile label={copy.history.session} value={selectedTrade.sessionId} />
                  <StatTile label={copy.history.mood} value={<MoodBadge mood={selectedTrade.mood} />} />
                  <StatTile label={copy.history.hold} value={formatDuration(selectedTrade.holdMinutes)} />
                  <StatTile label={copy.history.pnl} value={formatCurrency(selectedTrade.netPnl, locale)} tone={selectedTrade.netPnl >= 0 ? "text-success" : "text-danger"} />
                  <StatTile label={copy.history.rMultiple} value={selectedTrade.rMultiple.toFixed(2)} />
                  <StatTile label={copy.history.tradesInSession} value={String(selectedSessionTrades.length)} />
                  <StatTile label={copy.history.stopLoss} value={selectedTrade.stopLoss?.toString() ?? "-"} />
                  <StatTile label={copy.history.takeProfit} value={selectedTrade.takeProfit?.toString() ?? "-"} />
                  <StatTile label={copy.history.mae} value={selectedTrade.mae?.toFixed(2) ?? "-"} />
                  <StatTile label={copy.history.mfe} value={selectedTrade.mfe?.toFixed(2) ?? "-"} />
                </div>

                <section className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">{copy.history.tags}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrade.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">{copy.history.fullComment}</h4>
                  <div className="rounded-xl border border-border/80 bg-secondary/60 p-4 text-sm leading-7 text-foreground">
                    {selectedTrade.setupDescription || "-"}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-foreground">{copy.history.tradeShots}</h4>
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
                    <h4 className="text-sm font-semibold text-foreground">{copy.history.sessionShots}</h4>
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
      </div>

      {lightboxOpen && selectedTrade ? (
        <div className="fixed inset-0 z-50 bg-slate-950/72 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/94 px-4 py-3 text-foreground shadow-glow">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={viewerMode === "trade" ? "default" : "secondary"}
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
                    <Button type="button" variant="secondary" onClick={() => setActiveImageIndex((current) => Math.max(0, current - 1))} disabled={activeImageIndex === 0}>
                      <ChevronLeft size={16} />
                      {copy.history.previousScreenshot}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActiveImageIndex((current) => Math.min(currentImages.length - 1, current + 1))}
                      disabled={activeImageIndex === currentImages.length - 1}
                    >
                      {copy.history.nextScreenshot}
                      <ChevronRight size={16} />
                    </Button>
                  </>
                ) : null}
                <Button type="button" variant="ghost" onClick={() => setLightboxOpen(false)}>
                  <X className="mr-2" size={16} />
                  {copy.history.closeLightbox}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 rounded-xl border border-border/80 bg-background/94 p-4 shadow-glow">
              {activeImage && imageUrls[activeImage.id] ? (
                <img src={imageUrls[activeImage.id]} alt={activeImage.description ?? "Trade screenshot"} className="h-full w-full rounded-lg object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {viewerMode === "trade" ? copy.history.noScreenshots : copy.history.noSessionScreenshots}
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-xl border border-border/80 bg-background/94 p-4 shadow-glow lg:grid-cols-[150px_130px_110px_90px_140px_110px_120px_1fr_auto_auto] lg:items-center">
              <InfoChip label={copy.history.session} value={selectedTrade.sessionId} />
              <InfoChip label={copy.history.timestamp} value={selectedTrade.entryTimestamp.slice(0, 16).replace("T", " ")} />
              <InfoChip label={copy.history.instrument} value={selectedTrade.instrument} />
              <InfoChip label={copy.history.side} value={selectedTrade.side} />
              <InfoChip label={copy.history.contracts} value={String(selectedTrade.contracts)} />
              <InfoChip label={copy.history.pnl} value={formatCurrency(selectedTrade.netPnl, locale)} />
              <InfoChip label={copy.history.mood} value={selectedTrade.mood} />
              <div className="min-w-0 rounded-lg border border-border/80 bg-secondary/65 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.history.comment}</p>
                <p className="mt-1 line-clamp-2 text-sm text-foreground">{selectedTrade.setupDescription || "-"}</p>
                {activeImage?.description ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {copy.history.screenshotLabel}: {activeImage.description}
                  </p>
                ) : null}
              </div>
              <Button type="button" variant="secondary" onClick={() => selectNeighborTrade(-1)} disabled={selectedTradeIndex <= 0}>
                <ChevronLeft className="mr-2" size={16} />
                {copy.history.previousTrade}
              </Button>
              <Button type="button" variant="secondary" onClick={() => selectNeighborTrade(1)} disabled={selectedTradeIndex >= filteredTrades.length - 1}>
                {copy.history.nextTrade}
                <ChevronRight className="ml-2" size={16} />
              </Button>
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
          className="rounded-xl border border-border/80 bg-secondary/60 p-3 text-left"
          onClick={() => onOpen(index)}
        >
          {imageUrls[image.id] ? (
            <img src={imageUrls[image.id]} alt={image.description ?? "Screenshot"} className="h-52 w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">Loading...</div>
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
    <div className="rounded-xl border border-border/80 bg-secondary/60 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={`mt-2 text-lg font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function MoodBadge({ mood }: { mood: string }) {
  return (
    <span
      className="inline-flex h-12 w-12 items-center justify-center rounded-full border text-[1.65rem] shadow-sm"
      style={{ borderColor: moodColors[mood] ?? "#94a3b8", backgroundColor: `${moodColors[mood] ?? "#94a3b8"}22` }}
    >
      {mood}
    </span>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-secondary/65 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
