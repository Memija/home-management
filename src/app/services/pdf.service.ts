import { Injectable, inject } from '@angular/core';
import {
  ConsumptionRecord,
  calculateWaterTotal,
  ElectricityRecord,
  calculateElectricityTotal,
} from '../models/records.model';
import { LanguageService } from './language.service';
import {
  loadImageAsBase64,
  sortRecordsByDateAsc,
  renderPdfReportHeader,
  renderPdfPageNumbers,
  formatSignedDiff,
  calculateWaterPdfDiff,
  calculateHeatingPdfDiff,
  drawHeatingYearSeparator,
} from '../utils/pdf.utils';

/**
 * Service for generating PDF exports of consumption records.
 * Uses dynamic loading of jsPDF to minimize initial bundle size.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  private readonly languageService = inject(LanguageService);
  private pdfLibsPromise: Promise<{
    jsPDF: (typeof import('jspdf'))['jsPDF'];
    autoTable: (typeof import('jspdf-autotable'))['default'];
  }> | null = null;

  private getPdfLibs(): Promise<{
    jsPDF: (typeof import('jspdf'))['jsPDF'];
    autoTable: (typeof import('jspdf-autotable'))['default'];
  }> {
    if (!this.pdfLibsPromise) {
      this.pdfLibsPromise = Promise.all([import('jspdf'), import('jspdf-autotable')]).then(
        ([{ jsPDF }, autoTableModule]) => ({
          jsPDF,
          autoTable: autoTableModule.default,
        }),
      );
    }
    return this.pdfLibsPromise;
  }

  /**
   * Format date as localized string
   */
  private formatDate(date: Date): string {
    const d = date instanceof Date ? date : new Date(date);
    return this.languageService.formatDate(d, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /**
   * Create a landscape jsPDF document and render the report header
   */
  private async createDocumentWithHeader(
    titleKey: string,
    themeColor: [number, number, number],
  ): Promise<{
    doc: import('jspdf').jsPDF;
    autoTable: (typeof import('jspdf-autotable'))['default'];
  }> {
    const logoPromise = loadImageAsBase64('/assets/logo-128.png');
    logoPromise.catch(() => undefined);
    const { jsPDF, autoTable } = await this.getPdfLibs();
    const doc = new jsPDF('landscape');

    const generatedOn = this.languageService.translate('PDF.GENERATED_ON');
    const generatedText = `${generatedOn}: ${new Date().toLocaleDateString(this.languageService.currentLocale())}`;

    await renderPdfReportHeader(doc, {
      appName: this.languageService.translate('FOOTER.APP_NAME'),
      title: this.languageService.translate(titleKey),
      generatedText,
      themeColor,
      logoPromise,
    });

    return { doc, autoTable };
  }

  /**
   * Export water consumption records to PDF
   */
  async exportWaterToPdf(
    records: ConsumptionRecord[],
    filename = 'water-consumption.pdf',
  ): Promise<void> {
    const { doc, autoTable } = await this.createDocumentWithHeader('WATER.TITLE', [59, 130, 246]);
    const sortedRecords = sortRecordsByDateAsc(records);

    const headers = [
      this.languageService.translate('HOME.SELECT_DATE') || 'Date',
      `${this.languageService.translate('WATER.KITCHEN')} ${this.languageService.translate('WATER.WARM')}`,
      `${this.languageService.translate('WATER.KITCHEN')} ${this.languageService.translate('WATER.COLD')}`,
      `${this.languageService.translate('WATER.BATHROOM')} ${this.languageService.translate('WATER.WARM')}`,
      `${this.languageService.translate('WATER.BATHROOM')} ${this.languageService.translate('WATER.COLD')}`,
      this.languageService.translate('HOME.TOTAL'),
      this.languageService.translate('PDF.DIFFERENCE'),
    ];

    const data = sortedRecords.map((record, index) => {
      const total = calculateWaterTotal(record);
      const difference = index > 0 ? calculateWaterPdfDiff(record, sortedRecords[index - 1]) : '-';

      return [
        this.formatDate(record.date),
        record.kitchenWarm.toFixed(2),
        record.kitchenCold.toFixed(2),
        record.bathroomWarm.toFixed(2),
        record.bathroomCold.toFixed(2),
        total.toFixed(2),
        difference,
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 48,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right' },
        5: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 'auto', halign: 'right' },
      },
    });

    renderPdfPageNumbers(doc);
    doc.save(filename);
  }

  /**
   * Export heating consumption records to PDF
   */
  async exportHeatingToPdf(
    records: { date: Date; rooms: Record<string, number> }[],
    roomNames: string[],
    filename = 'heating-consumption.pdf',
  ): Promise<void> {
    const { doc, autoTable } = await this.createDocumentWithHeader('HEATING.TITLE', [245, 124, 0]);
    const sortedRecords = sortRecordsByDateAsc(records);

    const headers = [
      this.languageService.translate('HOME.SELECT_DATE') || 'Date',
      ...roomNames,
      this.languageService.translate('HOME.TOTAL'),
      this.languageService.translate('PDF.DIFFERENCE'),
    ];

    const data = sortedRecords.map((record, index) => {
      const roomKeys = Object.keys(record.rooms);
      let total = 0;
      for (const roomId of roomKeys) {
        total += record.rooms[roomId] || 0;
      }
      const roomValues = roomNames.map((_, roomIdx) => {
        const roomId = roomKeys[roomIdx];
        return (record.rooms[roomId] || 0).toFixed(2);
      });
      const difference =
        index > 0 ? calculateHeatingPdfDiff(record, sortedRecords[index - 1]) : '-';

      return [this.formatDate(record.date), ...roomValues, total.toFixed(2), difference];
    });

    const columnStyles: Record<
      string,
      {
        cellWidth?: 'auto' | number;
        halign?: 'right' | 'left' | 'center';
        fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
      }
    > = {
      '0': { cellWidth: 'auto' },
    };
    roomNames.forEach((_, i) => {
      columnStyles[String(i + 1)] = { cellWidth: 'auto', halign: 'right' };
    });
    columnStyles[String(roomNames.length + 1)] = {
      cellWidth: 'auto',
      halign: 'right',
      fontStyle: 'bold',
    };
    columnStyles[String(roomNames.length + 2)] = { cellWidth: 'auto', halign: 'right' };

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 48,
      theme: 'striped',
      headStyles: {
        fillColor: [245, 124, 0],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles,
      willDrawCell: (cellData) => drawHeatingYearSeparator(cellData, sortedRecords),
    });

    renderPdfPageNumbers(doc);
    doc.save(filename);
  }

  /**
   * Export electricity consumption records to PDF
   */
  async exportElectricityToPdf(
    records: ElectricityRecord[],
    filename = 'electricity-consumption.pdf',
  ): Promise<void> {
    const { doc, autoTable } = await this.createDocumentWithHeader(
      'ELECTRICITY.TITLE',
      [255, 193, 7],
    );
    const sortedRecords = sortRecordsByDateAsc(records);

    const headers = [
      this.languageService.translate('HOME.SELECT_DATE') || 'Date',
      this.languageService.translate('ELECTRICITY.VALUE') || 'Value (kWh)',
      this.languageService.translate('PDF.DIFFERENCE'),
    ];

    const data = sortedRecords.map((record, index) => {
      const total = calculateElectricityTotal(record);
      const difference =
        index > 0
          ? formatSignedDiff(total - calculateElectricityTotal(sortedRecords[index - 1]))
          : '-';

      return [this.formatDate(record.date), total.toFixed(2), difference];
    });

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 48,
      theme: 'striped',
      headStyles: {
        fillColor: [255, 193, 7],
        textColor: 0,
        fontStyle: 'bold',
      },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 'auto', halign: 'right' },
      },
    });

    renderPdfPageNumbers(doc);
    doc.save(filename);
  }
}
