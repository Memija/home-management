import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { STORAGE_SERVICE, StorageService } from './services/storage.service';

// Mock StorageService
const mockStorageService: StorageService = {
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(false),
  exportAll: vi.fn().mockResolvedValue({}),
  importAll: vi.fn().mockResolvedValue(undefined),
  exportRecords: vi.fn().mockResolvedValue([]),
  importRecords: vi.fn().mockResolvedValue(undefined),
};

describe('App', () => {
  beforeEach(async () => {
    // Mock window.matchMedia for ThemeService
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: STORAGE_SERVICE, useValue: mockStorageService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
