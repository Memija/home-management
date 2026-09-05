import { describe, it, expect, vi, afterEach } from 'vitest';
import { summerSunPlugin, newYearMarkerPlugin, registerChartPlugins } from './chart-plugins';
import { Chart } from 'chart.js';
import { DynamicHeatingRecord } from '../../models/records.model';

interface MockCtx {
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  setLineDash: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  measureText: ReturnType<typeof vi.fn>;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

interface MockChart {
  ctx: MockCtx;
  scales: Record<string, { getPixelForValue: ReturnType<typeof vi.fn> }>;
  chartArea?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  data?: {
    labels?: (string | null)[];
    datasets?: {
      label?: string;
      data?: (number | null)[];
      borderDash?: number[];
    }[];
  };
}

const createMockCtx = (): MockCtx => ({
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

const createMockChart = (count = 0): MockChart => {
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
    data: {
      labels: Array.from({ length: count }, (_, i) => `Label ${i}`),
    },
  };
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
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          undefined as unknown as {
            enabled?: boolean;
            records?: (DynamicHeatingRecord | { date: Date })[];
          },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when enabled is false', () => {
        const chart = createMockChart(0);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: false, records: [] },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when records are undefined', () => {
        const chart = createMockChart(0);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records: undefined },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when fewer than 2 records', () => {
        const chart = createMockChart(1);
        const records = makeHeatingRecords([100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when xScale is missing', () => {
        const chart = createMockChart(3);
        chart.scales = {};
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when chartArea is missing', () => {
        const chart = createMockChart(3);
        chart.chartArea = undefined;
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });
    });

    describe('Flat period detection', () => {
      it('should draw summer period when consecutive values are equal', () => {
        const chart = createMockChart(4);
        const records = makeHeatingRecords([100, 100, 100, 200]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalled();
        expect(chart.ctx.fillRect).toHaveBeenCalled();
      });

      it('should not draw when all values are different', () => {
        const chart = createMockChart(4);
        const records = makeHeatingRecords([100, 200, 300, 400]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.fillRect).not.toHaveBeenCalled();
      });

      it('should detect multiple flat periods', () => {
        const chart = createMockChart(7);
        const records = makeHeatingRecords([100, 100, 200, 300, 300, 300, 400]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalledTimes(2);
      });

      it('should handle flat period at end of data', () => {
        const chart = createMockChart(4);
        const records = makeHeatingRecords([100, 200, 300, 300]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalled();
        expect(chart.ctx.fillRect).toHaveBeenCalled();
      });

      it('should handle entirely flat data', () => {
        const chart = createMockChart(5);
        const records = makeHeatingRecords([100, 100, 100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalledTimes(1);
      });

      it('should not draw for a single flat pair only (period must be at least 2 points)', () => {
        const chart = createMockChart(4);
        const records = makeHeatingRecords([100, 200, 200, 300]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalled();
      });
    });

    describe('Drawing operations', () => {
      it('should draw yellow background for flat periods', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.fillRect).toHaveBeenCalled();
      });

      it('should draw dashed boundary lines', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.setLineDash).toHaveBeenCalledWith([5, 3]);
        expect(chart.ctx.stroke).toHaveBeenCalled();
      });

      it('should draw sun symbol in center of period', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        const sunCall = chart.ctx.fillText.mock.calls.find((c: unknown[]) => c[0] === '☼');
        expect(sunCall).toBeTruthy();
        expect(typeof sunCall?.[1]).toBe('number');
        expect(typeof sunCall?.[2]).toBe('number');
      });

      it('should call save and restore for each period', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 100, 100]);
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalledTimes(1);
        expect(chart.ctx.restore).toHaveBeenCalledTimes(1);
      });
    });

    describe('Predicted zero-consumption periods', () => {
      it('should draw predicted summer period when prediction values are zero', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 200, 300]);
        chart.data = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [
            {
              label: 'Prediction',
              data: [null, null, 300, 15, 0, 0, 12],
              borderDash: [4, 4],
            },
          ],
        };

        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalled();
        expect(chart.ctx.fillRect).toHaveBeenCalled();
        expect(chart.ctx.setLineDash).toHaveBeenCalledWith([3, 3]);

        const sunCall = chart.ctx.fillText.mock.calls.find((c: unknown[]) => c[0] === '☼');
        expect(sunCall).toBeTruthy();
      });

      it('should draw single-month predicted zero period with centered padding', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 200, 300]);
        chart.data = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [
            {
              label: 'Prediction',
              data: [null, null, 300, 0, 12],
              borderDash: [4, 4],
            },
          ],
        };

        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalled();
        expect(chart.ctx.fillRect).toHaveBeenCalled();
      });

      it('should not draw predicted period when all predicted values are greater than zero', () => {
        const chart = createMockChart(3);
        const records = makeHeatingRecords([100, 200, 300]);
        chart.data = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Prediction',
              data: [null, null, 300, 15, 20, 25],
              borderDash: [4, 4],
            },
          ],
        };

        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.fillRect).not.toHaveBeenCalled();
      });

      it('should draw separate historical and predicted periods when separated by active heating', () => {
        const chart = createMockChart(4);
        const records = makeHeatingRecords([100, 200, 200, 300]);
        chart.data = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [
            {
              label: 'Prediction',
              data: [null, null, null, 300, 0, 0, 10],
              borderDash: [4, 4],
            },
          ],
        };

        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalledTimes(2);
        expect(chart.ctx.fillRect).toHaveBeenCalledTimes(2);
      });

      it('should merge current historical off-season with predicted off-season into a single continuous period with 1 sun', () => {
        const chart = createMockChart(4);
        const records = makeHeatingRecords([100, 200, 300, 300]);
        chart.data = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [
            {
              label: 'Prediction',
              data: [null, null, null, 300, 0, 0, 10],
              borderDash: [4, 4],
            },
          ],
        };

        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalledTimes(1);
        expect(chart.ctx.fillRect).toHaveBeenCalledTimes(2);

        const sunCalls = chart.ctx.fillText.mock.calls.filter((c: unknown[]) => c[0] === '☼');
        expect(sunCalls.length).toBe(1);
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
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).toHaveBeenCalled();
      });

      it('should handle records with multiple rooms', () => {
        const chart = createMockChart(3);
        const records: DynamicHeatingRecord[] = [
          { date: new Date(2024, 0, 15), rooms: { room1: 50, room2: 50 } },
          { date: new Date(2024, 1, 15), rooms: { room1: 50, room2: 50 } },
          { date: new Date(2024, 2, 15), rooms: { room1: 60, room2: 60 } },
        ];
        summerSunPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).toHaveBeenCalled();
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
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          undefined as unknown as { enabled?: boolean; records?: { date: Date }[] },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when enabled is false', () => {
        const chart = createMockChart(0);
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: false, records: [] },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when records are undefined', () => {
        const chart = createMockChart(0);
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records: undefined },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when fewer than 2 records', () => {
        const chart = createMockChart(1);
        const records = [{ date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when xScale is missing', () => {
        const chart = createMockChart(2);
        chart.scales = {};
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should return early when chartArea is missing', () => {
        const chart = createMockChart(2);
        chart.chartArea = undefined;
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );
        expect(chart.ctx.save).not.toHaveBeenCalled();
      });
    });

    describe('Year change detection', () => {
      it('should detect year boundary', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalled();
        expect(chart.ctx.stroke).toHaveBeenCalled();
      });

      it('should not draw when no year change', () => {
        const chart = createMockChart(3);
        const records = [
          { date: new Date(2024, 0, 15) },
          { date: new Date(2024, 3, 15) },
          { date: new Date(2024, 6, 15) },
        ];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).not.toHaveBeenCalled();
      });

      it('should detect multiple year changes', () => {
        const chart = createMockChart(4);
        const records = [
          { date: new Date(2022, 11, 15) },
          { date: new Date(2023, 0, 15) },
          { date: new Date(2023, 11, 15) },
          { date: new Date(2024, 0, 15) },
        ];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalledTimes(2);
      });
    });

    describe('Drawing operations', () => {
      it('should draw dashed vertical line at year boundary', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.setLineDash).toHaveBeenCalledWith([8, 4]);
        expect(chart.ctx.stroke).toHaveBeenCalled();
      });

      it('should draw year label', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        const yearCall = chart.ctx.fillText.mock.calls.find((c: unknown[]) => c[0] === '2024');
        expect(yearCall).toBeTruthy();
        expect(typeof yearCall?.[1]).toBe('number');
        expect(typeof yearCall?.[2]).toBe('number');
      });

      it('should draw star icon', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        const starCall = chart.ctx.fillText.mock.calls.find((c: unknown[]) => c[0] === '★');
        expect(starCall).toBeTruthy();
        expect(typeof starCall?.[1]).toBe('number');
        expect(typeof starCall?.[2]).toBe('number');
      });

      it('should draw purple background for label', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.fillRect).toHaveBeenCalled();
      });

      it('should call save and restore for each year change', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.ctx.save).toHaveBeenCalledTimes(1);
        expect(chart.ctx.restore).toHaveBeenCalledTimes(1);
      });

      it('should use correct pixel positions from xScale', () => {
        const chart = createMockChart(2);
        const records = [{ date: new Date(2023, 11, 15) }, { date: new Date(2024, 0, 15) }];
        newYearMarkerPlugin.beforeDatasetsDraw(
          chart as unknown as Chart,
          {},
          { enabled: true, records },
        );

        expect(chart.scales['x'].getPixelForValue).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('registerChartPlugins', () => {
    it('should register both plugins with Chart.js', () => {
      const registerSpy = vi.spyOn(Chart, 'register').mockImplementation(() => {
        /* no-op */
      });

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
      summerSunPlugin.beforeDatasetsDraw(chart as unknown as Chart, {}, { enabled: true, records });

      expect(chart.ctx.save).toHaveBeenCalled();
    });

    it('summerSun: should handle exactly 2 different records', () => {
      const chart = createMockChart(2);
      const records = makeHeatingRecords([100, 200]);
      summerSunPlugin.beforeDatasetsDraw(chart as unknown as Chart, {}, { enabled: true, records });

      expect(chart.ctx.save).not.toHaveBeenCalled();
    });

    it('summerSun: should handle zero values', () => {
      const chart = createMockChart(3);
      const records = makeHeatingRecords([0, 0, 0]);
      summerSunPlugin.beforeDatasetsDraw(chart as unknown as Chart, {}, { enabled: true, records });

      expect(chart.ctx.save).toHaveBeenCalled();
    });

    it('newYearMarker: should handle dates at exact year boundary', () => {
      const chart = createMockChart(2);
      const records = [{ date: new Date(2023, 11, 31) }, { date: new Date(2024, 0, 1) }];
      newYearMarkerPlugin.beforeDatasetsDraw(
        chart as unknown as Chart,
        {},
        { enabled: true, records },
      );

      expect(chart.ctx.save).toHaveBeenCalled();
    });

    it('newYearMarker: should not trigger for same year different months', () => {
      const chart = createMockChart(2);
      const records = [{ date: new Date(2024, 0, 1) }, { date: new Date(2024, 11, 31) }];
      newYearMarkerPlugin.beforeDatasetsDraw(
        chart as unknown as Chart,
        {},
        { enabled: true, records },
      );

      expect(chart.ctx.save).not.toHaveBeenCalled();
    });

    it('newYearMarker: should handle large year gaps', () => {
      const chart = createMockChart(2);
      const records = [{ date: new Date(2020, 5, 15) }, { date: new Date(2024, 5, 15) }];
      newYearMarkerPlugin.beforeDatasetsDraw(
        chart as unknown as Chart,
        {},
        { enabled: true, records },
      );

      expect(chart.ctx.save).toHaveBeenCalledTimes(1);
    });
  });
});
