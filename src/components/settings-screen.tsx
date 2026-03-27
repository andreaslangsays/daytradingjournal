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

type SettingsSection = "general" | "tags" | "system";

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
  const [section, setSection] = useState<SettingsSection>("general");
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("#22d3ee");
  const [confirmation, setConfirmation] = useState("");
  const [editedTags, setEditedTags] = useState<Record<string, TradeTag>>({});

  const sortedTags = useMemo(() => tags, [tags]);
  const sections: Array<{ id: SettingsSection; label: string }> = [
    { id: "general", label: copy.settings.languageTitle },
    { id: "tags", label: copy.settings.tagsTitle },
    { id: "system", label: copy.settings.dangerTitle },
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)]">
      <aside className="space-y-1">
        <section className="border-b border-border/70 pb-2">
          <p className="text-[11px] text-muted-foreground">{copy.settings.eyebrow}</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{copy.settings.title}</h2>
        </section>
        {sections.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`flex h-8 w-full items-center rounded-[4px] border px-2.5 text-left text-[12px] ${
              section === item.id
                ? "border-border bg-secondary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/55 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </aside>

      <div className="space-y-3">
        {section === "general" ? (
          <Card className="shadow-none">
            <CardHeader>
              <div>
                <CardDescription>{copy.settings.languageTitle}</CardDescription>
                <CardTitle className="mt-1 text-sm">{copy.settings.languageTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{copy.settings.languageTitle}</span>
                <select
                  value={language}
                  onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}
                  className="h-9 w-full rounded-[5px] border border-border bg-secondary px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="de">{copy.languages.de}</option>
                  <option value="en">{copy.languages.en}</option>
                  <option value="es">{copy.languages.es}</option>
                </select>
              </label>

              <div className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Theme</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={theme === "light" ? "default" : "secondary"} onClick={() => onThemeChange("light")}>
                    {copy.app.themeLight}
                  </Button>
                  <Button variant={theme === "dark" ? "default" : "secondary"} onClick={() => onThemeChange("dark")}>
                    {copy.app.themeDark}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {section === "tags" ? (
          <Card className="shadow-none">
            <CardHeader>
              <div>
                <CardDescription>{copy.settings.tagsTitle}</CardDescription>
                <CardTitle className="mt-1 text-sm">{copy.settings.tagsTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_90px_110px]">
                <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={copy.settings.newTagName} />
                <Input type="color" value={draftColor} onChange={(event) => setDraftColor(event.target.value)} className="h-9 w-full p-1" />
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

              <div className="overflow-x-auto rounded-[5px] border border-border/80">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/80">
                      <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">Tag</th>
                      <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">Color</th>
                      <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTags.map((tag) => {
                      const editable = editedTags[tag.id] ?? tag;
                      return (
                        <tr key={tag.id} className="border-b border-border/80">
                          <td className="px-3 py-2">
                            <Input
                              value={editable.name}
                              onChange={(event) =>
                                setEditedTags((current) => ({
                                  ...current,
                                  [tag.id]: { ...editable, name: event.target.value },
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="color"
                              value={editable.color}
                              onChange={(event) =>
                                setEditedTags((current) => ({
                                  ...current,
                                  [tag.id]: { ...editable, color: event.target.value },
                                }))
                              }
                              className="h-9 w-16 p-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <Button variant="secondary" onClick={() => onSaveTag(editable)}>
                                {copy.settings.saveTag}
                              </Button>
                              <Button variant="ghost" onClick={() => onDeleteTag(tag.id)}>
                                {copy.settings.deleteTag}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {section === "system" ? (
          <Card className="border-danger/20 shadow-none">
            <CardHeader>
              <div>
                <CardDescription>{copy.settings.dangerTitle}</CardDescription>
                <CardTitle className="mt-1 text-sm">{copy.settings.dangerTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] leading-5 text-muted-foreground">{copy.settings.dangerText}</p>
              <label className="grid gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{copy.settings.confirmationLabel}</span>
                <Input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={copy.settings.confirmationPlaceholder}
                />
              </label>
              <Button
                variant="accent"
                onClick={async () => {
                  await onClearJournal(confirmation);
                  setConfirmation("");
                }}
              >
                {copy.settings.clearButton}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
