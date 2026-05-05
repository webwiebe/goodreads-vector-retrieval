import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { embedTexts } from "./embeddings.js";
import { ensureCollection, getCollectionCount, upsertBooks } from "./vector-store.js";
import type { Book, IngestionStatus } from "../types/index.js";

const WORKS_CSV = "goodreads_works.csv";
const BATCH_SIZE = 64;
const INGESTION_THRESHOLD = 12000;
const LOG_INTERVAL = 500;

const status: IngestionStatus = {
  complete: false,
  totalBooks: 0,
  indexedBooks: 0,
  inProgress: false,
};

export function getIngestionStatus(): IngestionStatus {
  return { ...status };
}

function recordToBook(record: Record<string, string>): Book {
  const year = record["original_publication_year"]
    ? parseInt(record["original_publication_year"], 10)
    : NaN;
  return {
    work_id: record["work_id"] ?? "",
    title: record["original_title"] ?? record["title"] ?? "",
    author: record["author"] ?? "",
    genres: record["genres"] ?? "",
    description: record["description"] ?? "",
    avg_rating: parseFloat(record["avg_rating"] ?? "0") || 0,
    ratings_count: parseInt(record["ratings_count"] ?? "0", 10) || 0,
    original_publication_year: isNaN(year) ? null : year,
    image_url: record["image_url"] ?? "",
  };
}

function buildEmbeddingText(book: Book): string {
  const description = book.description.slice(0, 500);
  return `${book.title} by ${book.author}. Genres: ${book.genres}. ${description}`;
}

function extractWorksFromZip(zipPath: string, destDir: string): string {
  const zip = new AdmZip(zipPath);
  const entry = zip.getEntries().find((e) => e.entryName.endsWith(WORKS_CSV));
  if (!entry) {
    throw new Error(`${WORKS_CSV} not found in ${zipPath}`);
  }
  zip.extractEntryTo(entry, destDir, false, true);
  return path.join(destDir, WORKS_CSV);
}

export async function runIngestion(): Promise<void> {
  if (status.inProgress || status.complete) return;

  status.inProgress = true;
  status.error = undefined;

  try {
    await ensureCollection();

    const existingCount = await getCollectionCount();
    if (existingCount >= INGESTION_THRESHOLD) {
      status.complete = true;
      status.totalBooks = existingCount;
      status.indexedBooks = existingCount;
      status.inProgress = false;
      return;
    }

    const csvPath = path.join(config.dataDir, WORKS_CSV);
    if (!fs.existsSync(csvPath)) {
      console.log(`Extracting ${WORKS_CSV} from ${config.zipPath}...`);
      extractWorksFromZip(config.zipPath, config.dataDir);
      console.log("Extraction complete.");
    }

    const fileBuffer = fs.readFileSync(csvPath);
    const records: Record<string, string>[] = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    status.totalBooks = records.length;
    status.indexedBooks = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batchRecords = records.slice(i, i + BATCH_SIZE);
      const books = batchRecords.map(recordToBook);
      const texts = books.map(buildEmbeddingText);
      const vectors = await embedTexts(texts);

      await upsertBooks(books.map((book, j) => ({ book, vector: vectors[j] })));

      status.indexedBooks += books.length;

      if (status.indexedBooks % LOG_INTERVAL < BATCH_SIZE || status.indexedBooks >= status.totalBooks) {
        console.log(`Ingestion progress: ${status.indexedBooks}/${status.totalBooks} books indexed`);
      }
    }

    status.complete = true;
    console.log(`Ingestion complete: ${status.indexedBooks} books indexed.`);
  } catch (err) {
    status.error = err instanceof Error ? err.message : String(err);
    console.error("Ingestion error:", status.error);
  } finally {
    status.inProgress = false;
  }
}
