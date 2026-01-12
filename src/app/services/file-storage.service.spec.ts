import { TestBed } from '@angular/core/testing';
import { FileStorageService } from './file-storage.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('FileStorageService', () => {
  let service: FileStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileStorageService]
    });
    service = TestBed.inject(FileStorageService);

    // Mock URL.createObjectURL and revokeObjectURL
    if (!window.URL.createObjectURL) {
        // In some environments it might be missing
        Object.defineProperty(window.URL, 'createObjectURL', { value: vi.fn(), writable: true });
        Object.defineProperty(window.URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
    } else {
        vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('mock-url');
        vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('exportToFile', () => {
    it('should trigger download', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const clickSpy = vi.fn();

      createElementSpy.mockReturnValue({
        click: clickSpy,
        href: '',
        download: ''
      } as any);

      service.exportToFile({ test: 'data' }, 'test.json');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('importFromFile', () => {
    it('should parse valid JSON file', async () => {
      const file = new File([JSON.stringify({ test: 'data' })], 'test.json', { type: 'application/json' });
      const result = await service.importFromFile(file);
      expect(result).toEqual({ test: 'data' });
    });

    it('should reject invalid JSON file', async () => {
      const file = new File(['invalid-json'], 'test.json', { type: 'application/json' });
      await expect(service.importFromFile(file)).rejects.toThrow('Failed to parse JSON file');
    });

    it('should handle read error', async () => {
      const file = new File([''], 'test.json');
      // Mock FileReader to error
      const originalFileReader = window.FileReader;
      window.FileReader = class {
        readAsText() {
          setTimeout(() => {
              if (this.onerror) this.onerror({} as any);
          }, 0);
        }
        onload: any;
        onerror: any;
      } as any;

      await expect(service.importFromFile(file)).rejects.toThrow('Failed to read file');
      window.FileReader = originalFileReader;
    });
  });

  describe('exportData', () => {
    it('should call exportToFile', async () => {
      const spy = vi.spyOn(service, 'exportToFile');
      // Mock implementation to avoid errors in exportToFile during this test if mocks aren't perfect
      spy.mockImplementation(() => {});

      await service.exportData({ test: 'data' }, 'test.json');
      expect(spy).toHaveBeenCalledWith({ test: 'data' }, 'test.json');
    });
  });

  describe('importData', () => {
    it('should resolve with data for valid JSON', async () => {
      const file = new File([JSON.stringify({ test: 'data' })], 'test.json', { type: 'application/json' });

      const createElementSpy = vi.spyOn(document, 'createElement');
      const input = {
          click: vi.fn(),
          onchange: null as any,
          type: 'file',
          accept: ''
      };
      createElementSpy.mockReturnValue(input as any);

      const promise = service.importData();

      // Simulate user selecting file
      const event = { target: { files: [file] } };
      input.onchange(event);

      const result = await promise;
      expect(result).toEqual({ data: { test: 'data' } });
    });

    it('should resolve with invalid_file_type for non-json file', async () => {
        const file = new File([''], 'test.txt', { type: 'text/plain' });

        const createElementSpy = vi.spyOn(document, 'createElement');
        const input = {
            click: vi.fn(),
            onchange: null as any
        };
        createElementSpy.mockReturnValue(input as any);

        const promise = service.importData();
        input.onchange({ target: { files: [file] } } as any);

        const result = await promise;
        expect(result).toEqual({ error: 'invalid_file_type' });
    });

    it('should resolve with parse_error for malformed json', async () => {
        const file = new File(['invalid'], 'test.json', { type: 'application/json' });

        const createElementSpy = vi.spyOn(document, 'createElement');
        const input = {
            click: vi.fn(),
            onchange: null as any
        };
        createElementSpy.mockReturnValue(input as any);

        const promise = service.importData();
        input.onchange({ target: { files: [file] } } as any);

        const result = await promise;
        expect(result).toEqual({ error: 'parse_error' });
    });

    it('should resolve null if no file selected', async () => {
        const createElementSpy = vi.spyOn(document, 'createElement');
        const input = {
            click: vi.fn(),
            onchange: null as any
        };
        createElementSpy.mockReturnValue(input as any);

        const promise = service.importData();
        input.onchange({ target: { files: [] } } as any);

        const result = await promise;
        expect(result).toBeNull();
    });
  });
});
