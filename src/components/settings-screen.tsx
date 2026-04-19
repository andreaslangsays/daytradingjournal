import { useMemo, useState } from "react";
import type { InstrumentFeePresets, LanguageCode, ThemeMode, TradeTag } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { DangerZoneSettingsSection } from "@/features/settings/components/sections/danger-zone-settings-section";
import { FeePresetsSettingsSection } from "@/features/settings/components/sections/fee-presets-settings-section";
import { GeneralSettingsSection } from "@/features/settings/components/sections/general-settings-section";
import { TagCatalogSettingsSection } from "@/features/settings/components/sections/tag-catalog-settings-section";

interface SettingsScreenProps {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  tags: TradeTag[];
  onSaveTag: (tag: TradeTag) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onClearJournal: (confirmation: string) => Promise<void>;
  feePresets: InstrumentFeePresets;
  onSaveFeePresets: (presets: InstrumentFeePresets) => Promise<void>;
}

type SettingsSection = "general" | "fees" | "tags" | "system";

export function SettingsScreen({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  tags,
  onSaveTag,
  onDeleteTag,
  onClearJournal,
  feePresets,
  onSaveFeePresets,
}: SettingsScreenProps) {
  const { copy } = useI18n();
  const [section, setSection] = useState<SettingsSection>("general");

  const sections = useMemo<Array<{ id: SettingsSection; label: string }>>(
    () => [
      { id: "general", label: copy.settings.languageTitle },
      { id: "fees", label: copy.settings.feesTitle },
      { id: "tags", label: copy.settings.tagsTitle },
      { id: "system", label: copy.settings.dangerTitle },
    ],
    [copy.settings.dangerTitle, copy.settings.feesTitle, copy.settings.languageTitle, copy.settings.tagsTitle],
  );

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
          <GeneralSettingsSection
            language={language}
            onLanguageChange={onLanguageChange}
            theme={theme}
            onThemeChange={onThemeChange}
          />
        ) : null}

        {section === "fees" ? (
          <FeePresetsSettingsSection feePresets={feePresets} onSaveFeePresets={onSaveFeePresets} />
        ) : null}

        {section === "tags" ? (
          <TagCatalogSettingsSection tags={tags} onDeleteTag={onDeleteTag} onSaveTag={onSaveTag} />
        ) : null}

        {section === "system" ? (
          <DangerZoneSettingsSection onClearJournal={onClearJournal} />
        ) : null}
      </div>
    </div>
  );
}
