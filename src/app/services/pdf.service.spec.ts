import { TestBed } from '@angular/core/testing';
import { PdfService } from './pdf.service';
import { LanguageService } from './language.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Define mocks at top level for vi.mock hoisting
// Using var to ensure visibility if hoisted, though lazy import should be fine
const mockJsPDFConstructor = vi.fn();
const mockAutoTable = vi.fn();

vi.mock('jspdf', () => ({
  jsPDF: class {
    constructor(...args: any[]) {
      return mockJsPDFConstructor(...args);
    }
  }
}));

vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable
}));

describe('PdfService', () => {
  let service: PdfService;
  let mockLanguageService: any;
  let mockDoc: any;

  beforeEach(() => {
    mockLanguageService = {
      translate: vi.fn().mockImplementation((key) => key),
      currentLang: vi.fn().mockReturnValue('en')
    };

    // Reset mocks
    mockJsPDFConstructor.mockReset();
    mockAutoTable.mockReset();

    // Mock Image to prevent timeout
    (window as any).Image = class {
      onload: any;
      onerror: any;
      width = 100;
      height = 100;
      set src(val: string) {
        setTimeout(() => {
          // Fail by default to speed up tests (service catches error)
          if (this.onerror) this.onerror(new Error('Image mock error'));
        }, 0);
      }
    } as any;

    // Mock jsPDF instance
    mockDoc = {
      addImage: vi.fn(),
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
      save: vi.fn(),
      setPage: vi.fn(),
      getNumberOfPages: vi.fn().mockReturnValue(1),
      internal: {
        pageSize: { width: 297, height: 210 }
      }
    };

    mockJsPDFConstructor.mockImplementation(() => mockDoc);

    TestBed.configureTestingModule({
      providers: [
        PdfService,
        { provide: LanguageService, useValue: mockLanguageService }
      ]
    });
    service = TestBed.inject(PdfService);

    // Spy on console.warn to suppress expected warnings
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('exportWaterToPdf', () => {
    it('should generate PDF and save it', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          kitchenWarm: 10, kitchenCold: 20,
          bathroomWarm: 30, bathroomCold: 40
        }
      ];

      await service.exportWaterToPdf(records, 'test.pdf');

      expect(mockJsPDFConstructor).toHaveBeenCalledWith('landscape');

      // Check for calls to doc methods
      expect(mockDoc.text).toHaveBeenCalled();
      expect(mockDoc.save).toHaveBeenCalledWith('test.pdf');

      // Check autoTable was called
      expect(mockAutoTable).toHaveBeenCalled();
      const callArgs = mockAutoTable.mock.calls[0];
      expect(callArgs[0]).toBe(mockDoc); // first arg is doc
      expect(callArgs[1].body.length).toBe(1); // One record
    });

    it('should calculate differences correctly', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          kitchenWarm: 10, kitchenCold: 10,
          bathroomWarm: 10, bathroomCold: 10
        }, // Total 40
        {
          date: new Date('2023-01-02'),
          kitchenWarm: 11, kitchenCold: 11,
          bathroomWarm: 11, bathroomCold: 11
        } // Total 44
      ];

      await service.exportWaterToPdf(records, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const data = callArgs[1].body;

      expect(data.length).toBe(2);
      // First row difference should be '-'
      expect(data[0][6]).toBe('-');
      // Second row difference should be '+4.00'
      expect(data[1][6]).toBe('+4.00');
    });

    it('should handle german date formatting', async () => {
      mockLanguageService.currentLang.mockReturnValue('de');

      const records = [
        {
          date: new Date('2023-12-31'),
          kitchenWarm: 0, kitchenCold: 0,
          bathroomWarm: 0, bathroomCold: 0
        }
      ];

      await service.exportWaterToPdf(records, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const data = callArgs[1].body;
      // German date format DD.MM.YYYY usually, or D.M.YYYY depending on browser locale implementation in mock
      // Since we are in node environment, toLocaleDateString might behave differently or use en-US default if de-DE not installed.
      // But let's check if it calls toLocaleDateString with de-DE.
      // Actually, we can't easily spy on Date.prototype.toLocaleDateString for a specific instance.

      // Let's assume the implementation uses the service result.
      // We can check if 'Erstellt am' is used in text.
      const textCalls = mockDoc.text.mock.calls;
      const generatedText = textCalls.find((args: any) => typeof args[0] === 'string' && args[0].startsWith('Erstellt am'));
      expect(generatedText).toBeDefined();
    });

    it('should handle image loading error gracefully', async () => {
      // Mock image loading to fail
      // The service creates `new Image()`. In test environment (jsdom), Image exists.
      // We can spy on global Image constructor?

      // The service does `const img = new Image();`
      // We can try to rely on console.warn being called.
      // But `loadImageAsBase64` is private and called inside.
      // If it fails, it catches and logs warning.

      // Since we mocked `fetch` or `Image` loading logic is browser specific,
      // in JSDOM, setting `src` might not trigger onload/onerror without setup.

      // Let's just ensure the function finishes without throwing.
      await service.exportWaterToPdf([], 'test.pdf');
      // If it finishes, it's fine.
    });
  });

  describe('exportHeatingToPdf', () => {
    it('should generate PDF for heating records', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          rooms: {
            room_1: 10,
            room_2: 20
          }
        }
      ];
      const roomNames = ['Living Room', 'Bedroom'];

      await service.exportHeatingToPdf(records, roomNames, 'heating-test.pdf');

      expect(mockJsPDFConstructor).toHaveBeenCalledWith('landscape');
      expect(mockDoc.text).toHaveBeenCalled();
      expect(mockDoc.save).toHaveBeenCalledWith('heating-test.pdf');
      expect(mockAutoTable).toHaveBeenCalled();
    });

    it('should calculate heating totals correctly', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          rooms: { room_1: 10, room_2: 20 } // Total 30
        },
        {
          date: new Date('2023-01-02'),
          rooms: { room_1: 15, room_2: 25 } // Total 40
        }
      ];
      const roomNames = ['Living Room', 'Bedroom'];

      await service.exportHeatingToPdf(records, roomNames, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const data = callArgs[1].body;

      expect(data.length).toBe(2);
      // Verify totals are calculated (room_1 + room_2)
      expect(data[0][3]).toBe('30.00'); // Total column for first record
      expect(data[1][3]).toBe('40.00'); // Total column for second record
    });

    it('should handle empty heating records', async () => {
      await service.exportHeatingToPdf([], [], 'empty.pdf');

      expect(mockDoc.save).toHaveBeenCalledWith('empty.pdf');
    });

    it('should generate correct column headers from room names', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          rooms: { room_1: 10, room_2: 20, room_3: 30 }
        }
      ];
      const roomNames = ['Kitchen', 'Bathroom', 'Office'];

      await service.exportHeatingToPdf(records, roomNames, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const head = callArgs[1].head[0];

      // Should have Date, room columns, Total, Difference
      expect(head.length).toBeGreaterThanOrEqual(5); // Date + 3 rooms + Total + Diff
    });
  });

  describe('exportElectricityToPdf', () => {
    it('should generate PDF and save it', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records, 'electricity-test.pdf');

      expect(mockJsPDFConstructor).toHaveBeenCalledWith('landscape');
      expect(mockDoc.text).toHaveBeenCalled();
      expect(mockDoc.save).toHaveBeenCalledWith('electricity-test.pdf');
      expect(mockAutoTable).toHaveBeenCalled();

      const callArgs = mockAutoTable.mock.calls[0];
      expect(callArgs[0]).toBe(mockDoc);
      expect(callArgs[1].body.length).toBe(1);
    });

    it('should use default filename when not provided', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records);

      expect(mockDoc.save).toHaveBeenCalledWith('electricity-consumption.pdf');
    });

    it('should calculate differences correctly', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12500
        },
        {
          date: new Date('2023-01-02'),
          value: 12600
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const data = callArgs[1].body;

      expect(data.length).toBe(2);
      // First row difference should be '-'
      expect(data[0][2]).toBe('-');
      // Second row difference should be '+100.00'
      expect(data[1][2]).toBe('+100.00');
    });

    it('should handle negative differences correctly', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12600
        },
        {
          date: new Date('2023-01-02'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const data = callArgs[1].body;

      // Second row difference should be '-100.00'
      expect(data[1][2]).toBe('-100.00');
    });

    it('should handle german date formatting', async () => {
      mockLanguageService.currentLang.mockReturnValue('de');

      const records = [
        {
          date: new Date('2023-12-31'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      const textCalls = mockDoc.text.mock.calls;
      const generatedText = textCalls.find((args: any) => typeof args[0] === 'string' && args[0].startsWith('Erstellt am'));
      expect(generatedText).toBeDefined();
    });

    it('should use English formatting for non-German languages', async () => {
      mockLanguageService.currentLang.mockReturnValue('en');

      const records = [
        {
          date: new Date('2023-12-31'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      const textCalls = mockDoc.text.mock.calls;
      const generatedText = textCalls.find((args: any) => typeof args[0] === 'string' && args[0].startsWith('Generated on'));
      expect(generatedText).toBeDefined();
    });

    it('should handle empty electricity records', async () => {
      await service.exportElectricityToPdf([], 'empty.pdf');

      expect(mockDoc.save).toHaveBeenCalledWith('empty.pdf');
      expect(mockAutoTable).toHaveBeenCalled();

      const callArgs = mockAutoTable.mock.calls[0];
      expect(callArgs[1].body.length).toBe(0);
    });

    it('should sort records by date before exporting', async () => {
      const records = [
        {
          date: new Date('2023-01-15'),
          value: 12600
        },
        {
          date: new Date('2023-01-01'),
          value: 12500
        },
        {
          date: new Date('2023-01-10'),
          value: 12550
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const data = callArgs[1].body;

      // First row should be Jan 1 (12500), last should be Jan 15 (12600)
      expect(data[0][1]).toBe('12500.00');
      expect(data[1][1]).toBe('12550.00');
      expect(data[2][1]).toBe('12600.00');
    });

    it('should have correct table headers', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const head = callArgs[1].head[0];

      // Should have Date, Value, Difference columns
      expect(head.length).toBe(3);
    });

    it('should apply correct styling to table', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      const callArgs = mockAutoTable.mock.calls[0];
      const options = callArgs[1];

      // Verify amber theme colors for electricity
      expect(options.headStyles.fillColor).toEqual([255, 193, 7]);
      expect(options.headStyles.textColor).toBe(0); // Black text on amber
      expect(options.theme).toBe('striped');
    });

    it('should handle image loading error gracefully', async () => {
      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12500
        }
      ];

      // Image mock is set to fail by default
      await service.exportElectricityToPdf(records, 'test.pdf');

      // Should still complete and save
      expect(mockDoc.save).toHaveBeenCalledWith('test.pdf');
    });

    it('should add page numbers to all pages', async () => {
      mockDoc.getNumberOfPages.mockReturnValue(3);

      const records = [
        {
          date: new Date('2023-01-01'),
          value: 12500
        }
      ];

      await service.exportElectricityToPdf(records, 'test.pdf');

      // Should call setPage for each page
      expect(mockDoc.setPage).toHaveBeenCalledWith(1);
      expect(mockDoc.setPage).toHaveBeenCalledWith(2);
      expect(mockDoc.setPage).toHaveBeenCalledWith(3);
    });
  });
});
