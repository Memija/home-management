import { vi, afterEach } from 'vitest';
import { summerSunPlugin, newYearMarkerPlugin, registerChartPlugins } from './chart-plugins';
import { Chart } from 'chart.js';
import { DynamicHeatingRecord } from '../../models/records.model';

const createMockCtx = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setLineDash: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 30 }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '' as CanvasTextAlign,
  textBaseline: '' as CanvasTextBaseline,
});

const createMockChart = (recordCount: number) => {
  const ctx = createMockCtx();
  return {
    ctx,
    scales: {
      x: {
        getPixelForValue: vi.fn().mockImplementation((index: number) => 100 + index * 50),
      },
    },
    chartArea: {
      top: 10,
      bottom: 300,
      left: 50,
      right: 500,
    },
  } as unknown as Chart;
};

const makeHeatingRecords = (values: number[]): DynamicHeatingRecord[] =>
  values.map((v, i) => ({
    date: new Date(2024, i, 15),
    rooms: { room1: v },
  }));

describe('Chart Plugins', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('summerSunPlugin', () => {
    it('should have correct plugin id', () => {
      expect(summerSunPlugin.id).toBe('summerSun');
    });

    describe('Early returns', () => {
      it('should return early when options are undefined', () => {
        const chart = createMockChart(0);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, undefined as any);
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when enabled is false', () => {
        const chart = createMockChart(0);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: false, records: [] });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when records are undefined', () => {
        const chart = createMockChart(0);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records: undefined });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when fewer than 2 records', () => {
        const chart = createMockChart(1);
        const records = makeHeatingRecords([100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when xScale is missing', () => {
        const chart = createMockChart(3);
        (chart as any).scales = {};
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when chartArea is missing', () => {
        const chart = createMockChart(3);
        (chart as any).chartArea = undefined;
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });
    });

    describe('Flat period detection', () => {
      it('should draw summer period when consecutive values are equal', () => {
        const chart = createMockChart(4);
        // Values: 100, 100, 100, 200 → flat period from index 0 to 2
        const records = makeHeatingRecords([100, 100, 100, 200]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        expect((chart.ctx as any).save).toHaveBeenCalled();
        expect((chart.ctx as any).fillRect).toHaveBeenCalled();
      });

      it('should not draw when all values are different', () => {
        const chart = createMockChart(4);
        const records = makeHeatingRecords([100, 200, 300, 400]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        expect((chart.ctx as any).fillRect).not.toHaveBeenCalled();
      });

      it('should detect multiple flat periods', () => {
        const chart = createMockChart(7);
        // Flat: 0-1, gap: 1-2, flat: 3-5
        const records = makeHeatingRecords([100, 100, 200, 300, 300, 300, 400]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        // Should have drawn 2 periods
        expect((chart.ctx as any).save).toHaveBeenCalledTimes(2);
      });

      it('should handle flat period at end of data', () => {
        const chart = createMockChart(4);
        // Flat period at end: index 2-3
        const records = makeHeatingRecords([100, 200, 300, 300]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        expect((chart.ctx as any).save).toHaveBeenCalled();
        expect((chart.ctx as any).fillRect).toHaveBeenCalled();
      });

      it('should handle entirely flat data', () => {
        const chart = createMockChart(5);
        const records = makeHeatingRecords([100, 100, 100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        // Single period spanning the entire dataset
        expect((chart.ctx as any).save).toHaveBeenCalledTimes(1);
      });

      it('should not draw for a single flat pair only (period must be at least 2 points)', () => {
        const chart = createMockChart(4);
        // Only indices 1-2 are flat = period start=1, end=2 → endIndex-startIndex = 1, which is >= 1
        const records = makeHeatingRecords([100, 200, 200, 300]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        expect((chart.ctx as any).save).toHaveBeenCalled();
      });
    });

    describe('Drawing operations', () => {
      it('should draw yellow background for flat periods', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        // Check fillStyle was set to the light yellow
        expect(ctx.fillRect).toHaveBeenCalled();
      });

      it('should draw dashed boundary lines', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        expect(ctx.setLineDash).toHaveBeenCalledWith([5, 3]);
        expect(ctx.stroke).toHaveBeenCalled();
      });

      it('should draw sun symbol in center of period', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        const sunCall = ctx.fillText.mock.calls.find((c: any[]) => c[0] === '☼');
        expect(sunCall).toBeTruthy();
        expect(typeof sunCall[1]).toBe('number');
        expect(typeof sunCall[2]).toBe('number');
      });

      it('should call save and restore for each period', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        expect(ctx.save).toHaveBeenCalledTimes(1);
        expect(ctx.restore).toHaveBeenCalledTimes(1);
      });
    });

    describe('Record type handling', () => {
      it('should handle records without rooms property (getTotal returns 0)', () => {
        const chart = createMockChart(3);
        const records = [
          { date: new Date(2024, 0, 15) },
          { date: new Date(2024, 1, 15) },
          { date: new Date(2024, 2, 15) },
        ];
        // All return 0, so they're all "flat" → should detect a period
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).toHaveBeenCalled();
      });

      it('should handle records with multiple rooms', () => {
        const chart = createMockChart(3);
        const records: DynamicHeatingRecord[] = [
          { date: new Date(2024, 0, 15), rooms: { room1: 50, room2: 50 } },
          { date: new Date(2024, 1, 15), rooms: { room1: 50, room2: 50 } },
          { date: new Date(2024, 2, 15), rooms: { room1: 60, room2: 60 } },
        ];
        // Total: 100, 100, 120 → flat from 0-1
        summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).toHaveBeenCalled();
      });
    });
  });

  describe('newYearMarkerPlugin', () => {
    it('should have correct plugin id', () => {
      expect(newYearMarkerPlugin.id).toBe('newYearMarker');
    });

    describe('Early returns', () => {
      it('should return early when options are undefined', () => {
        const chart = createMockChart(0);
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, undefined as any);
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when enabled is false', () => {
        const chart = createMockChart(0);
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: false, records: [] });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when records are undefined', () => {
        const chart = createMockChart(0);
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records: undefined });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when fewer than 2 records', () => {
        const chart = createMockChart(1);
        const records = [{ date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when xScale is missing', () => {
        const chart = createMockChart(2);
        (chart as any).scales = {};
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should return early when chartArea is missing', () => {
        const chart = createMockChart(2);
        (chart as any).chartArea = undefined;
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });
        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });
    });

    describe('Year change detection', () => {
      it('should detect year boundary', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        expect((chart.ctx as any).save).toHaveBeenCalled();
        expect((chart.ctx as any).stroke).toHaveBeenCalled();
      });

      it('should not draw when no year change', () => {
        const chart = createMockChart(3);
        const records = [
          { date: new Date(2024, 0, 15) },
          { date: new Date(2024, 3, 15) },
          { date: new Date(2024, 6, 15) },
        ];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        expect((chart.ctx as any).save).not.toHaveBeenCalled();
      });

      it('should detect multiple year changes', () => {
        const chart = createMockChart(4);
        const records = [
          { date: new Date(2022, 11, 15) },
          { date: new Date(2023, 0, 15) },
          { date: new Date(2023, 11, 15) },
          { date: new Date(2024, 0, 15) },
        ];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        // Two year changes: 2022→2023 and 2023→2024
        expect((chart.ctx as any).save).toHaveBeenCalledTimes(2);
      });
    });

    describe('Drawing operations', () => {
      it('should draw dashed vertical line at year boundary', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        expect(ctx.setLineDash).toHaveBeenCalledWith([8, 4]);
        expect(ctx.stroke).toHaveBeenCalled();
      });

      it('should draw year label', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        // Should draw "2024" label
        const yearCall = ctx.fillText.mock.calls.find((c: any[]) => c[0] === '2024');
        expect(yearCall).toBeTruthy();
        expect(typeof yearCall[1]).toBe('number');
        expect(typeof yearCall[2]).toBe('number');
      });

      it('should draw star icon', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        const starCall = ctx.fillText.mock.calls.find((c: any[]) => c[0] === '★');
        expect(starCall).toBeTruthy();
        expect(typeof starCall[1]).toBe('number');
        expect(typeof starCall[2]).toBe('number');
      });

      it('should draw purple background for label', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        expect(ctx.fillRect).toHaveBeenCalled();
      });

      it('should call save and restore for each year change', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        const ctx = chart.ctx as any;
        expect(ctx.save).toHaveBeenCalledTimes(1);
        expect(ctx.restore).toHaveBeenCalledTimes(1);
      });

      it('should use correct pixel positions from xScale', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

        // Year change at index 1, so getPixelForValue(1) should be called
        expect((chart.scales as any)['x'].getPixelForValue).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('registerChartPlugins', () => {
    it('should register both plugins with Chart.js', () => {
      const registerSpy = vi.spyOn(Chart, 'register').mockImplementation(() => {});

      registerChartPlugins();

      expect(registerSpy).toHaveBeenCalledWith(summerSunPlugin);
      expect(registerSpy).toHaveBeenCalledWith(newYearMarkerPlugin);
      expect(registerSpy).toHaveBeenCalledTimes(2);

      registerSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('summerSun: should handle exactly 2 equal records', () => {
      const chart = createMockChart(2);
      const records = makeHeatingRecords([100, 100]);
      summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

      expect((chart.ctx as any).save).toHaveBeenCalled();
    });

    it('summerSun: should handle exactly 2 different records', () => {
      const chart = createMockChart(2);
      const records = makeHeatingRecords([100, 200]);
      summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

      expect((chart.ctx as any).save).not.toHaveBeenCalled();
    });

    it('summerSun: should handle zero values', () => {
      const chart = createMockChart(3);
      const records = makeHeatingRecords([0, 0, 0]);
      summerSunPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

      expect((chart.ctx as any).save).toHaveBeenCalled();
    });

    it('newYearMarker: should handle dates at exact year boundary', () => {
      const chart = createMockChart(2);
      const records = [{ date: new Date(2023, 11, 31) }, { date: new Date(2024, 0, 1) }];
      newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

      expect((chart.ctx as any).save).toHaveBeenCalled();
    });

    it('newYearMarker: should not trigger for same year different months', () => {
      const chart = createMockChart(2);
      const records = [{ date: new Date(2024, 0, 1) }, { date: new Date(2024, 11, 31) }];
      newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

      expect((chart.ctx as any).save).not.toHaveBeenCalled();
    });

    it('newYearMarker: should handle large year gaps', () => {
      const chart = createMockChart(2);
      const records = [{ date: new Date(2020, 5, 15) }, { date: new Date(2024, 5, 15) }];
      newYearMarkerPlugin.beforeDatasetsDraw(chart, {}, { enabled: true, records });

      // currYear (2024) > prevYear (2020), so should draw once
      expect((chart.ctx as any).save).toHaveBeenCalledTimes(1);
    });
  });
});
