const DB_NAME = "balao-reader-library";
const DB_VERSION = 1;
const COMICS_STORE = "comics";
const FILES_STORE = "files";

let databasePromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error || new Error("Falha no banco local.")), { once: true });
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", resolve, { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("Operação cancelada.")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error || new Error("Falha no banco local.")), { once: true });
  });
}

export function openLibraryDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.addEventListener("upgradeneeded", () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(COMICS_STORE)) {
          const comics = database.createObjectStore(COMICS_STORE, { keyPath: "id" });
          comics.createIndex("updatedAt", "updatedAt");
          comics.createIndex("status", "status");
          comics.createIndex("matchKey", "matchKey");
        }
        if (!database.objectStoreNames.contains(FILES_STORE)) {
          database.createObjectStore(FILES_STORE, { keyPath: "comicId" });
        }
      });
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error || new Error("Não foi possível abrir a biblioteca local.")), { once: true });
    });
  }
  return databasePromise;
}

export async function listLibraryComics() {
  const database = await openLibraryDatabase();
  const transaction = database.transaction(COMICS_STORE, "readonly");
  const items = await requestResult(transaction.objectStore(COMICS_STORE).getAll());
  await transactionDone(transaction);
  return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getLibraryComic(id) {
  const database = await openLibraryDatabase();
  const transaction = database.transaction(COMICS_STORE, "readonly");
  const item = await requestResult(transaction.objectStore(COMICS_STORE).get(id));
  await transactionDone(transaction);
  return item || null;
}

export async function saveLibraryComic(comic) {
  const database = await openLibraryDatabase();
  const transaction = database.transaction(COMICS_STORE, "readwrite");
  transaction.objectStore(COMICS_STORE).put(comic);
  await transactionDone(transaction);
  return comic;
}

export async function removeLibraryComic(id) {
  const database = await openLibraryDatabase();
  const transaction = database.transaction([COMICS_STORE, FILES_STORE], "readwrite");
  transaction.objectStore(COMICS_STORE).delete(id);
  transaction.objectStore(FILES_STORE).delete(id);
  await transactionDone(transaction);
}

export async function saveComicFiles(comicId, files) {
  const database = await openLibraryDatabase();
  const transaction = database.transaction(FILES_STORE, "readwrite");
  transaction.objectStore(FILES_STORE).put({ comicId, files: [...files], savedAt: Date.now() });
  await transactionDone(transaction);
}

export async function getComicFiles(comicId) {
  const database = await openLibraryDatabase();
  const transaction = database.transaction(FILES_STORE, "readonly");
  const result = await requestResult(transaction.objectStore(FILES_STORE).get(comicId));
  await transactionDone(transaction);
  return result?.files || [];
}

export async function removeComicFiles(comicId) {
  const database = await openLibraryDatabase();
  const transaction = database.transaction(FILES_STORE, "readwrite");
  transaction.objectStore(FILES_STORE).delete(comicId);
  await transactionDone(transaction);
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
}

export function createComicId(prefix = "local") {
  if (crypto.randomUUID) return `${prefix}:${crypto.randomUUID()}`;
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function normalizeMatchText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(the|a|an|o|a|os|as|de|da|do|das|dos|vol|volume|edicao|issue)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseComicFilename(filename) {
  const withoutExtension = filename.replace(/\.(cbr|cbz|rar|zip|pdf|avif|bmp|gif|jpe?g|png|webp)$/i, "");
  const yearMatch = withoutExtension.match(/(?:^|[\s[(])(19\d{2}|20\d{2})(?=[\s\])]|$)/);
  const issueMatch = withoutExtension.match(/(?:#|\bn(?:[ºo°]|\.)|\bissue\s*)\s*0*(\d{1,5})/i);
  const volumeMatch = withoutExtension.match(/\b(?:vol(?:ume)?|v)\.?\s*0*(\d{1,4})/i);
  const trailingIssue = !issueMatch
    ? withoutExtension.match(/(?:^|[\s._-])0*(\d{1,4})(?=\s*(?:\([^)]*\)|\[[^\]]*\])?\s*$)/)
    : null;
  const issue = Number(issueMatch?.[1] || trailingIssue?.[1]) || null;
  const volume = Number(volumeMatch?.[1]) || null;
  const year = Number(yearMatch?.[1]) || null;
  let title = withoutExtension
    .replace(/\[[^\]]*(?:digital|webrip|empire|zone|scan|hq)[^\]]*\]/gi, " ")
    .replace(/\([^)]*(?:digital|webrip|scan|empire)[^)]*\)/gi, " ")
    .replace(/(?:#|\bn(?:[ºo°]|\.)|\bissue\s*)\s*0*\d{1,5}/gi, " ")
    .replace(/\b(?:vol(?:ume)?|v)\.?\s*0*\d{1,4}/gi, " ")
    .replace(/[([]\s*(?:19\d{2}|20\d{2})\s*[)\]]/g, " ")
    .replace(/\b(?:19\d{2}|20\d{2})\b/g, " ")
    .replace(/[._]+/g, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/^\s*[-–—]+\s*|\s*[-–—]+\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (trailingIssue) {
    title = title
      .replace(new RegExp(`(?:^|[\\s._-])0*${trailingIssue[1]}\\s*$`), "")
      .replace(/(?:\s*[-–—]+\s*)+$/g, "")
      .trim();
  }
  title ||= withoutExtension.trim();
  return {
    title,
    year,
    issue,
    volume,
    matchKey: normalizeMatchText(title),
  };
}

export function comicMatchScore(metadata, comic) {
  const incoming = new Set(normalizeMatchText(metadata.title).split(" ").filter((token) => token.length > 1));
  const stored = new Set(normalizeMatchText(comic.title).split(" ").filter((token) => token.length > 1));
  if (!incoming.size || !stored.size) return 0;
  const shared = [...incoming].filter((token) => stored.has(token)).length;
  let score = shared / Math.max(incoming.size, stored.size);
  if (metadata.year && comic.year) score += metadata.year === comic.year ? 0.16 : -0.12;
  if (metadata.issue && comic.issue) score += metadata.issue === comic.issue ? 0.2 : -0.18;
  if (metadata.volume && comic.volume) score += metadata.volume === comic.volume ? 0.08 : -0.08;
  return score;
}
