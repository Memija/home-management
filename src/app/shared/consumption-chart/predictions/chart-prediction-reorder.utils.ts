import { AppChartDataset } from '../../../models/records.model';

/**
 * Reorders datasets so that all datasets belonging to the same category or its
 * trendline are grouped together, placing global/unassigned datasets at the end.
 */
export function reorderDatasets(datasets: AppChartDataset[]): void {
  const categoryGroups = new Map<string, AppChartDataset[]>();
  const otherDatasets: AppChartDataset[] = [];

  for (const ds of datasets) {
    const catId = ds.categoryId || ds.trendlineFor;
    if (catId) {
      let group = categoryGroups.get(catId);
      if (!group) {
        group = [];
        categoryGroups.set(catId, group);
      }
      group.push(ds);
    } else {
      otherDatasets.push(ds);
    }
  }

  datasets.length = 0;
  for (const group of categoryGroups.values()) {
    datasets.push(...group);
  }
  datasets.push(...otherDatasets);
}
