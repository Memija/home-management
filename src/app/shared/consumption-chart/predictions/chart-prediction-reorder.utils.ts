import { AppChartDataset } from '../../../models/records.model';

/**
 * Reorders datasets so that all datasets belonging to the same category or its
 * trendline are grouped together, placing global/unassigned datasets at the end.
 */
export function reorderDatasets(datasets: AppChartDataset[]): void {
  const groupedDatasets: AppChartDataset[] = [];
  const otherDatasets: AppChartDataset[] = [];
  const categoryIds = Array.from(
    new Set(
      datasets
        .map((ds) => (ds as AppChartDataset).categoryId || (ds as AppChartDataset).trendlineFor)
        .filter(Boolean),
    ),
  );

  categoryIds.forEach((catId) => {
    groupedDatasets.push(
      ...datasets.filter(
        (ds) =>
          (ds as AppChartDataset).categoryId === catId ||
          (ds as AppChartDataset).trendlineFor === catId,
      ),
    );
  });

  otherDatasets.push(
    ...datasets.filter(
      (ds) => !(ds as AppChartDataset).categoryId && !(ds as AppChartDataset).trendlineFor,
    ),
  );

  datasets.length = 0;
  datasets.push(...groupedDatasets, ...otherDatasets);
}
