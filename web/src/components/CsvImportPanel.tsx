"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa, { type ParseError } from "papaparse";
import Button from "@/components/Button";
import {
  createImportJob,
  getImportJob,
  listImportJobs,
  processImportJob,
  type ImportJob,
  type ImportRowOutcome,
} from "@/lib/api";
import { downloadCsv, importReportToCsv } from "@/lib/csv";
import { MAX_IMPORT_ROWS, validateImportRecords } from "@/lib/importCsv";

const MAX_FILE_SIZE = 1024 * 1024;
const PREVIEW_LIMIT = 10;
const TEMPLATE_COLUMNS = [
  "originalUrl",
  "customCode",
  "tags",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "enabled",
  "startsAt",
  "expiresAt",
] as const;

type UnknownRecord = Record<string, unknown>;

interface CsvImportPanelProps {
  onCompleted?: () => void;
}

interface PreviewError {
  row?: number;
  message: string;
}

interface ValidationPreview {
  sourceRows: UnknownRecord[];
  errors: PreviewError[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
  parseErrorCount: number;
}

interface FailureState {
  message: string;
  retryable: boolean;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstArray(record: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key];
  }
  return [];
}

function normalizeValidation(
  validated: ReturnType<typeof validateImportRecords>,
  sourceRows: UnknownRecord[],
  parseErrors: ParseError[],
): ValidationPreview {
  const validationErrors = validated
    .filter((row) => row.status === "error")
    .map((row) => ({ row: row.rowNumber, message: row.error ?? "Invalid row" }));
  const csvErrors = parseErrors.map((error) => ({
    row: typeof error.row === "number" ? error.row + 1 : undefined,
    message: error.message,
  }));
  const invalidRows = new Set(validationErrors.map((error) => error.row));
  for (const error of csvErrors) {
    if (error.row !== undefined) invalidRows.add(error.row);
  }
  const invalidCount = Math.min(sourceRows.length, invalidRows.size);
  return {
    sourceRows,
    errors: [...csvErrors, ...validationErrors],
    totalCount: sourceRows.length,
    validCount: sourceRows.length - invalidCount,
    invalidCount,
    parseErrorCount: csvErrors.length,
  };
}

function jobData(job: ImportJob): UnknownRecord {
  return job as unknown as UnknownRecord;
}

function jobIdOf(job: ImportJob): string | null {
  const data = jobData(job);
  for (const key of ["jobId", "id"]) {
    if (typeof data[key] === "string" && data[key].length > 0) return data[key];
  }
  return null;
}

function jobStatusOf(job: ImportJob): string {
  const status = jobData(job).status;
  return typeof status === "string" ? status.toLowerCase() : "pending";
}

function isCompleted(job: ImportJob): boolean {
  return ["completed", "complete", "succeeded"].includes(jobStatusOf(job));
}

function numericField(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function jobProgress(job: ImportJob): { processed: number; total: number } {
  const data = jobData(job);
  const total = numericField(data, ["totalRows", "total", "rowCount"]) ?? 0;
  const explicit = numericField(data, ["processedRows", "processed", "completedRows"]);
  const succeeded = numericField(data, ["succeededRows", "succeeded", "successCount"]) ?? 0;
  const failed = numericField(data, ["failedRows", "failed", "failureCount"]) ?? 0;
  return { processed: Math.min(explicit ?? succeeded + failed, total || Number.MAX_SAFE_INTEGER), total };
}

function jobTimestamp(job: ImportJob): number {
  const data = jobData(job);
  for (const key of ["updatedAt", "createdAt"]) {
    const value = data[key];
    if (typeof value === "string" || typeof value === "number") {
      const timestamp = new Date(value).getTime();
      if (Number.isFinite(timestamp)) return timestamp;
    }
  }
  return 0;
}

function outcomesOf(job: ImportJob): ImportRowOutcome[] {
  const values = firstArray(jobData(job), ["outcomes", "rowOutcomes", "results"]);
  return values.filter(isRecord) as unknown as ImportRowOutcome[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The import could not continue.";
}

function isTransient(error: unknown): boolean {
  if (!isRecord(error) && !(error instanceof Error)) return true;
  const status = (error as unknown as UnknownRecord).status;
  return typeof status !== "number" || status === 0 || status === 408 || status === 429 || status >= 500;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function CsvImportPanel({ onCompleted }: CsvImportPanelProps) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ValidationPreview | null>(null);
  const [parsePending, setParsePending] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const mountedRef = useRef(false);
  const processingRef = useRef(false);
  const runTokenRef = useRef(0);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  const columns = useMemo(() => {
    if (!preview) return [];
    const names = new Set<string>();
    preview.sourceRows.slice(0, PREVIEW_LIMIT).forEach((row) => {
      Object.keys(row).forEach((key) => names.add(key));
    });
    return Array.from(names).slice(0, 8);
  }, [preview]);

  const processUntilCompleted = useCallback(async (jobId: string): Promise<void> => {
    if (processingRef.current) return;
    const runToken = ++runTokenRef.current;
    processingRef.current = true;
    setProcessing(true);
    setFailure(null);

    try {
      let current = await getImportJob(jobId);
      if (!mountedRef.current || runToken !== runTokenRef.current) return;
      setJob(current);

      while (mountedRef.current && runToken === runTokenRef.current && !isCompleted(current)) {
        current = await processImportJob(jobId);
        if (!mountedRef.current || runToken !== runTokenRef.current) return;
        setJob(current);
      }

      if (isCompleted(current)) onCompletedRef.current?.();
    } catch (error) {
      if (mountedRef.current && runToken === runTokenRef.current) {
        setFailure({ message: errorMessage(error), retryable: isTransient(error) });
      }
    } finally {
      if (runToken === runTokenRef.current) {
        processingRef.current = false;
        if (mountedRef.current) setProcessing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const resumeNewestJob = async (): Promise<void> => {
      try {
        const jobs = await listImportJobs();
        if (cancelled || !mountedRef.current) return;
        const newest = [...jobs]
          .filter((candidate) => !isCompleted(candidate) && jobIdOf(candidate) !== null)
          .sort((left, right) => jobTimestamp(right) - jobTimestamp(left))[0];
        if (!newest) return;
        setJob(newest);
        const id = jobIdOf(newest);
        if (id) await processUntilCompleted(id);
      } catch (error) {
        if (!cancelled && mountedRef.current) {
          setFailure({ message: errorMessage(error), retryable: isTransient(error) });
        }
      }
    };

    void resumeNewestJob();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      processingRef.current = false;
      runTokenRef.current += 1;
    };
  }, [processUntilCompleted]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    setPreview(null);
    setFailure(null);
    setFileName(file?.name ?? "");
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFailure({ message: "Choose a CSV file no larger than 1 MiB.", retryable: false });
      event.target.value = "";
      setFileName("");
      return;
    }

    setParsePending(true);
    Papa.parse<UnknownRecord>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        try {
          const validation = validateImportRecords(results.data);
          setPreview(normalizeValidation(validation, results.data, results.errors));
        } catch (error) {
          setFailure({ message: errorMessage(error), retryable: false });
        } finally {
          setParsePending(false);
        }
      },
      error: (error) => {
        setFailure({ message: error.message || "The CSV file could not be read.", retryable: false });
        setParsePending(false);
      },
    });
  }, []);

  const handleStart = useCallback(async (): Promise<void> => {
    if (!preview || preview.sourceRows.length === 0 || processingRef.current) return;
    setFailure(null);
    try {
      const created = await createImportJob(preview.sourceRows);
      if (!mountedRef.current) return;
      setJob(created);
      const id = jobIdOf(created);
      if (!id) throw new Error("The import job response did not include an ID.");
      await processUntilCompleted(id);
    } catch (error) {
      if (mountedRef.current) {
        setFailure({ message: errorMessage(error), retryable: isTransient(error) });
      }
    }
  }, [preview, processUntilCompleted]);

  const handleRetry = useCallback(async (): Promise<void> => {
    const currentId = job ? jobIdOf(job) : null;
    if (currentId) {
      await processUntilCompleted(currentId);
      return;
    }

    setFailure(null);
    try {
      const newest = [...(await listImportJobs())]
        .filter((candidate) => !isCompleted(candidate) && jobIdOf(candidate) !== null)
        .sort((left, right) => jobTimestamp(right) - jobTimestamp(left))[0];
      if (!mountedRef.current || !newest) return;
      setJob(newest);
      const id = jobIdOf(newest);
      if (id) await processUntilCompleted(id);
    } catch (error) {
      if (mountedRef.current) {
        setFailure({ message: errorMessage(error), retryable: isTransient(error) });
      }
    }
  }, [job, processUntilCompleted]);

  const handleTemplateDownload = useCallback((): void => {
    downloadCsv("ziplink-import-template.csv", `${TEMPLATE_COLUMNS.join(",")}\r\n`);
  }, []);

  const handleReportDownload = useCallback((): void => {
    if (!job) return;
    const outcomes = outcomesOf(job);
    if (outcomes.length === 0) return;
    downloadCsv(`ziplink-import-${jobIdOf(job) ?? "report"}.csv`, importReportToCsv(outcomes));
  }, [job]);

  const progress = job ? jobProgress(job) : null;
  const outcomes = job ? outcomesOf(job) : [];
  const completed = job ? isCompleted(job) : false;
  const canStart = Boolean(
    preview && preview.totalCount > 0 && preview.parseErrorCount === 0 && !processing && !parsePending,
  );

  return (
    <section className="glass-card space-y-5 p-4 sm:p-6" aria-labelledby="csv-import-heading">
      <div className="space-y-1">
        <h2 id="csv-import-heading" className="text-lg font-semibold text-foreground">
          Import links from CSV
        </h2>
        <p className="text-sm text-muted">
          Required header: <code className="text-muted-strong">originalUrl</code>. Optional: customCode,
          tags, and utmSource/utmMedium/utmCampaign/utmTerm/utmContent. Separate tags with pipes.
          Maximum {MAX_IMPORT_ROWS.toLocaleString()} rows and 1 MiB.
        </p>
        <Button variant="ghost" size="sm" onClick={handleTemplateDownload}>
          Download template
        </Button>
      </div>

      <div className="space-y-2">
        <label htmlFor="csv-import-file" className="block text-sm font-medium text-foreground">
          CSV file
        </label>
        <input
          id="csv-import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={processing}
          aria-describedby="csv-import-help"
          className="block min-w-0 max-w-full text-ellipsis rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 py-2 text-sm text-foreground file:mr-2 file:max-w-[55%] file:truncate file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:file:mr-3 sm:file:max-w-none"
        />
        <p id="csv-import-help" className="text-xs text-muted">
          The file is validated locally before an import job is created.
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true" className="min-h-5 text-sm text-muted-strong">
        {parsePending ? "Reading and validating CSV…" : fileName ? `Selected ${fileName}` : null}
      </div>

      {failure ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[color:var(--danger)] bg-[color:var(--danger-soft)] p-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{failure.message}</span>
          {failure.retryable ? (
            <Button variant="secondary" size="sm" onClick={() => void handleRetry()} disabled={processing}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-4" aria-labelledby="csv-preview-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="csv-preview-heading" className="font-medium text-foreground">
                Validation preview
              </h3>
              <p className="text-sm text-muted">
                {preview.totalCount} total · {preview.validCount} valid · {preview.invalidCount} invalid
              </p>
            </div>
            <Button onClick={() => void handleStart()} disabled={!canStart} loading={processing}>
              Start import
            </Button>
          </div>

          {preview.parseErrorCount > 0 ? (
            <p className="text-sm text-danger" role="alert">
              Fix the CSV syntax errors before starting this import.
            </p>
          ) : preview.invalidCount > 0 ? (
            <p className="text-sm text-warning" role="status">
              Invalid rows will be recorded as errors and skipped; valid rows will still be imported.
            </p>
          ) : null}

          {preview.sourceRows.length > 0 ? (
            <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">First {Math.min(PREVIEW_LIMIT, preview.totalCount)} CSV rows</caption>
                <thead className="bg-surface-muted text-xs text-muted-strong">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Row</th>
                    {columns.map((column) => (
                      <th key={column} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.sourceRows.slice(0, PREVIEW_LIMIT).map((row, index) => (
                    <tr key={index} className="bg-surface align-top text-foreground">
                      <th scope="row" className="px-3 py-2 font-medium tabular-nums">{index + 1}</th>
                      {columns.map((column) => (
                        <td key={column} className="max-w-72 truncate px-3 py-2" title={displayValue(row[column])}>
                          {displayValue(row[column]) || <span className="text-muted">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {preview.errors.length > 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted p-3">
              <h4 className="text-sm font-medium text-foreground">
                First {Math.min(PREVIEW_LIMIT, preview.errors.length)} errors
              </h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-danger">
                {preview.errors.slice(0, PREVIEW_LIMIT).map((error, index) => (
                  <li key={`${error.row ?? "unknown"}-${index}`}>
                    {error.row ? `Row ${error.row}: ` : ""}{error.message}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}

      {job ? (
        <div className="space-y-3 rounded-[var(--radius-sm)] border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-foreground">Import progress</h3>
              <p className="text-sm capitalize text-muted" role="status" aria-live="polite">
                {jobStatusOf(job)}
                {progress && progress.total > 0
                  ? ` · ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} rows`
                  : ""}
              </p>
            </div>
            {completed && outcomes.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={handleReportDownload}>
                Download report
              </Button>
            ) : null}
          </div>
          <progress
            className="h-2 w-full overflow-hidden rounded-full accent-brand-500"
            max={Math.max(progress?.total ?? 0, 1)}
            value={completed ? Math.max(progress?.total ?? 0, 1) : progress?.processed ?? 0}
            aria-label="CSV import progress"
          />
          {processing ? (
            <p className="text-xs text-muted">
              Keep this page open while rows are processed. Closing the page pauses naturally; the newest unfinished job resumes when you return.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
