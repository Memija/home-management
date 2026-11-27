import { describe, expect, it, vi } from 'vitest';
import { BaseChartDirective } from 'ng2-charts';
import { clearChartActiveElements, ensureChartPluginsRegistered } from './chart-registration.utils';

describe('chart-registration.utils', () => {
  it('should register Chart.js controllers/plugins idempotently', () => {
    expect(() => {
      ensureChartPluginsRegistered();
      ensureChartPluginsRegistered();
    }).not.toThrow();
  });

  it('should clear active chart and tooltip elements safely', () => {
    const setActiveElements = vi.fn();
    const tooltipSetActive = vi.fn();
    const update = vi.fn();

    clearChartActiveElements({
      chart: {
        setActiveElements,
        tooltip: { setActiveElements: tooltipSetActive },
        update,
      },
    } as unknown as BaseChartDirective);

    expect(setActiveElements).toHaveBeenCalledWith([]);
    expect(tooltipSetActive).toHaveBeenCalledWith([], { x: 0, y: 0 });
    expect(update).toHaveBeenCalledWith('none');

    expect(() => clearChartActiveElements(undefined)).not.toThrow();
  });
});
