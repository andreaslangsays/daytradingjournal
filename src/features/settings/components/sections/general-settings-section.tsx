import { useI18n } from "@/lib/i18n";
import type { LanguageCode, ThemeMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GeneralSettingsSectionProps {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function GeneralSettingsSection({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
}: GeneralSettingsSectionProps) {
  const { copy } = useI18n();

  return (
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
  );
}
