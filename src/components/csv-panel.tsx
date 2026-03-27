import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { CsvMapping, CsvPreview } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

const internalFields = [
  "entry_timestamp",
  "exit_timestamp",
  "instrument",
  "side",
  "entry_price",
  "exit_price",
  "contracts",
  "stop_loss",
  "take_profit",
  "setup_description",
  "tags",
];

interface CsvPanelProps {
  preview: CsvPreview | null;
  onPreview: (path: string) => Promise<void>;
  onImport: (path: string, mapping: CsvMapping) => Promise<void>;
  onExport: (path: string) => Promise<void>;
}

export function CsvPanel({ preview, onPreview, onImport, onExport }: CsvPanelProps) {
  const { copy } = useI18n();
  const [csvPath, setCsvPath] = useState("");
  const [exportPath, setExportPath] = useState("journal-export.csv");
  const [mapping, setMapping] = useState<CsvMapping>({});

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardDescription>{copy.csv.importEyebrow}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{copy.csv.importTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={csvPath} onChange={(event) => setCsvPath(event.target.value)} placeholder={copy.csv.importPlaceholder} />
          <Button onClick={() => onPreview(csvPath)}>{copy.csv.loadPreview}</Button>
          {preview ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                {internalFields.map((field) => (
                  <label key={field} className="grid gap-2">
                    <span className="text-sm text-muted-foreground">{field}</span>
                    <Select value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}>
                      <option value="">{copy.csv.ignore}</option>
                      {preview.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </Select>
                  </label>
                ))}
              </div>
              <Button variant="accent" onClick={() => onImport(csvPath, mapping)}>
                {copy.csv.importRows}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardDescription>{copy.csv.exportEyebrow}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{copy.csv.exportTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={exportPath} onChange={(event) => setExportPath(event.target.value)} placeholder={copy.csv.exportPlaceholder} />
          <Button onClick={() => onExport(exportPath)}>{copy.csv.exportAll}</Button>
          {preview ? (
            <div className="overflow-x-auto rounded-[5px] border border-border/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80">
                    {preview.headers.map((header) => (
                      <th key={header} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleRows.map((row, index) => (
                    <tr key={index} className="border-b border-border/80">
                      {row.map((value, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {copy.csv.previewHint}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
