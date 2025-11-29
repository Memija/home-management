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
}
