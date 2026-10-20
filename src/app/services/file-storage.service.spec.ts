import { TestBed } from '@angular/core/testing';
import { FileStorageService } from './file-storage.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = (event?.target as { result?: string })?.result ?? reader.result;
        resolve((res ?? '') as string);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(this);
    });
  };
}
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = Blob.prototype.text;
}

describe('FileStorageService', () => {
  let service: FileStorageService;

  // Helper to mock FileReader behavior for readAsText
  const mockFileReader = (data: string, shouldError = false) => {
    const originalFileReader = window.FileReader;
    window.FileReader = class {
      readAsText() {
        setTimeout(() => {
          if (shouldError) {
            if (this.onerror) {
              this.onerror({} as ProgressEvent<FileReader>);
            }
          } else {
            if (this.onload) {
              this.onload({
                target: { result: data },
              } as unknown as ProgressEvent<FileReader>);
            }
          }
        }, 0);
      }
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    } as unknown as typeof FileReader;
    return () => {
      window.FileReader = originalFileReader;
    };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FileStorageService],
    });
    service = TestBed.inject(FileStorageService);

    // Mock URL.createObjectURL and revokeObjectURL
    if (!window.URL.createObjectURL) {
      Object.defineProperty(window.URL, 'createObjectURL', { value: vi.fn(), writable: true });
      Object.defineProperty(window.URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('mock-url');
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined);
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
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLElement);

      service.exportToFile({ test: 'data' }, 'test.json');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should use default filename if not provided', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      let capturedDownload = '';
      createElementSpy.mockReturnValue({
        href: '',
        set download(val: string) {
          capturedDownload = val;
        },
        get download() {
          return capturedDownload;
        },
        click: vi.fn(),
      } as unknown as HTMLElement);

      service.exportToFile({ test: 'data' });

      expect(capturedDownload).toBe('water-consumption-data.json');
    });
  });

  describe('exportData', () => {
    it('should call exportToFile', async () => {
      const spy = vi.spyOn(service, 'exportToFile');
      await service.exportData({ test: 'data' }, 'export.json');
      expect(spy).toHaveBeenCalledWith({ test: 'data' }, 'export.json');
    });
  });

  describe('importFromFile', () => {
    it('should resolve with parsed json data on success', async () => {
      const cleanup = mockFileReader(JSON.stringify({ test: 'data' }));
      const file = new File(['{"test":"data"}'], 'test.json', { type: 'application/json' });

      const result = await service.importFromFile<{ test: string }>(file);

      expect(result).toEqual({ test: 'data' });
      cleanup();
    });

    it('should reject with parse error on invalid json', async () => {
      const cleanup = mockFileReader('invalid json');
      const file = new File(['invalid json'], 'test.json', { type: 'application/json' });

      await expect(service.importFromFile(file)).rejects.toThrow('Failed to parse JSON file');
      cleanup();
    });

    it('should reject on file read error', async () => {
      const file = new File([''], 'test.json', { type: 'application/json' });
      vi.spyOn(file, 'text').mockRejectedValue(new Error('Read error'));

      await expect(service.importFromFile(file)).rejects.toThrow('Failed to read file');
    });
  });

  describe('importData', () => {
    it('should resolve with data for valid json file', async () => {
      const cleanup = mockFileReader(JSON.stringify({ test: 'data' }));
      const file = new File(['{"test":"data"}'], 'test.json', { type: 'application/json' });

      const createElementSpy = vi.spyOn(document, 'createElement');
      const input = {
        click: vi.fn(),
        onchange: null as ((e: Event) => void) | null,
        type: 'file',
        accept: '',
      };
      createElementSpy.mockReturnValue(input as unknown as HTMLElement);

      const promise = service.importData<{ test: string }>();

      if (input.onchange) {
        input.onchange({ target: { files: [file] } } as unknown as Event);
      }

      const result = await promise;
      expect(result).toEqual({ data: { test: 'data' } });
      cleanup();
    });

    it('should resolve with invalid_file_type for non-json file', async () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });

      const createElementSpy = vi.spyOn(document, 'createElement');
      const input = {
        click: vi.fn(),
        onchange: null as ((e: Event) => void) | null,
      };
      createElementSpy.mockReturnValue(input as unknown as HTMLElement);

      const promise = service.importData();
      if (input.onchange) {
        input.onchange({ target: { files: [file] } } as unknown as Event);
      }

      const result = await promise;
      expect(result).toEqual({ error: 'invalid_file_type' });
    });

    it('should resolve with parse_error for malformed json', async () => {
      const file = new File(['invalid'], 'test.json', { type: 'application/json' });

      const createElementSpy = vi.spyOn(document, 'createElement');
      const input = {
        click: vi.fn(),
        onchange: null as ((e: Event) => void) | null,
      };
      createElementSpy.mockReturnValue(input as unknown as HTMLElement);

      const promise = service.importData();
      if (input.onchange) {
        input.onchange({ target: { files: [file] } } as unknown as Event);
      }

      const result = await promise;
      expect(result).toEqual({ error: 'parse_error' });
    });

    it('should resolve null if no file selected', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const input = {
        click: vi.fn(),
        onchange: null as ((e: Event) => void) | null,
      };
      createElementSpy.mockReturnValue(input as unknown as HTMLElement);

      const promise = service.importData();
      if (input.onchange) {
        input.onchange({ target: { files: [] } } as unknown as Event);
      }

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
