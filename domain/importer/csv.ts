import { parseExactToMinorUnits } from '../money/decimal.ts';

export interface CsvColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  payerColumn?: string;
  categoryColumn?: string;
}

export interface ParsedCsvRow {
  index: number;
  raw: Record<string, string>;
  normalizedDate?: string;
  normalizedDescription?: string;
  normalizedAmountMinorUnits?: bigint;
  normalizedPayerName?: string;
  normalizedCategory?: string;
  fingerprint: string;
  status: 'VALID' | 'DUPLICATE' | 'ERROR';
  errorMessage?: string;
}

/**
 * Standard single-pass CSV tokenizer and parser supporting RFC 4180
 * with quoted values, commas, and multiline cells.
 */
export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const table: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped double quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          table.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          table.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  // Push final field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      table.push(currentRow);
    }
  }

  if (table.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const headers = table[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < table.length; r++) {
    const rowArray = table[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = rowArray[c] !== undefined ? rowArray[c] : '';
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Pure JavaScript deterministic 64-bit string hash (Murmur/djb2 hybrid)
 * Completely environment-agnostic (works in Node and Web browser without node:crypto).
 */
export function generateRowFingerprint(
  groupId: string,
  date: string,
  description: string,
  amountMinorUnits: bigint,
  payer: string
): string {
  const normDate = date.trim();
  const normDesc = description.trim().toLowerCase();
  const normAmount = amountMinorUnits.toString();
  const normPayer = payer.trim().toLowerCase();

  const str = `${groupId}|${normDate}|${normDesc}|${normAmount}|${normPayer}`;

  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

/**
 * Normalizes and validates parsed CSV rows against group currency and existing fingerprints.
 */
export function normalizeImportRows(params: {
  groupId: string;
  currencyCode: string;
  rows: Record<string, string>[];
  mapping: CsvColumnMapping;
  existingFingerprints: Set<string>;
}): ParsedCsvRow[] {
  const results: ParsedCsvRow[] = [];
  const batchSeenFingerprints = new Set<string>();

  params.rows.forEach((row, idx) => {
    const dateRaw = row[params.mapping.dateColumn] || '';
    const descRaw = row[params.mapping.descriptionColumn] || '';
    const amountRaw = row[params.mapping.amountColumn] || '';
    const payerRaw = params.mapping.payerColumn ? row[params.mapping.payerColumn] || '' : '';
    const categoryRaw = params.mapping.categoryColumn ? row[params.mapping.categoryColumn] || 'Other' : 'Other';

    let normalizedDate = '';
    let errorMessage: string | undefined;

    if (!descRaw.trim()) {
      errorMessage = 'Missing transaction description.';
    }

    if (!errorMessage) {
      const trimmedDate = dateRaw.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        normalizedDate = trimmedDate;
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmedDate)) {
        const [m, d, y] = trimmedDate.split('/');
        normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        errorMessage = `Unrecognized date format: "${dateRaw}". Expected YYYY-MM-DD.`;
      }
    }

    let minorUnits = 0n;
    if (!errorMessage) {
      try {
        const cleanAmount = amountRaw.replace(/[$€£₹¥,\s]/g, '');
        minorUnits = parseExactToMinorUnits(cleanAmount, params.currencyCode);
        if (minorUnits <= 0n) {
          errorMessage = 'Expense amount must be strictly greater than zero.';
        }
      } catch (err: any) {
        errorMessage = err.message || 'Invalid amount format.';
      }
    }

    if (errorMessage) {
      results.push({
        index: idx,
        raw: row,
        fingerprint: `error_${idx}`,
        status: 'ERROR',
        errorMessage,
      });
      return;
    }

    const fingerprint = generateRowFingerprint(
      params.groupId,
      normalizedDate,
      descRaw,
      minorUnits,
      payerRaw
    );

    const isDuplicate =
      params.existingFingerprints.has(fingerprint) || batchSeenFingerprints.has(fingerprint);
    batchSeenFingerprints.add(fingerprint);

    results.push({
      index: idx,
      raw: row,
      normalizedDate,
      normalizedDescription: descRaw.trim(),
      normalizedAmountMinorUnits: minorUnits,
      normalizedPayerName: payerRaw.trim() || undefined,
      normalizedCategory: categoryRaw.trim() || 'Other',
      fingerprint,
      status: isDuplicate ? 'DUPLICATE' : 'VALID',
    });
  });

  return results;
}

/**
 * Sanitizes cell text to prevent CSV spreadsheet-formula injection (CSV injection attack).
 */
export function sanitizeCsvCell(value: string | number | bigint | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
