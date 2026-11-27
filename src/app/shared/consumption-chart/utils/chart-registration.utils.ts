import { BaseChartDirective } from 'ng2-charts';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { registerChartPlugins } from '../plugins/chart-plugins';

let chartPluginsRegistered = false;
let zoomPluginPromise: Promise<void> | null = null;

export function ensureChartPluginsRegistered(): void {
  if (chartPluginsRegistered) return;
  chartPluginsRegistered = true;
  Chart.register(
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
  );
  registerChartPlugins();
}

export function ensureZoomPluginLoaded(onRegistered?: () => void): void {
  if (typeof window === 'undefined') return;
  zoomPluginPromise ??= (async () => {
    await import('hammerjs');
    const { default: zoomPlugin } = await import('chartjs-plugin-zoom');
    Chart.register(zoomPlugin);
  })();
  if (onRegistered) {
    void zoomPluginPromise.then(onRegistered).catch(() => {
      // Non-critical zoom enhancement
    });
  }
}

export function clearChartActiveElements(chartDirective: BaseChartDirective | undefined): void {
  const chartInstance = chartDirective?.chart;
  if (chartInstance && typeof chartInstance.setActiveElements === 'function') {
    chartInstance.setActiveElements([]);
    chartInstance.tooltip?.setActiveElements?.([], { x: 0, y: 0 });
    chartInstance.update('none');
  }
}
