import { ConsumptionRecord, parseSafeDate } from '../models/records.model';

const imageBase64Cache = new WeakMap<typeof Image, Map<string, Promise<string>>>();

/**
 * Load an image and convert to base64 for PDF embedding
 */
export function loadImageAsBase64(url: string): Promise<string> {
  let urlCache = imageBase64Cache.get(Image);
  if (!urlCache) {
    urlCache = new Map<string, Promise<string>>();
    imageBase64Cache.set(Image, urlCache);
  }

  const cached = urlCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = new Promise<string>((resolve, reject) => {
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
        urlCache?.delete(url);
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => {
      urlCache?.delete(url);
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });

  urlCache.set(url, promise);
  return promise;
}

/**
 * Sort records ascending by date without mutating the input array.
 * Fast-paths in O(N) when records are already sorted chronologically.
 */
export function sortRecordsByDateAsc<T extends { date: Date }>(records: T[]): T[] {
  if (records.length <= 1) {
    return [...records];
  }
  let isAlreadySorted = true;
  let prevTime = parseSafeDate(records[0].date).getTime();
  for (let i = 1; i < records.length; i++) {
    const currTime = parseSafeDate(records[i].date).getTime();
    if (currTime < prevTime) {
      isAlreadySorted = false;
      break;
    }
    prevTime = currTime;
  }
  if (isAlreadySorted) {
    return [...records];
  }
  return [...records].sort(
    (a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime(),
  );
}

/**
 * Render the standard PDF header (logo, app name, report title, and generated date)
 */
export async function renderPdfReportHeader(
  doc: import('jspdf').jsPDF,
  options: {
    appName: string;
    title: string;
    generatedText: string;
    themeColor: [number, number, number];
    logoPromise?: Promise<string>;
  },
): Promise<void> {
  try {
    const logoBase64 = await (options.logoPromise ?? loadImageAsBase64('/assets/logo-128.png'));
    doc.addImage(logoBase64, 'PNG', 14, 8, 15, 15);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...options.themeColor);
  doc.text(options.appName, 32, 16);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(options.title, 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(options.generatedText, 14, 40);

  doc.setTextColor(0);
}

/**
 * Render centered `i / N` page numbers across all pages of a jsPDF document
 */
export function renderPdfPageNumbers(doc: import('jspdf').jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${i} / ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' },
    );
  }
}

/**
 * Format a numeric difference with an explicit `+` sign for non-negative values
 */
export function formatSignedDiff(diff: number): string {
  return (diff >= 0 ? '+' : '') + diff.toFixed(2);
}

/**
 * Calculate total water consumption difference between two records, handling meter resets per field
 */
export function calculateWaterPdfDiff(
  record: ConsumptionRecord,
  prevRecord: ConsumptionRecord,
): string {
  const fields = ['kitchenWarm', 'kitchenCold', 'bathroomWarm', 'bathroomCold'] as const;
  let totalDiff = 0;

  for (const field of fields) {
    const currVal = record[field];
    const prevVal = prevRecord[field];
    totalDiff += currVal < prevVal ? currVal : currVal - prevVal;
  }

  return formatSignedDiff(totalDiff);
}

/**
 * Calculate total heating consumption difference between two records, handling meter resets per room
 */
export function calculateHeatingPdfDiff(
  record: { rooms: Record<string, number> },
  prevRecord: { rooms: Record<string, number> },
): string {
  let totalDiff = 0;
  const currRooms = record.rooms;
  const prevRooms = prevRecord.rooms;

  for (const roomId in currRooms) {
    if (Object.hasOwn(currRooms, roomId)) {
      const currVal = currRooms[roomId] || 0;
      const prevVal = prevRooms[roomId] || 0;
      totalDiff += currVal < prevVal ? currVal : currVal - prevVal;
    }
  }

  for (const roomId in prevRooms) {
    if (Object.hasOwn(prevRooms, roomId) && !Object.hasOwn(currRooms, roomId)) {
      const prevVal = prevRooms[roomId] || 0;
      totalDiff += 0 < prevVal ? 0 : -prevVal;
    }
  }

  return formatSignedDiff(totalDiff);
}

/**
 * Draw a horizontal separator line across the table when the record year changes
 */
export function drawHeatingYearSeparator(
  data: {
    section: string;
    row: { index: number };
    column: { index: number };
    doc: import('jspdf').jsPDF;
    cell: { y: number };
  },
  sortedRecords: { date: Date }[],
): void {
  if (data.section === 'body' && data.row.index > 0 && data.column.index === 0) {
    const currentRecord = sortedRecords[data.row.index];
    const prevRecord = sortedRecords[data.row.index - 1];

    const currentYear = parseSafeDate(currentRecord.date).getFullYear();
    const prevYear = parseSafeDate(prevRecord.date).getFullYear();

    if (currentYear !== prevYear) {
      const doc = data.doc;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.5);
      doc.line(14, data.cell.y, doc.internal.pageSize.width - 14, data.cell.y);
    }
  }
}
