import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { TradeTag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TagCatalogSettingsSectionProps {
  tags: TradeTag[];
  onDeleteTag: (tagId: string) => Promise<void>;
  onSaveTag: (tag: TradeTag) => Promise<void>;
}

export function TagCatalogSettingsSection({ tags, onDeleteTag, onSaveTag }: TagCatalogSettingsSectionProps) {
  const { copy } = useI18n();
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState("#22d3ee");
  const [editedTags, setEditedTags] = useState<Record<string, TradeTag>>({});
  const sortedTags = useMemo(() => tags, [tags]);

  return (
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
              if (!draftName.trim()) {
                return;
              }
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
  );
}
