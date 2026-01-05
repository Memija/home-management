import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileStorageService {
  /**
   * Export data to a JSON file (triggers download)
   * @param data The data to export
   * @param filename The name of the file to download
   */
  exportToFile(data: unknown, filename: string = 'water-consumption-data.json'): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Clean up
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from a JSON file
   * @param file The file to import
   * @returns The parsed data from the file
   */
  async importFromFile<T = unknown>(file: File): Promise<T> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const data = JSON.parse(text);
          resolve(data as T);
        } catch (error) {
          reject(new Error('Failed to parse JSON file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Modern API for exporting data (alias for exportToFile)
   * @param data The data to export
   * @param filename The name of the file to download
   */
  async exportData(data: unknown, filename: string): Promise<void> {
    this.exportToFile(data, filename);
  }

  /**
   * Modern API for importing data with file picker
   * @param acceptAllTypes If true, accepts all file types and returns error for non-JSON
   * @returns The parsed data, null if cancelled, or error details
   */
  async importData<T>(acceptAllTypes: boolean = false): Promise<{ data: T; error?: never } | { data?: never; error: 'invalid_file_type' | 'parse_error' } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      // If acceptAllTypes is true, don't restrict file types to catch non-JSON uploads
      input.accept = acceptAllTypes ? '*' : 'application/json';

      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Check if file has .json extension
          if (!file.name.toLowerCase().endsWith('.json')) {
            resolve({ error: 'invalid_file_type' });
            return;
          }

          try {
            const data = await this.importFromFile<T>(file);
            resolve({ data });
          } catch (error) {
            console.error('Import failed:', error);
            resolve({ error: 'parse_error' });
          }
        } else {
          resolve(null);
        }
      };

      input.click();
    });
  }
}
