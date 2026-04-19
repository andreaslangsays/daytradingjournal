import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface DangerZoneSettingsSectionProps {
  onClearJournal: (confirmation: string) => Promise<void>;
}

export function DangerZoneSettingsSection({ onClearJournal }: DangerZoneSettingsSectionProps) {
  const { copy } = useI18n();
  const [confirmation, setConfirmation] = useState("");

  return (
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
  );
}
