'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { parseCsvText } from '@/domain/importer/csv.ts';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { formatMoney } from '@/domain/money/decimal.ts';

export default function CsvImportPage() {
  const params = useParams();
  const groupId = params?.groupId as string;
  const router = useRouter();

  const [group, setGroup] = useState<any>(null);
  const [csvRaw, setCsvRaw] = useState('');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  // Column Mapping
  const [dateCol, setDateCol] = useState('');
  const [descCol, setDescCol] = useState('');
  const [amountCol, setAmountCol] = useState('');
  const [payerCol, setPayerCol] = useState('');
  const [categoryCol, setCategoryCol] = useState('');

  // Preview State
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'SKIP' | 'IMPORT_ALL'>('SKIP');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((g) => setGroup(g));
  }, [groupId]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRaw(text);
      try {
        const parsed = parseCsvText(text);
        setCsvHeaders(parsed.headers);
        // Auto-detect columns
        parsed.headers.forEach((h) => {
          const lower = h.toLowerCase();
          if (lower.includes('date')) setDateCol(h);
          else if (lower.includes('desc') || lower.includes('memo') || lower.includes('item')) setDescCol(h);
          else if (lower.includes('amount') || lower.includes('cost') || lower.includes('price')) setAmountCol(h);
          else if (lower.includes('payer') || lower.includes('who') || lower.includes('name')) setPayerCol(h);
          else if (lower.includes('cat') || lower.includes('type')) setCategoryCol(h);
        });
      } catch (err: any) {
        setErrorMsg('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const loadSampleCsv = (type: 'valid' | 'malformed') => {
    setErrorMsg(null);
    setPreviewData(null);
    if (type === 'valid') {
      const sample = `Date,Description,Amount,Payer,Category
2026-10-21,"Costco wholesale essentials & detergent",142.80,Alice Vance,Groceries
2026-10-22,"High-speed Internet bill",85.00,Bob Chen,Rent & Utilities
2026-10-23,"Community dinner pizza & soda",54.50,Charlie Miller,Dining
`;
      setFileName('household_expenses_october.csv');
      setCsvRaw(sample);
      const parsed = parseCsvText(sample);
      setCsvHeaders(parsed.headers);
      setDateCol('Date');
      setDescCol('Description');
      setAmountCol('Amount');
      setPayerCol('Payer');
      setCategoryCol('Category');
    } else {
      const sample = `Date,Description,Amount,Payer
INVALID_DATE,"Missing amount row",,Alice
2026-10-24,"Valid row in mixed batch",32.00,Bob
2026-10-24,,50.00,Charlie
`;
      setFileName('malformed_sample.csv');
      setCsvRaw(sample);
      const parsed = parseCsvText(sample);
      setCsvHeaders(parsed.headers);
      setDateCol('Date');
      setDescCol('Description');
      setAmountCol('Amount');
      setPayerCol('Payer');
    }
  };

  const handleGeneratePreview = async () => {
    if (!csvRaw || !dateCol || !descCol || !amountCol) {
      setErrorMsg('Please select a file and map Date, Description, and Amount columns.');
      return;
    }

    setLoadingPreview(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/imports/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName || 'import.csv',
          csvContent: csvRaw,
          mapping: {
            dateColumn: dateCol,
            descriptionColumn: descCol,
            amountColumn: amountCol,
            payerColumn: payerCol || undefined,
            categoryColumn: categoryCol || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate preview');

      setPreviewData(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData?.batchId) return;
    setCommitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/imports/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: previewData.batchId,
          duplicatePolicy,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to commit batch');

      setSuccessMsg(`Successfully imported ${data.committedCount} expense records into ledger.`);
      setTimeout(() => {
        router.push(`/groups/${groupId}/expenses`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sw-bg)]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[var(--sw-ink)]">
            CSV Statement Import & Reconciliation
          </h1>
          <p className="text-xs text-[var(--sw-muted)] mt-0.5">
            Upload bank or credit card statements, map columns, preview normalization, and detect duplicates.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[var(--sw-danger-bg)] border border-[var(--sw-danger-border)] rounded-md text-xs text-[var(--sw-rust)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#edf7f0] border border-[#c5d8cb] rounded-md text-xs text-[var(--sw-accent)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Upload or Preload */}
        <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--sw-border-soft)] gap-2">
            <h2 className="font-serif font-bold text-sm text-[var(--sw-ink)] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[var(--sw-accent)]" />
              <span>Step 1: Choose CSV File</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadSampleCsv('valid')}
                className="px-2.5 py-1 bg-[var(--sw-warm)] hover:bg-[#dfd7c8] text-[var(--sw-ink)] rounded text-[11px] font-medium"
              >
                Load Valid Sample
              </button>
              <button
                type="button"
                onClick={() => loadSampleCsv('malformed')}
                className="px-2.5 py-1 bg-[var(--sw-warm)] hover:bg-[#dfd7c8] text-[var(--sw-rust)] rounded text-[11px] font-medium"
              >
                Load Malformed Sample
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="cursor-pointer px-4 py-2 bg-[var(--sw-input)] hover:bg-[var(--sw-hover)] text-[var(--sw-ink)] border border-[var(--sw-border-strong)] rounded-md text-xs font-semibold inline-flex items-center gap-2 shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>Select Local CSV File</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
            </label>
            <span className="text-xs font-mono text-[var(--sw-body)]">
              {fileName || 'No file selected yet'}
            </span>
          </div>
        </div>

        {/* Step 2: Column Mapping */}
        {csvHeaders.length > 0 && (
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="font-serif font-bold text-sm text-[var(--sw-ink)] pb-3 border-b border-[var(--sw-border-soft)] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[var(--sw-accent)]" />
              <span>Step 2: Map CSV Headers</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--sw-body)] mb-1">Date Column *</label>
                <select
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded"
                >
                  <option value="">-- Select Column --</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--sw-body)] mb-1">Description Column *</label>
                <select
                  value={descCol}
                  onChange={(e) => setDescCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded"
                >
                  <option value="">-- Select Column --</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--sw-body)] mb-1">Amount Column *</label>
                <select
                  value={amountCol}
                  onChange={(e) => setAmountCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded"
                >
                  <option value="">-- Select Column --</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--sw-body)] mb-1">Payer Column (Optional)</label>
                <select
                  value={payerCol}
                  onChange={(e) => setPayerCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded"
                >
                  <option value="">Default to First Participant</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--sw-body)] mb-1">Category Column (Optional)</label>
                <select
                  value={categoryCol}
                  onChange={(e) => setCategoryCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded"
                >
                  <option value="">Default to &apos;Other&apos;</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={loadingPreview}
                  onClick={handleGeneratePreview}
                  className="w-full py-2 bg-[var(--sw-accent)] hover:bg-[var(--sw-accent-strong)] text-[var(--sw-on-ink)] rounded font-semibold text-xs transition-colors shadow-xs"
                >
                  {loadingPreview ? 'Validating Batch...' : 'Preview Import Batch'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Batch Preview & Resolution */}
        {previewData && (
          <div className="bg-[var(--sw-surface)] border border-[var(--sw-border)] rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--sw-border-soft)] gap-3">
              <div>
                <h2 className="font-serif font-bold text-sm text-[var(--sw-ink)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--sw-accent)]" />
                  <span>Step 3: Normalized Batch Preview</span>
                </h2>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="text-[var(--sw-accent)] font-semibold">{previewData.validRows} Valid</span>
                  <span>•</span>
                  <span className="text-[var(--sw-rust)] font-semibold">{previewData.duplicateRows} Duplicate(s)</span>
                  <span>•</span>
                  <span className="text-[#b34724] font-semibold">{previewData.errorRows} Error(s)</span>
                </div>
              </div>

              {/* Duplicate policy */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--sw-body)] font-semibold">Duplicate Policy:</span>
                <select
                  value={duplicatePolicy}
                  onChange={(e) => setDuplicatePolicy(e.target.value as any)}
                  className="px-2 py-1 bg-[var(--sw-input)] border border-[var(--sw-border-strong)] rounded text-xs"
                >
                  <option value="SKIP">Skip Duplicates (Recommended)</option>
                  <option value="IMPORT_ALL">Import All Regardless</option>
                </select>
              </div>
            </div>

            {/* Rows Table */}
            <div className="border border-[var(--sw-border)] rounded-md overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--sw-surface-soft)] text-[var(--sw-muted)] font-mono uppercase text-[10px] sticky top-0 border-b border-[var(--sw-border)]">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Payer</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece6d9]">
                  {previewData.rows.map((r: any) => (
                    <tr
                      key={r.index}
                      className={
                        r.status === 'ERROR'
                          ? 'bg-[var(--sw-danger-bg)]'
                          : r.status === 'DUPLICATE'
                          ? 'bg-[#faf6ee]'
                          : 'hover:bg-[var(--sw-hover)]'
                      }
                    >
                      <td className="py-2 px-3 font-mono text-[var(--sw-muted)]">{r.index + 1}</td>
                      <td className="py-2 px-3 font-mono">{r.normalizedDate || '-'}</td>
                      <td className="py-2 px-3 font-medium">
                        {r.normalizedDescription || '-'}
                        {r.errorMessage && (
                          <div className="text-[10px] text-[var(--sw-rust)] font-normal">
                            {r.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">{r.normalizedPayerName || 'Default'}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {r.normalizedAmountMinorUnits
                          ? formatMoney(BigInt(r.normalizedAmountMinorUnits), group?.canonicalCurrency)
                          : '-'}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            r.status === 'VALID'
                              ? 'bg-[var(--sw-positive-bg)] text-[var(--sw-accent)]'
                              : r.status === 'DUPLICATE'
                              ? 'bg-[#faebd7] text-[var(--sw-rust)]'
                              : 'bg-[#f3cbbd] text-[var(--sw-rust)]'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commit CTA */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--sw-border-soft)]">
              <button
                type="button"
                disabled={committing || previewData.validRows === 0}
                onClick={handleCommit}
                className="px-5 py-2 bg-[var(--sw-accent)] hover:bg-[var(--sw-accent-strong)] text-[var(--sw-on-ink)] rounded text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <span>{committing ? 'Committing...' : 'Commit Verified Records to Ledger'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
