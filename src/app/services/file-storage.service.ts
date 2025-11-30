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
    exportToFile(data: Record<string, any>, filename: string = 'water-consumption-data.json'): void {
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
    async importFromFile<T = Record<string, any>>(file: File): Promise<T> {
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
    async exportData(data: any, filename: string): Promise<void> {
        this.exportToFile(data, filename);
    }

    /**
     * Modern API for importing data with file picker
     * @returns The parsed data from the selected file
     */
    async importData<T>(): Promise<T | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';

            input.onchange = async (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    try {
                        const data = await this.importFromFile<T>(file);
                        resolve(data);
                    } catch (error) {
                        console.error('Import failed:', error);
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            };

            input.click();
        });
    }
}
