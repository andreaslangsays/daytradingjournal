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

  const appendFiles = async (items: Array<{ bytes: number[]; fileName?: string }>, kind: "trade" | "session") => {
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

  const removeScreenshot = (id: string, kind: "trade" | "session") => {
    if (kind === "trade") {
      setScreenshots((current) => {
        const target = current.find((item) => item.id === id);
        if (target) URL.revokeObjectURL(target.previewUrl);
        return current.filter((item) => item.id !== id);
      });
    } else {
      setSessionScreenshots((current) => {
        const target = current.find((item) => item.id === id);
        if (target) URL.revokeObjectURL(target.previewUrl);
        return current.filter((item) => item.id !== id);
      });
    }
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[1.22fr_0.98fr]">
      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <div>
            <CardDescription>{copy.tradeForm.eyebrow}</CardDescription>
            <CardTitle className="mt-1 text-base">{copy.tradeForm.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
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
            <Field label={copy.tradeForm.contracts}>
              <Input type="number" value={form.contracts ?? 1} onChange={(event) => updateField("contracts", Number(event.target.value))} />
            </Field>
            <Field label={copy.tradeForm.entryPrice}>
              <Input type="number" value={form.entryPrice ?? ""} onChange={(event) => updateField("entryPrice", Number(event.target.value))} />
            </Field>
            <Field label={copy.tradeForm.exitPrice}>
              <Input type="number" value={form.exitPrice ?? ""} onChange={(event) => updateField("exitPrice", Number(event.target.value))} />
            </Field>
            <Field label={copy.tradeForm.stopLoss}>
              <Input type="number" value={form.stopLoss ?? ""} onChange={(event) => updateField("stopLoss", Number(event.target.value))} />
            </Field>
            <Field label={copy.tradeForm.takeProfit}>
              <Input type="number" value={form.takeProfit ?? ""} onChange={(event) => updateField("takeProfit", Number(event.target.value))} />
            </Field>
            <Field label={copy.tradeForm.entryTimestamp}>
              <Input type="datetime-local" value={form.entryTimestamp?.slice(0, 16) ?? ""} onChange={(event) => updateField("entryTimestamp", event.target.value)} />
            </Field>
            <Field label={copy.tradeForm.exitTimestamp}>
              <Input type="datetime-local" value={form.exitTimestamp?.slice(0, 16) ?? ""} onChange={(event) => updateField("exitTimestamp", event.target.value)} />
            </Field>
            <Field label={copy.tradeForm.mood}>
              <div className="grid h-9 grid-cols-5 gap-1.5">
                {moods.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => updateField("mood", mood)}
                    className={`rounded-md border text-base transition ${form.mood === mood ? "bg-secondary text-foreground" : "border-border/70 bg-background/60 text-muted-foreground"}`}
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

          <Field label={copy.tradeForm.setupDescription}>
            <Textarea
              className="min-h-[108px]"
              placeholder={copy.tradeForm.setupPlaceholder}
              value={form.setupDescription ?? ""}
              onChange={(event) => updateField("setupDescription", event.target.value)}
            />
          </Field>

          <Field label={copy.tradeForm.tags}>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`rounded-md border px-2.5 py-1 text-xs ${active ? "bg-background/90 text-foreground" : "border-border/70 bg-background/55 text-muted-foreground"}`}
                    style={active ? { borderColor: tagDefinition.color, boxShadow: `inset 0 0 0 1px ${tagDefinition.color}` } : undefined}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </Field>

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

      <div className="grid gap-4">
        <ScreenshotCard
          title={copy.tradeForm.screenshotsTitle}
          eyebrow={copy.tradeForm.screenshotsEyebrow}
          subtitle={copy.tradeForm.screenshotsSubtitle}
          pasteHint={copy.tradeForm.pasteHint}
          emptyLabel={copy.tradeForm.emptyShots}
          addLabel={copy.tradeForm.addFromFiles}
          removeLabel={copy.tradeForm.removeImage}
          descriptionLabel={copy.tradeForm.imageDescription}
          screenshots={screenshots}
          kind="trade"
          onPaste={handlePaste}
          onSelectFiles={selectFiles}
          onDescriptionChange={(id, value) =>
            setScreenshots((current) => current.map((item) => (item.id === id ? { ...item, description: value } : item)))
          }
          onRemove={(id) => removeScreenshot(id, "trade")}
        />

        <ScreenshotCard
          title={copy.tradeForm.sessionScreenshotsTitle}
          eyebrow={copy.tradeForm.session}
          subtitle={copy.tradeForm.sessionScreenshotsSubtitle}
          pasteHint={copy.tradeForm.pasteHint}
          emptyLabel={copy.tradeForm.emptyShots}
          addLabel={copy.tradeForm.addFromFiles}
          removeLabel={copy.tradeForm.removeImage}
          descriptionLabel={copy.tradeForm.imageDescription}
          screenshots={sessionScreenshots}
          kind="session"
          onPaste={handlePaste}
          onSelectFiles={selectFiles}
          onDescriptionChange={(id, value) =>
            setSessionScreenshots((current) => current.map((item) => (item.id === id ? { ...item, description: value } : item)))
          }
          onRemove={(id) => removeScreenshot(id, "session")}
        />
      </div>
    </div>
  );
}

function ScreenshotCard({
  title,
  eyebrow,
  subtitle,
  pasteHint,
  emptyLabel,
  addLabel,
  removeLabel,
  descriptionLabel,
  screenshots,
  kind,
  onPaste,
  onSelectFiles,
  onDescriptionChange,
  onRemove,
}: {
  title: string;
  eyebrow: string;
  subtitle: string;
  pasteHint: string;
  emptyLabel: string;
  addLabel: string;
  removeLabel: string;
  descriptionLabel: string;
  screenshots: PendingScreenshot[];
  kind: "trade" | "session";
  onPaste: (kind: "trade" | "session") => React.ClipboardEventHandler<HTMLDivElement>;
  onSelectFiles: (kind: "trade" | "session") => Promise<void>;
  onDescriptionChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="border border-border/80 bg-secondary/40 shadow-none">
      <CardHeader className="pb-2">
        <div>
          <CardDescription>{eyebrow}</CardDescription>
          <CardTitle className="mt-1 text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-5 text-muted-foreground">{subtitle}</p>
        <div
          tabIndex={0}
          onPaste={onPaste(kind)}
          className="rounded-md border border-dashed border-border/80 bg-background/55 p-4 outline-none transition focus:border-primary"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{pasteHint}</p>
            <Button type="button" variant="secondary" onClick={() => void onSelectFiles(kind)}>
              {addLabel}
            </Button>
          </div>
        </div>

        {screenshots.length === 0 ? <p className="text-xs text-muted-foreground">{emptyLabel}</p> : null}

        <div className="grid gap-3 md:grid-cols-2">
          {screenshots.map((shot) => (
            <div key={shot.id} className="rounded-md border border-border/80 bg-background/55 p-3">
              <img src={shot.previewUrl} alt="Screenshot preview" className="h-36 w-full rounded-md object-cover" />
              <label className="mt-3 grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">{descriptionLabel}</span>
                <Input value={shot.description} onChange={(event) => onDescriptionChange(shot.id, event.target.value)} />
              </label>
              <Button type="button" variant="ghost" className="mt-2 px-0" onClick={() => onRemove(shot.id)}>
                {removeLabel}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
