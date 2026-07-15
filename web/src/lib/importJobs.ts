import { nanoid } from "nanoid";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import { mergeUtmIntoUrl } from "@/lib/campaign";
import {
  importInputUtm,
  validateImportRecords,
  type ImportRowInput,
  type ImportRowPreview,
} from "@/lib/importCsv";
import { buildLinkDocument, buildShortUrl, type NewLinkRecord } from "@/lib/linkRecords";

const IMPORTS_COLLECTION = "importJobs";
const LINKS_COLLECTION = "links";
const PROCESS_LIMIT = 20;
const SHORT_CODE_LENGTH = 7;
const MAX_COLLISION_RETRIES = 5;
const ROW_ID_WIDTH = 6;

export class ImportRequestError extends Error {}
export class ImportNotFoundError extends Error {}

class GeneratedCodeCollisionError extends Error {
  constructor(readonly rowNumber: number) {
    super("Generated short code collision");
  }
}

type TerminalRowStatus = "success" | "error";
type StoredRowStatus = "pending" | TerminalRowStatus;

interface ImportJobData extends DocumentData {
  ownerUid: string;
  ownerEmail: string;
  status: "pending" | "processing" | "completed";
  totalRows: number;
  processedRows: number;
  succeededRows: number;
  failedRows: number;
  nextRow: number;
}

interface ImportRowData extends DocumentData {
  jobId: string;
  ownerUid: string;
  rowNumber: number;
  input: ImportRowInput;
  status: StoredRowStatus;
  error: string | null;
  shortCode: string | null;
}

const rowId = (rowNumber: number): string => String(rowNumber).padStart(ROW_ID_WIDTH, "0");

const timestampToIso = (value: unknown): string | null =>
  value instanceof Timestamp ? value.toDate().toISOString() : null;

const timestampMillis = (value: unknown): number =>
  value instanceof Timestamp ? value.toMillis() : 0;

const numeric = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const statusOf = (value: unknown): StoredRowStatus | "invalid" =>
  value === "pending" || value === "success" || value === "error" ? value : "invalid";

export const serializeImportRow = (data: DocumentData) => {
  const shortCode = typeof data.shortCode === "string" ? data.shortCode : null;
  return {
    rowNumber: numeric(data.rowNumber),
    input: data.input as ImportRowInput,
    status: statusOf(data.status),
    error: typeof data.error === "string" ? data.error : null,
    shortCode,
    shortUrl: shortCode ? buildShortUrl(shortCode) : null,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
};

export const serializeImportJob = (jobId: string, data: DocumentData, outcomes?: unknown[]) => ({
  jobId,
  status: data.status,
  totalRows: numeric(data.totalRows),
  processedRows: numeric(data.processedRows),
  succeededRows: numeric(data.succeededRows),
  failedRows: numeric(data.failedRows),
  nextRow: numeric(data.nextRow),
  createdAt: timestampToIso(data.createdAt),
  updatedAt: timestampToIso(data.updatedAt),
  ...(outcomes ? { outcomes } : {}),
});

const readOwnedJob = async (db: Firestore, uid: string, jobId: string) => {
  const reference = db.collection(IMPORTS_COLLECTION).doc(jobId);
  const snapshot = await reference.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.ownerUid !== uid) throw new ImportNotFoundError("Import job not found");
  return { reference, data: data as ImportJobData };
};

const readRows = async (reference: DocumentReference) => {
  const snapshot = await reference.collection("rows").get();
  return snapshot.docs
    .map((document) => serializeImportRow(document.data()))
    .sort((left, right) => left.rowNumber - right.rowNumber);
};

export const listOwnedImportJobs = async (db: Firestore, uid: string) => {
  const snapshot = await db.collection(IMPORTS_COLLECTION).where("ownerUid", "==", uid).get();
  return snapshot.docs
    .sort((left, right) => timestampMillis(right.data().createdAt) - timestampMillis(left.data().createdAt))
    .map((document) => serializeImportJob(document.id, document.data()));
};

export const getOwnedImportJob = async (db: Firestore, uid: string, jobId: string) => {
  const owned = await readOwnedJob(db, uid, jobId);
  const outcomes = await readRows(owned.reference);
  return serializeImportJob(jobId, owned.data, outcomes);
};

export const createImportJob = async (
  db: Firestore,
  owner: { uid: string; email: string },
  records: unknown,
) => {
  if (!Array.isArray(records) || records.length === 0) {
    throw new ImportRequestError("records must contain at least one row");
  }

  let rows: ImportRowPreview[];
  try {
    rows = validateImportRecords(records);
  } catch (error) {
    throw new ImportRequestError(error instanceof Error ? error.message : "Invalid import records");
  }

  const reference = db.collection(IMPORTS_COLLECTION).doc();
  const batch = db.batch();
  const succeededRows = 0;
  const failedRows = rows.filter((row) => row.status === "error").length;
  const nextRow = rows.find((row) => row.status === "pending")?.rowNumber ?? rows.length + 1;
  const completed = nextRow > rows.length;

  batch.set(reference, {
    schemaVersion: 1,
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    status: completed ? "completed" : "pending",
    totalRows: rows.length,
    processedRows: failedRows,
    succeededRows,
    failedRows,
    nextRow,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  for (const row of rows) {
    batch.set(reference.collection("rows").doc(rowId(row.rowNumber)), {
      schemaVersion: 1,
      jobId: reference.id,
      ownerUid: owner.uid,
      rowNumber: row.rowNumber,
      input: row.input,
      status: row.status,
      error: row.error,
      shortCode: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return getOwnedImportJob(db, owner.uid, reference.id);
};

const assertJobData = (data: DocumentData | undefined, uid: string): ImportJobData => {
  if (!data || data.ownerUid !== uid) throw new ImportNotFoundError("Import job not found");
  if (!Number.isInteger(data.totalRows) || !Number.isInteger(data.nextRow)) {
    throw new Error("Stored import job pointer is invalid");
  }
  return data as ImportJobData;
};

const assertRowData = (
  data: DocumentData | undefined,
  uid: string,
  jobId: string,
  expectedRow: number,
): ImportRowData => {
  if (!data || data.ownerUid !== uid || data.jobId !== jobId || data.rowNumber !== expectedRow) {
    throw new Error("Stored import row pointer is invalid");
  }
  if (statusOf(data.status) === "invalid") throw new Error("Stored import row status is invalid");
  return data as ImportRowData;
};

const nextPendingRow = async (
  transaction: Transaction,
  jobReference: DocumentReference,
  uid: string,
  jobId: string,
  currentRow: number,
  totalRows: number,
): Promise<number> => {
  for (let rowNumber = currentRow + 1; rowNumber <= totalRows; rowNumber += 1) {
    const snapshot = await transaction.get(jobReference.collection("rows").doc(rowId(rowNumber)));
    const row = assertRowData(snapshot.data(), uid, jobId, rowNumber);
    if (row.status === "pending") return rowNumber;
  }
  return totalRows + 1;
};

const validatedStoredInput = (value: unknown): ImportRowInput => {
  const preview = validateImportRecords([value])[0];
  if (!preview || preview.status !== "pending") throw new Error("Stored import row input is invalid");
  return preview.input;
};

const jobUpdate = (job: ImportJobData, nextRow: number, outcome: TerminalRowStatus) => {
  const completed = nextRow > job.totalRows;
  return {
    nextRow,
    status: completed ? "completed" : "processing",
    processedRows: job.processedRows + 1,
    succeededRows: job.succeededRows + (outcome === "success" ? 1 : 0),
    failedRows: job.failedRows + (outcome === "error" ? 1 : 0),
    updatedAt: FieldValue.serverTimestamp(),
  };
};

const processCurrentRow = async (
  db: Firestore,
  owner: { uid: string; email: string },
  jobId: string,
  generatedCode: string,
): Promise<{ transitioned: boolean; completed: boolean }> =>
  db.runTransaction(async (transaction) => {
    const jobReference = db.collection(IMPORTS_COLLECTION).doc(jobId);
    const jobSnapshot = await transaction.get(jobReference);
    const job = assertJobData(jobSnapshot.data(), owner.uid);
    if (job.status === "completed") return { transitioned: false, completed: true };
    if (job.nextRow < 1 || job.nextRow > job.totalRows) {
      throw new Error("Stored import job pointer is out of range");
    }

    const currentReference = jobReference.collection("rows").doc(rowId(job.nextRow));
    const currentSnapshot = await transaction.get(currentReference);
    const current = assertRowData(currentSnapshot.data(), owner.uid, jobId, job.nextRow);
    if (current.status !== "pending") throw new Error("Stored import job does not point to a pending row");
    const input = validatedStoredInput(current.input);
    const customCode = input.customCode;
    const shortCode = customCode ?? generatedCode;
    const linkReference = db.collection(LINKS_COLLECTION).doc(shortCode);
    const linkSnapshot = await transaction.get(linkReference);
    if (linkSnapshot.exists && !customCode) throw new GeneratedCodeCollisionError(job.nextRow);

    const nextRow = await nextPendingRow(
      transaction,
      jobReference,
      owner.uid,
      jobId,
      job.nextRow,
      job.totalRows,
    );

    if (linkSnapshot.exists) {
      transaction.update(currentReference, {
        status: "error",
        error: "That alias is already taken",
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(jobReference, jobUpdate(job, nextRow, "error"));
      return { transitioned: true, completed: nextRow > job.totalRows };
    }

    const utm = importInputUtm(input);
    const originalUrl = utm ? mergeUtmIntoUrl(input.originalUrl, utm) : input.originalUrl;
    const link: NewLinkRecord = {
      shortCode,
      originalUrl,
      ownerUid: owner.uid,
      ownerEmail: owner.email,
      tags: input.tags,
      utm,
      enabled: input.enabled,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      importId: jobId,
      importRowId: currentReference.id,
    };
    transaction.create(linkReference, buildLinkDocument(link));
    transaction.update(currentReference, {
      status: "success",
      error: null,
      shortCode,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(jobReference, jobUpdate(job, nextRow, "success"));
    return { transitioned: true, completed: nextRow > job.totalRows };
  });

const failGeneratedRow = async (
  db: Firestore,
  uid: string,
  jobId: string,
  expectedRow: number,
): Promise<{ transitioned: boolean; completed: boolean }> =>
  db.runTransaction(async (transaction) => {
    const jobReference = db.collection(IMPORTS_COLLECTION).doc(jobId);
    const jobSnapshot = await transaction.get(jobReference);
    const job = assertJobData(jobSnapshot.data(), uid);
    if (job.status === "completed") return { transitioned: false, completed: true };
    if (job.nextRow !== expectedRow) return { transitioned: false, completed: false };

    const rowReference = jobReference.collection("rows").doc(rowId(expectedRow));
    const rowSnapshot = await transaction.get(rowReference);
    const row = assertRowData(rowSnapshot.data(), uid, jobId, expectedRow);
    if (row.status !== "pending") return { transitioned: false, completed: false };
    const input = validatedStoredInput(row.input);
    if (input.customCode) throw new Error("Collision retry state is invalid for a custom alias");
    const nextRow = await nextPendingRow(
      transaction,
      jobReference,
      uid,
      jobId,
      expectedRow,
      job.totalRows,
    );
    transaction.update(rowReference, {
      status: "error",
      error: "Failed to generate a unique short code, please retry",
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(jobReference, jobUpdate(job, nextRow, "error"));
    return { transitioned: true, completed: nextRow > job.totalRows };
  });

const processOneRow = async (
  db: Firestore,
  owner: { uid: string; email: string },
  jobId: string,
): Promise<{ transitioned: boolean; completed: boolean }> => {
  let collisionRow: number | null = null;
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
    try {
      return await processCurrentRow(db, owner, jobId, nanoid(SHORT_CODE_LENGTH));
    } catch (error) {
      if (!(error instanceof GeneratedCodeCollisionError)) throw error;
      collisionRow = error.rowNumber;
    }
  }
  if (collisionRow === null) throw new Error("Short code collision retry state is invalid");
  return failGeneratedRow(db, owner.uid, jobId, collisionRow);
};

export const processOwnedImportJob = async (
  db: Firestore,
  owner: { uid: string; email: string },
  jobId: string,
) => {
  for (let processed = 0; processed < PROCESS_LIMIT; processed += 1) {
    const result = await processOneRow(db, owner, jobId);
    if (result.completed || !result.transitioned) break;
  }
  return getOwnedImportJob(db, owner.uid, jobId);
};
