import { useMemo } from "react";
import type { useI18n } from "@/lib/i18n";
import type { DashboardMetrics } from "@/lib/types";
import { buildDashboardPresentationModel } from "@/features/analytics/presentation/dashboard-view-model";

export function useDashboardPresentation({
  copy,
  locale,
  metrics,
}: {
  copy: ReturnType<typeof useI18n>["copy"];
  locale: string;
  metrics: DashboardMetrics;
}) {
  return useMemo(
    () =>
      buildDashboardPresentationModel({
        copy,
        locale,
        metrics,
      }),
    [copy, locale, metrics],
  );
}
