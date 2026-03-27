import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { LanguageCode, ThemeMode, TradeTag } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface SettingsScreenProps {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  tags: TradeTag[];
  onSaveTag: (tag: TradeTag) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onClearJournal: (confirmation: string) => Promise<void>;
}

export function SettingsScreen({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  tags,
  onSaveTag,
  onDeleteTag,
  onClearJournal,
}: SettingsScreenProps) {
  const { copy } = useI18n();
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("#22d3ee");
  const [confirmation, setConfirmation] = useState("");
  const [editedTags, setEditedTags] = useState<Record<string, TradeTag>>({});

  const sortedTags = useMemo(() => tags, [tags]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div>
              <CardDescription>{copy.settings.eyebrow}</CardDescription>
              <CardTitle className="mt-2 text-3xl">{copy.settings.title}</CardTitle>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardDescription>{copy.settings.languageTitle}</CardDescription>
              <CardTitle className="mt-2 text-2xl">{copy.settings.languageTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{copy.settings.languageText}</p>
            <select
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}
              className="h-11 w-full rounded-xl border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="de">{copy.languages.de}</option>
              <option value="en">{copy.languages.en}</option>
              <option value="es">{copy.languages.es}</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={theme === "light" ? "default" : "secondary"} onClick={() => onThemeChange("light")}>
                {copy.app.themeLight}
              </Button>
              <Button variant={theme === "dark" ? "default" : "secondary"} onClick={() => onThemeChange("dark")}>
                {copy.app.themeDark}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardDescription>{copy.settings.tagsTitle}</CardDescription>
              <CardTitle className="mt-2 text-2xl">{copy.settings.tagsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{copy.settings.tagsText}</p>
            <div className="grid gap-3 rounded-xl border border-border/80 bg-secondary/60 p-4 md:grid-cols-[minmax(0,1fr)_140px_150px]">
              <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={copy.settings.newTagName} />
              <Input type="color" value={draftColor} onChange={(event) => setDraftColor(event.target.value)} className="h-11 w-full p-2" />
              <Button
                onClick={async () => {
                  if (!draftName.trim()) return;
                  await onSaveTag({ id: crypto.randomUUID(), name: draftName.trim(), color: draftColor });
                  setDraftName("");
                  setDraftColor("#22d3ee");
                }}
              >
                {copy.settings.addTag}
              </Button>
            </div>

            <div className="space-y-3">
              {sortedTags.map((tag) => {
                const editable = editedTags[tag.id] ?? tag;
                return (
                  <div key={tag.id} className="grid gap-3 rounded-xl border border-border/80 bg-background/55 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_120px]">
                    <Input
                      value={editable.name}
                      onChange={(event) =>
                        setEditedTags((current) => ({
                          ...current,
                          [tag.id]: { ...editable, name: event.target.value },
                        }))
                      }
                    />
                    <Input
                      type="color"
                      value={editable.color}
                      onChange={(event) =>
                        setEditedTags((current) => ({
                          ...current,
                          [tag.id]: { ...editable, color: event.target.value },
                        }))
                      }
                      className="h-11 w-full p-2"
                    />
                    <Button variant="secondary" onClick={() => onSaveTag(editable)}>
                      {copy.settings.saveTag}
                    </Button>
                    <Button variant="ghost" onClick={() => onDeleteTag(tag.id)}>
                      {copy.settings.deleteTag}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="border-danger/20">
          <CardHeader>
            <div>
              <CardDescription>{copy.settings.dangerTitle}</CardDescription>
              <CardTitle className="mt-2 text-2xl">{copy.settings.dangerTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">{copy.settings.dangerText}</p>
            <p className="text-sm text-muted-foreground">{copy.settings.resetHint}</p>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-muted-foreground">{copy.settings.confirmationLabel}</span>
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={copy.settings.confirmationPlaceholder}
              />
            </label>
            <Button
              variant="accent"
              className="w-full"
              onClick={async () => {
                await onClearJournal(confirmation);
                setConfirmation("");
              }}
            >
              {copy.settings.clearButton}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
