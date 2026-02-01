import { ConsumptionRecord, DynamicHeatingRecord, ElectricityRecord } from '../../models/records.model';

// Re-export types for consumers
export type { ChartView, DisplayMode } from '../../services/chart-data.service';
export type { ChartView as ChartViewType, DisplayMode as DisplayModeType } from '../../services/chart-data.service';

/**
 * Union type for all chart data point types.
 * Supports water consumption, home consumption, and dynamic heating records.
 */
export type ChartDataPoint = ConsumptionRecord | DynamicHeatingRecord | ElectricityRecord;

/**
 * Configuration interface for the consumption chart component.
 */
export interface ChartConfig {
  view: import('../../services/chart-data.service').ChartView;
  onViewChange: (view: import('../../services/chart-data.service').ChartView) => void;
}
