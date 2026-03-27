import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { PendingScreenshot, TradeRecord, TradeTag } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

const moods = ["😄", "🙂", "😐", "😵", "😤"];
const moodColors: Record<string, string> = {
  "😄": "#22c55e",
  "🙂": "#38bdf8",
  "😐": "#94a3b8",
  "😵": "#fb923c",
  "😤": "#ef4444",
};

interface TradeFormProps {
  onSubmit: (trade: Partial<TradeRecord>) => Promise<TradeRecord>;
  availableTags: TradeTag[];
  onAttachScreenshots: (tradeId: string, screenshots: PendingScreenshot[]) => Promise<void>;
  onAttachSessionScreenshots: (sessionId: string, screenshots: PendingScreenshot[]) => Promise<void>;
}

export function TradeForm({ onSubmit, availableTags, onAttachScreenshots, onAttachSessionScreenshots }: TradeFormProps) {
  const { copy } = useI18n();
  const [form, setForm] = useState<Partial<TradeRecord>>({
    sessionId: `${new Date().toISOString().slice(0, 10)}-01`,
    instrument: "ES",
    side: "LONG",
    contracts: 1,
    mood: "🙂",
    tags: [],
    entryTimestamp: new Date().toISOString().slice(0, 16),
    exitTimestamp: new Date().toISOString().slice(0, 16),
  });
  const [screenshots, setScreenshots] = useState<PendingScreenshot[]>([]);
  const [sessionScreenshots, setSessionScreenshots] = useState<PendingScreenshot[]>([]);

  const updateField = (key: keyof TradeRecord, value: unknown) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const appendFiles = async (
    items: Array<{ bytes: number[]; fileName?: string }>,
    kind: "trade" | "session",
  ) => {
    const next = await Promise.all(
      items.map(async ({ bytes, fileName }) => {
        const blob = new Blob([Uint8Array.from(bytes)]);
        return {
          id: crypto.randomUUID(),
          bytes,
          previewUrl: URL.createObjectURL(blob),
          description: "",
          fileName,
        } satisfies PendingScreenshot;
      }),
    );
    if (kind === "trade") {
      setScreenshots((current) => [...current, ...next]);
    } else {
      setSessionScreenshots((current) => [...current, ...next]);
    }
  };

  const selectFiles = async (kind: "trade" | "session") => {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (!selected) return;
    const files = Array.isArray(selected) ? selected : [selected];
    const bytes = await Promise.all(
      files.map(async (path) => ({
        bytes: Array.from(await readFile(path)),
        fileName: path.split("/").pop(),
      })),
    );
    await appendFiles(bytes, kind);
  };

  const handlePaste =
    (kind: "trade" | "session"): React.ClipboardEventHandler<HTMLDivElement> =>
    async (event) => {
      const fileItems = Array.from(event.clipboardData.items).filter((item) => item.type.startsWith("image/"));
      if (fileItems.length === 0) {
        return;
      }
      event.preventDefault();
      const images = await Promise.all(
        fileItems.map(async (item, index) => {
          const file = item.getAsFile();
          if (!file) {
            return null;
          }
          return {
            bytes: Array.from(new Uint8Array(await file.arrayBuffer())),
            fileName: file.name || `pasted-${index + 1}.png`,
          };
        }),
      );
      const validImages = images.filter((item): item is { bytes: number[]; fileName: string } => item !== null);
      await appendFiles(validImages, kind);
    };

  const removeScreenshot = (id: string) => {
    setScreenshots((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const removeSessionScreenshot = (id: string) => {
    setSessionScreenshots((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>{copy.tradeForm.eyebrow}</CardDescription>
          <CardTitle className="mt-2 text-2xl">{copy.tradeForm.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label={copy.tradeForm.instrument}>
            <Select value={form.instrument} onChange={(event) => updateField("instrument", event.target.value)}>
              <option value="ES">ES</option>
              <option value="NQ">NQ</option>
              <option value="CL">CL</option>
              <option value="CUSTOM">{copy.tradeForm.custom}</option>
            </Select>
          </Field>
          <Field label={copy.tradeForm.side}>
            <Select value={form.side} onChange={(event) => updateField("side", event.target.value)}>
              <option value="LONG">{copy.tradeForm.long}</option>
              <option value="SHORT">{copy.tradeForm.short}</option>
            </Select>
          </Field>
          <Field label={copy.tradeForm.session}>
            <Input value={form.sessionId ?? ""} onChange={(event) => updateField("sessionId", event.target.value)} />
          </Field>
          <Field label={copy.tradeForm.entryPrice}>
            <Input type="number" value={form.entryPrice ?? ""} onChange={(event) => updateField("entryPrice", Number(event.target.value))} />
          </Field>
          <Field label={copy.tradeForm.exitPrice}>
            <Input type="number" value={form.exitPrice ?? ""} onChange={(event) => updateField("exitPrice", Number(event.target.value))} />
          </Field>
          <Field label={copy.tradeForm.contracts}>
            <Input type="number" value={form.contracts ?? 1} onChange={(event) => updateField("contracts", Number(event.target.value))} />
          </Field>
          <Field label={copy.tradeForm.stopLoss}>
            <Input type="number" value={form.stopLoss ?? ""} onChange={(event) => updateField("stopLoss", Number(event.target.value))} />
          </Field>
          <Field label={copy.tradeForm.takeProfit}>
            <Input type="number" value={form.takeProfit ?? ""} onChange={(event) => updateField("takeProfit", Number(event.target.value))} />
          </Field>
          <Field label={copy.tradeForm.mood}>
            <div className="grid h-11 grid-cols-5 gap-2">
              {moods.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => updateField("mood", mood)}
                  className={`rounded-lg border text-2xl ${form.mood === mood ? "bg-secondary" : "border-border/70 bg-background/60"}`}
                  style={{
                    borderColor: form.mood === mood ? moodColors[mood] : undefined,
                    boxShadow: form.mood === mood ? `inset 0 0 0 1px ${moodColors[mood]}` : undefined,
                  }}
                >
                  {mood}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={copy.tradeForm.entryTimestamp}>
            <Input type="datetime-local" value={form.entryTimestamp?.slice(0, 16) ?? ""} onChange={(event) => updateField("entryTimestamp", event.target.value)} />
          </Field>
          <Field label={copy.tradeForm.exitTimestamp}>
            <Input type="datetime-local" value={form.exitTimestamp?.slice(0, 16) ?? ""} onChange={(event) => updateField("exitTimestamp", event.target.value)} />
          </Field>
        </div>

        <Field label={copy.tradeForm.setupDescription}>
          <Textarea
            placeholder={copy.tradeForm.setupPlaceholder}
            value={form.setupDescription ?? ""}
            onChange={(event) => updateField("setupDescription", event.target.value)}
          />
        </Field>

        <Field label={copy.tradeForm.tags}>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tagDefinition) => {
              const tag = tagDefinition.name;
              const active = form.tags?.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    updateField(
                      "tags",
                      active ? form.tags?.filter((item) => item !== tag) : [...(form.tags ?? []), tag],
                    )
                  }
                  className={`rounded-full border px-3 py-2 text-sm ${active ? "bg-background/90 text-foreground" : "border-border/70 bg-background/55 text-muted-foreground"}`}
                  style={active ? { borderColor: tagDefinition.color, boxShadow: `inset 0 0 0 1px ${tagDefinition.color}` } : undefined}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </Field>

        <Card className="border border-border/80 bg-secondary/40 shadow-none">
          <CardHeader>
            <div>
              <CardDescription>{copy.tradeForm.screenshotsEyebrow}</CardDescription>
              <CardTitle className="mt-2 text-xl">{copy.tradeForm.screenshotsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{copy.tradeForm.screenshotsSubtitle}</p>
            <div
              tabIndex={0}
              onPaste={handlePaste("trade")}
              className="rounded-xl border border-dashed border-border/80 bg-background/55 p-5 outline-none transition focus:border-primary"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{copy.tradeForm.pasteHint}</p>
                <Button type="button" variant="secondary" onClick={() => void selectFiles("trade")}>
                  {copy.tradeForm.addFromFiles}
                </Button>
              </div>
            </div>

            {screenshots.length === 0 ? <p className="text-sm text-muted-foreground">{copy.tradeForm.emptyShots}</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
              {screenshots.map((shot) => (
                <div key={shot.id} className="rounded-xl border border-border/80 bg-background/55 p-4">
                  <img src={shot.previewUrl} alt="Screenshot preview" className="h-44 w-full rounded-xl object-cover" />
                  <label className="mt-4 grid gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{copy.tradeForm.imageDescription}</span>
                    <Input
                      value={shot.description}
                      onChange={(event) =>
                        setScreenshots((current) =>
                          current.map((item) => (item.id === shot.id ? { ...item, description: event.target.value } : item)),
                        )
                      }
                    />
                  </label>
                  <Button type="button" variant="ghost" className="mt-3" onClick={() => removeScreenshot(shot.id)}>
                    {copy.tradeForm.removeImage}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-secondary/40 shadow-none">
          <CardHeader>
            <div>
              <CardDescription>{copy.tradeForm.session}</CardDescription>
              <CardTitle className="mt-2 text-xl">{copy.tradeForm.sessionScreenshotsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{copy.tradeForm.sessionScreenshotsSubtitle}</p>
            <div
              tabIndex={0}
              onPaste={handlePaste("session")}
              className="rounded-xl border border-dashed border-border/80 bg-background/55 p-5 outline-none transition focus:border-primary"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{copy.tradeForm.pasteHint}</p>
                <Button type="button" variant="secondary" onClick={() => void selectFiles("session")}>
                  {copy.tradeForm.addFromFiles}
                </Button>
              </div>
            </div>
            {sessionScreenshots.length === 0 ? <p className="text-sm text-muted-foreground">{copy.tradeForm.emptyShots}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              {sessionScreenshots.map((shot) => (
                <div key={shot.id} className="rounded-xl border border-border/80 bg-background/55 p-4">
                  <img src={shot.previewUrl} alt="Session screenshot preview" className="h-44 w-full rounded-xl object-cover" />
                  <label className="mt-4 grid gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{copy.tradeForm.imageDescription}</span>
                    <Input
                      value={shot.description}
                      onChange={(event) =>
                        setSessionScreenshots((current) =>
                          current.map((item) => (item.id === shot.id ? { ...item, description: event.target.value } : item)),
                        )
                      }
                    />
                  </label>
                  <Button type="button" variant="ghost" className="mt-3" onClick={() => removeSessionScreenshot(shot.id)}>
                    {copy.tradeForm.removeImage}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={async () => {
              const savedTrade = await onSubmit(form);
              if (savedTrade.id && screenshots.length > 0) {
                await onAttachScreenshots(savedTrade.id, screenshots);
                screenshots.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
                setScreenshots([]);
              }
              if (savedTrade.sessionId && sessionScreenshots.length > 0) {
                await onAttachSessionScreenshots(savedTrade.sessionId, sessionScreenshots);
                sessionScreenshots.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
                setSessionScreenshots([]);
              }
            }}
          >
            {copy.tradeForm.saveTrade}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
