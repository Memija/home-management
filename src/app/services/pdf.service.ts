import { Injectable, inject } from '@angular/core';
import { ConsumptionRecord, calculateWaterTotal, ElectricityRecord, calculateElectricityTotal } from '../models/records.model';
import { LanguageService } from './language.service';

/**
 * Service for generating PDF exports of consumption records.
 * Uses dynamic loading of jsPDF to minimize initial bundle size.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  private languageService = inject(LanguageService);

  /**
   * Load an image and convert to base64 for PDF embedding
   */
  private async loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Format date as localized string
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString(this.languageService.currentLang() === 'de' ? 'de-DE' : 'en-US');
  }

  /**
   * Export water consumption records to PDF
   */
  async exportWaterToPdf(records: ConsumptionRecord[], filename: string = 'water-consumption.pdf'): Promise<void> {
    // Dynamically import jsPDF and autoTable
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    // Create PDF in landscape for better table fit
    const doc = new jsPDF('landscape');

    // Try to load and add logo
    try {
      const logoBase64 = await this.loadImageAsBase64('/assets/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 8, 15, 15);
    } catch (error) {
      console.warn('Could not load logo for PDF:', error);
    }

    // Application name
    const appName = this.languageService.translate('FOOTER.APP_NAME');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246); // Blue color matching app theme
    doc.text(appName, 32, 16);

    // Report title
    const title = this.languageService.translate('WATER.TITLE');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(title, 14, 32);

    // Generation date
    doc.setFontSize(10);
    doc.setTextColor(100);
    const generatedText = `${this.languageService.currentLang() === 'de' ? 'Erstellt am' : 'Generated on'}: ${new Date().toLocaleDateString()}`;
    doc.text(generatedText, 14, 40);

    // Reset text color
    doc.setTextColor(0);

    // Sort records by date for proper difference calculation
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Table headers - added Difference column
    const differenceLabel = this.languageService.currentLang() === 'de' ? 'Differenz' : 'Difference';
    const headers = [
      this.languageService.translate('HOME.SELECT_DATE') || 'Date',
      `${this.languageService.translate('WATER.KITCHEN')} ${this.languageService.translate('WATER.WARM')}`,
      `${this.languageService.translate('WATER.KITCHEN')} ${this.languageService.translate('WATER.COLD')}`,
      `${this.languageService.translate('WATER.BATHROOM')} ${this.languageService.translate('WATER.WARM')}`,
      `${this.languageService.translate('WATER.BATHROOM')} ${this.languageService.translate('WATER.COLD')}`,
      this.languageService.translate('HOME.TOTAL'),
      differenceLabel
    ];

    // Table data with difference calculation
    const data = sortedRecords.map((record, index) => {
      const total = calculateWaterTotal(record);
      let difference = '-';

      if (index > 0) {
        const prevTotal = calculateWaterTotal(sortedRecords[index - 1]);
        const diff = total - prevTotal;
        difference = (diff >= 0 ? '+' : '') + diff.toFixed(2);
      }

      return [
        this.formatDate(record.date),
        record.kitchenWarm.toFixed(2),
        record.kitchenCold.toFixed(2),
        record.bathroomWarm.toFixed(2),
        record.bathroomCold.toFixed(2),
        total.toFixed(2),
        difference
      ];
    });

    // Add table using autoTable function - pass doc as first argument
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 48,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246], // Blue color matching app theme
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Date
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right' },
        5: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 'auto', halign: 'right' }
      }
    });

    // Add page numbers after table is complete - this ensures correct total page count
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${i} / ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    doc.save(filename);
  }

  /**
   * Export heating consumption records to PDF
   */
  async exportHeatingToPdf(
    records: Array<{ date: Date; rooms: Record<string, number> }>,
    roomNames: string[],
    filename: string = 'heating-consumption.pdf'
  ): Promise<void> {
    // Dynamically import jsPDF and autoTable
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    // Create PDF in landscape for better table fit
    const doc = new jsPDF('landscape');

    // Try to load and add logo
    try {
      const logoBase64 = await this.loadImageAsBase64('/assets/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 8, 15, 15);
    } catch (error) {
      console.warn('Could not load logo for PDF:', error);
    }

    // Application name
    const appName = this.languageService.translate('FOOTER.APP_NAME');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 124, 0); // Orange color matching heating theme
    doc.text(appName, 32, 16);

    // Report title
    const title = this.languageService.translate('HEATING.TITLE');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(title, 14, 32);

    // Generation date
    doc.setFontSize(10);
    doc.setTextColor(100);
    const generatedText = `${this.languageService.currentLang() === 'de' ? 'Erstellt am' : 'Generated on'}: ${new Date().toLocaleDateString()}`;
    doc.text(generatedText, 14, 40);

    // Reset text color
    doc.setTextColor(0);

    // Sort records by date
    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Table headers - Date, dynamic rooms, Total
    const headers = [
      this.languageService.translate('HOME.SELECT_DATE') || 'Date',
      ...roomNames,
      this.languageService.translate('HOME.TOTAL')
    ];

    // Calculate total for a record
    const calculateTotal = (record: { rooms: Record<string, number> }) =>
      Object.values(record.rooms).reduce((sum, val) => sum + (val || 0), 0);

    // Table data
    const data = sortedRecords.map(record => {
      const total = calculateTotal(record);
      const roomValues = roomNames.map((_, index) => {
        const roomId = Object.keys(record.rooms)[index];
        return (record.rooms[roomId] || 0).toFixed(2);
      });

      return [
        this.formatDate(record.date),
        ...roomValues,
        total.toFixed(2)
      ];
    });

    // Dynamic column styles - use auto width to fit page properly
    const columnStyles: { [key: string]: { cellWidth?: 'auto' | number; halign?: 'right' | 'left' | 'center'; fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic' } } = {
      '0': { cellWidth: 'auto' } // Date column
    };
    // Room columns with right alignment
    roomNames.forEach((_, i) => {
      columnStyles[String(i + 1)] = { cellWidth: 'auto', halign: 'right' };
    });
    // Total column with bold styling
    columnStyles[String(roomNames.length + 1)] = { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' };

    // Add table using autoTable function
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 48,
      theme: 'striped',
      headStyles: {
        fillColor: [245, 124, 0], // Orange color matching heating theme
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles
    });

    // Add page numbers after table is complete - this ensures correct total page count
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${i} / ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    doc.save(filename);
  }

  /**
   * Export electricity consumption records to PDF
   */
  async exportElectricityToPdf(records: ElectricityRecord[], filename: string = 'electricity-consumption.pdf'): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF('landscape');

    try {
      const logoBase64 = await this.loadImageAsBase64('/assets/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 8, 15, 15);
    } catch (error) {
      console.warn('Could not load logo for PDF:', error);
    }

    const appName = this.languageService.translate('FOOTER.APP_NAME');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 193, 7); // Amber color for electricity
    doc.text(appName, 32, 16);

    const title = this.languageService.translate('ELECTRICITY.TITLE');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(title, 14, 32);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const generatedText = `${this.languageService.currentLang() === 'de' ? 'Erstellt am' : 'Generated on'}: ${new Date().toLocaleDateString()}`;
    doc.text(generatedText, 14, 40);

    doc.setTextColor(0);

    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const differenceLabel = this.languageService.currentLang() === 'de' ? 'Differenz' : 'Difference';
    const headers = [
      this.languageService.translate('HOME.SELECT_DATE') || 'Date',
      this.languageService.translate('ELECTRICITY.VALUE') || 'Value (kWh)',
      differenceLabel
    ];

    const data = sortedRecords.map((record, index) => {
      const total = calculateElectricityTotal(record);
      let difference = '-';

      if (index > 0) {
        const prevTotal = calculateElectricityTotal(sortedRecords[index - 1]);
        const diff = total - prevTotal;
        difference = (diff >= 0 ? '+' : '') + diff.toFixed(2);
      }

      return [
        this.formatDate(record.date),
        total.toFixed(2),
        difference
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 48,
      theme: 'striped',
      headStyles: {
        fillColor: [255, 193, 7], // Amber
        textColor: 0, // Black text on amber
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 'auto', halign: 'right' }
      }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${i} / ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(filename);
  }
}
