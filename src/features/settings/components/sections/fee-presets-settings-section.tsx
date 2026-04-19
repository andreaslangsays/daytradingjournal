import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { InstrumentFeePresets } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const instruments = ["ES", "NQ", "MES", "MNQ", "CL", "MCL", "BTCUS"] as const;

interface FeePresetsSettingsSectionProps {
  feePresets: InstrumentFeePresets;
  onSaveFeePresets: (presets: InstrumentFeePresets) => Promise<void>;
}

export function FeePresetsSettingsSection({ feePresets, onSaveFeePresets }: FeePresetsSettingsSectionProps) {
  const { copy } = useI18n();
  const [localFeePresets, setLocalFeePresets] = useState<InstrumentFeePresets>(feePresets);

  useEffect(() => {
    setLocalFeePresets(feePresets);
  }, [feePresets]);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div>
          <CardDescription>{copy.settings.feesTitle}</CardDescription>
          <CardTitle className="mt-1 text-sm">{copy.settings.feesTitle}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[12px] leading-5 text-muted-foreground">{copy.settings.feesText}</p>
        <div className="overflow-x-auto rounded-[5px] border border-border/80">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/80">
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">{copy.tradeForm.instrument}</th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted-foreground">{copy.settings.feeColumn}</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((instrument) => (
                <tr key={instrument} className="border-b border-border/80">
                  <td className="px-3 py-2 font-medium text-foreground">{instrument}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={localFeePresets[instrument] ?? 0}
                      onChange={(event) =>
                        setLocalFeePresets((current) => ({
                          ...current,
                          [instrument]: Number(event.target.value),
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onSaveFeePresets(localFeePresets)}>{copy.settings.saveFees}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
