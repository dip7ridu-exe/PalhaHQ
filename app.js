import {
  comicMatchScore,
  createComicId,
  getComicFiles,
  getLibraryComic,
  listLibraryComics,
  normalizeMatchText,
  parseComicFilename,
  removeLibraryComic,
  requestPersistentStorage,
  saveComicFiles,
  saveLibraryComic,
  storageEstimate,
} from "./library.js?v=7-mobile-zoom";
import { searchComicCatalog } from "./catalog.js?v=7-mobile-zoom";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const imagePattern = /\.(avif|bmp|gif|jpe?g|png|webp)$/i;
const archivePattern = /\.(cbr|cbz|rar|zip)$/i;
const HISTORY_KEY = "balao-reader-history-v1";
const PREFS_KEY = "balao-reader-prefs-v1";
const CATALOG_KEY = "balao-reader-catalog-v1";
const isMobileLayout = () => matchMedia("(max-width: 760px), (hover: none) and (pointer: coarse) and (max-width: 1024px)").matches;

const dom = {
  homeView: $("#homeView"),
  readerView: $("#readerView"),
  libraryPanel: $("#libraryPanel"),
  discoverPanel: $("#discoverPanel"),
  libraryNavButton: $("#libraryNavButton"),
  discoverNavButton: $("#discoverNavButton"),
  dropZone: $("#dropZone"),
  openButton: $("#openButton"),
  headerImportButton: $("#headerImportButton"),
  fileInput: $("#fileInput"),
  themeButton: $("#themeButton"),
  libraryGrid: $("#libraryGrid"),
  librarySearchInput: $("#librarySearchInput"),
  libraryTotalCount: $("#libraryTotalCount"),
  libraryFileCount: $("#libraryFileCount"),
  libraryReadingCount: $("#libraryReadingCount"),
  catalogSearchForm: $("#catalogSearchForm"),
  catalogSearchInput: $("#catalogSearchInput"),
  catalogStatus: $("#catalogStatus"),
  catalogResults: $("#catalogResults"),
  googleApiKeyInput: $("#googleApiKeyInput"),
  saveCatalogSettingsButton: $("#saveCatalogSettingsButton"),
  comicDetailDialog: $("#comicDetailDialog"),
  comicDetailContent: $("#comicDetailContent"),
  closeComicDetailButton: $("#closeComicDetailButton"),
  closeReaderButton: $("#closeReaderButton"),
  bookTitle: $("#bookTitle"),
  bookMeta: $("#bookMeta"),
  readerViewport: $("#readerViewport"),
  pageStage: $("#pageStage"),
  primaryPageShell: $(".page-shell-primary"),
  pageImage: $("#pageImage"),
  secondPageShell: $("#secondPageShell"),
  secondPageImage: $("#secondPageImage"),
  scrollPages: $("#scrollPages"),
  thumbnailRail: $("#thumbnailRail"),
  thumbnailList: $("#thumbnailList"),
  thumbnailToggle: $("#thumbnailToggle"),
  previousPageZone: $("#previousPageZone"),
  nextPageZone: $("#nextPageZone"),
  footerPreviousButton: $("#footerPreviousButton"),
  footerNextButton: $("#footerNextButton"),
  pageSlider: $("#pageSlider"),
  footerCurrentPage: $("#footerCurrentPage"),
  footerTotalPages: $("#footerTotalPages"),
  mobilePageIndicator: $("#mobilePageIndicator"),
  zoomOutButton: $("#zoomOutButton"),
  zoomInButton: $("#zoomInButton"),
  zoomValueButton: $("#zoomValueButton"),
  fitButton: $("#fitButton"),
  fitLabel: $("#fitLabel"),
  rotateButton: $("#rotateButton"),
  guidedButton: $("#guidedButton"),
  guidedButtonLabel: $("#guidedButtonLabel"),
  fullscreenButton: $("#fullscreenButton"),
  settingsButton: $("#settingsButton"),
  mobilePreviousButton: $("#mobilePreviousButton"),
  mobileNextButton: $("#mobileNextButton"),
  mobileGuidedButton: $("#mobileGuidedButton"),
  mobileThumbsButton: $("#mobileThumbsButton"),
  mobileSettingsButton: $("#mobileSettingsButton"),
  mobileZoomOutButton: $("#mobileZoomOutButton"),
  mobileZoomValueButton: $("#mobileZoomValueButton"),
  mobileZoomInButton: $("#mobileZoomInButton"),
  mobileRotateButton: $("#mobileRotateButton"),
  mobileFullscreenButton: $("#mobileFullscreenButton"),
  settingsSheet: $("#settingsSheet"),
  settingsBackdrop: $("#settingsBackdrop"),
  closeSettingsButton: $("#closeSettingsButton"),
  directionLtr: $("#directionLtr"),
  directionRtl: $("#directionRtl"),
  brightnessSlider: $("#brightnessSlider"),
  brightnessOutput: $("#brightnessOutput"),
  contrastSlider: $("#contrastSlider"),
  contrastOutput: $("#contrastOutput"),
  autoHideToggle: $("#autoHideToggle"),
  guidedLayer: $("#guidedLayer"),
  guidedHotspots: $("#guidedHotspots"),
  guidedCanvas: $("#guidedCanvas"),
  guidedCounter: $("#guidedCounter"),
  guidedHelp: $("#guidedHelp"),
  closeGuidedButton: $("#closeGuidedButton"),
  guidedZoomOutButton: $("#guidedZoomOutButton"),
  guidedZoomValueButton: $("#guidedZoomValueButton"),
  guidedZoomInButton: $("#guidedZoomInButton"),
  manualRegionButton: $("#manualRegionButton"),
  manualSelection: $("#manualSelection"),
  emptyDetection: $("#emptyDetection"),
  startManualButton: $("#startManualButton"),
  loadingOverlay: $("#loadingOverlay"),
  loadingTitle: $("#loadingTitle"),
  loadingDetail: $("#loadingDetail"),
  loadingBar: $("#loadingBar"),
  toastRegion: $("#toastRegion"),
};

const defaultPrefs = {
  theme: "dark",
  viewMode: "single",
  direction: "ltr",
  fit: "page",
  brightness: 100,
  contrast: 100,
  autoHide: true,
};

const state = {
  reader: null,
  currentComic: null,
  fileKey: null,
  pageIndex: 0,
  pageCount: 0,
  viewMode: "single",
  direction: "ltr",
  fit: "page",
  zoom: 1,
  panX: 0,
  panY: 0,
  panPointerId: null,
  panStart: null,
  rotation: 0,
  brightness: 100,
  contrast: 100,
  autoHide: true,
  renderToken: 0,
  guidedActive: false,
  guidedRegions: [],
  guidedRegionIndex: -1,
  guidedCache: new Map(),
  freeZoomFactor: 2.8,
  guidedSourceImage: null,
  guidedSourcePageIndex: null,
  guidedPreviewPosition: null,
  guidedPreviewPointers: new Map(),
  guidedPreviewGesture: null,
  manualMode: false,
  manualStart: null,
  manualPointerId: null,
  currentComicId: null,
  libraryItems: [],
  libraryFilter: "all",
  libraryQuery: "",
  catalogResults: [],
  detailItem: null,
  fileTargetId: null,
  fileTargetCatalog: null,
  runtimeFiles: new Map(),
  scrollObserver: null,
  scrollFrame: null,
  thumbnailObserver: null,
  controlsTimer: null,
  pageAspect: null,
  guidedLayoutFrame: null,
  pageTurnBusy: false,
  touch: {
    startX: 0,
    startY: 0,
    startTime: 0,
    pinchDistance: 0,
    pinchZoom: 1,
    pinchPanX: 0,
    pinchPanY: 0,
    pinchCenterX: 0,
    pinchCenterY: 0,
    pinchViewportX: 0,
    pinchViewportY: 0,
    pinchScrollLeft: 0,
    pinchScrollTop: 0,
    panStartX: 0,
    panStartY: 0,
    panOriginX: 0,
    panOriginY: 0,
    isPanning: false,
    isPinching: false,
    lastTap: 0,
  },
};

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota should never block reading.
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "arquivo local";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function extensionOf(name) {
  return name.includes(".") ? name.split(".").pop().toUpperCase() : "ARQUIVO";
}

function bookName(name) {
  return name.replace(/\.(cbr|cbz|rar|zip|pdf|avif|bmp|gif|jpe?g|png|webp)$/i, "");
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function setLoading(visible, title = "Abrindo seu quadrinho…", detail = "Lendo as páginas no seu aparelho", progress = 15) {
  dom.loadingOverlay.hidden = !visible;
  dom.loadingTitle.textContent = title;
  dom.loadingDetail.textContent = detail;
  dom.loadingBar.style.width = `${Math.max(4, Math.min(100, progress))}%`;
}

function toast(message, type = "info") {
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.textContent = message;
  dom.toastRegion.append(element);
  setTimeout(() => element.remove(), 4200);
}

function loadPrefs() {
  const prefs = { ...defaultPrefs, ...readJson(PREFS_KEY, {}) };
  state.viewMode = prefs.viewMode;
  state.direction = prefs.direction;
  state.fit = prefs.fit;
  state.brightness = prefs.brightness;
  state.contrast = prefs.contrast;
  state.autoHide = prefs.autoHide;
  document.documentElement.dataset.theme = prefs.theme;
  dom.brightnessSlider.value = prefs.brightness;
  dom.contrastSlider.value = prefs.contrast;
  dom.brightnessOutput.value = `${prefs.brightness}%`;
  dom.contrastOutput.value = `${prefs.contrast}%`;
  dom.autoHideToggle.classList.toggle("active", prefs.autoHide);
  dom.autoHideToggle.setAttribute("aria-checked", String(prefs.autoHide));
}

function persistPrefs() {
  saveJson(PREFS_KEY, {
    theme: document.documentElement.dataset.theme || "dark",
    viewMode: state.viewMode,
    direction: state.direction,
    fit: state.fit,
    brightness: state.brightness,
    contrast: state.contrast,
    autoHide: state.autoHide,
  });
}

function catalogPrefs() {
  return readJson(CATALOG_KEY, { googleApiKey: "" });
}

function switchHomePanel(panelId) {
  const showLibrary = panelId !== "discoverPanel";
  dom.libraryPanel.hidden = !showLibrary;
  dom.discoverPanel.hidden = showLibrary;
  dom.libraryNavButton.classList.toggle("active", showLibrary);
  dom.discoverNavButton.classList.toggle("active", !showLibrary);
  if (!showLibrary) requestAnimationFrame(() => dom.catalogSearchInput.focus());
  scrollTo({ top: 0, behavior: "smooth" });
}

function comicSubtitle(item) {
  const parts = [];
  if (item.volume) parts.push(`Vol. ${item.volume}`);
  if (item.issue) parts.push(`#${String(item.issue).padStart(2, "0")}`);
  if (item.year) parts.push(String(item.year));
  if (!parts.length && item.publisher) parts.push(item.publisher);
  return parts.join(" · ") || "Edição não informada";
}

function comicHasReadableFile(item) {
  return Boolean(item.hasStoredFile || state.runtimeFiles.has(item.id));
}

function createComicCover(item, className = "comic-card-cover") {
  const cover = document.createElement("div");
  cover.className = className;
  if (item.cover) {
    const image = document.createElement("img");
    image.src = item.cover;
    image.alt = `Capa de ${item.title}`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      image.remove();
      cover.classList.add("cover-missing");
    }, { once: true });
    cover.append(image);
  } else {
    cover.classList.add("cover-missing");
  }
  const fallback = document.createElement("span");
  fallback.setAttribute("aria-hidden", "true");
  fallback.innerHTML = `<svg viewBox="0 0 32 32"><path d="M6 4h15a5 5 0 0 1 5 5v19H10a4 4 0 0 1-4-4z"/><path d="M10 28a4 4 0 0 1 0-8h16M11 10h9M11 14h6"/></svg>`;
  cover.append(fallback);
  return cover;
}

function libraryCard(item) {
  const article = document.createElement("article");
  article.className = "comic-card library-comic-card";
  article.dataset.comicId = item.id;
  article.tabIndex = 0;

  const cover = createComicCover(item);
  const progress = item.pages ? Math.round(((item.page || 0) / Math.max(1, item.pages - 1)) * 100) : 0;
  const badge = document.createElement("span");
  badge.className = `comic-file-badge ${comicHasReadableFile(item) ? "ready" : "wanted"}`;
  badge.textContent = comicHasReadableFile(item) ? "Pronta para ler" : "Arquivo necessário";
  cover.append(badge);
  if (progress > 0 && comicHasReadableFile(item)) {
    const progressBar = document.createElement("span");
    progressBar.className = "cover-progress";
    progressBar.innerHTML = `<span style="width:${progress}%"></span>`;
    cover.append(progressBar);
  }

  const body = document.createElement("div");
  body.className = "comic-card-body";
  const title = document.createElement("h2");
  title.textContent = item.title;
  const meta = document.createElement("p");
  meta.textContent = comicSubtitle(item);
  const secondary = document.createElement("small");
  secondary.textContent = item.authors?.length ? item.authors.slice(0, 2).join(", ") : item.format || item.publisher || "HQ";
  const actions = document.createElement("div");
  actions.className = "comic-card-actions";
  const primary = document.createElement("button");
  primary.type = "button";
  primary.className = "comic-card-primary";
  primary.textContent = comicHasReadableFile(item) ? (progress > 0 ? "Continuar" : "Ler agora") : "Vincular arquivo";
  primary.addEventListener("click", (event) => {
    event.stopPropagation();
    if (comicHasReadableFile(item)) openLibraryComic(item.id);
    else chooseFilesFor(item.id);
  });
  const details = document.createElement("button");
  details.type = "button";
  details.className = "comic-card-menu";
  details.setAttribute("aria-label", `Ver detalhes de ${item.title}`);
  details.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>`;
  details.addEventListener("click", (event) => { event.stopPropagation(); openComicDetails(item, "library"); });
  actions.append(primary, details);
  body.append(title, meta, secondary, actions);
  article.append(cover, body);

  article.addEventListener("click", () => openComicDetails(item, "library"));
  article.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openComicDetails(item, "library");
    }
  });
  bindFileDrop(article, { targetComicId: item.id });
  return article;
}

function emptyLibraryCard() {
  const empty = document.createElement("div");
  empty.className = "library-empty";
  empty.innerHTML = `
    <span aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 5h14a5 5 0 0 1 5 5v17H10a4 4 0 0 1-4-4z"/><path d="M10 27a4 4 0 0 1 0-8h15M12 11h7"/></svg></span>
    <div><strong>Sua biblioteca está esperando a primeira HQ</strong><p>Importe um arquivo que você já possui ou vá em Descobrir para salvar algo que quer ler.</p></div>`;
  const actions = document.createElement("div");
  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.className = "primary-button compact";
  importButton.textContent = "Importar HQ";
  importButton.addEventListener("click", () => chooseFilesFor());
  const discoverButton = document.createElement("button");
  discoverButton.type = "button";
  discoverButton.className = "secondary-button compact";
  discoverButton.textContent = "Explorar catálogo";
  discoverButton.addEventListener("click", () => switchHomePanel("discoverPanel"));
  actions.append(importButton, discoverButton);
  empty.append(actions);
  return empty;
}

function renderLibrary() {
  const query = normalizeMatchText(state.libraryQuery);
  const visible = state.libraryItems.filter((item) => {
    if (state.libraryFilter === "owned" && !comicHasReadableFile(item)) return false;
    if (state.libraryFilter === "wishlist" && comicHasReadableFile(item)) return false;
    if (query && !normalizeMatchText(`${item.title} ${item.authors?.join(" ") || ""} ${item.publisher || ""}`).includes(query)) return false;
    return true;
  });
  dom.libraryGrid.replaceChildren();
  if (!visible.length) dom.libraryGrid.append(emptyLibraryCard());
  else visible.forEach((item) => dom.libraryGrid.append(libraryCard(item)));

  dom.libraryTotalCount.textContent = String(state.libraryItems.length);
  dom.libraryFileCount.textContent = String(state.libraryItems.filter(comicHasReadableFile).length);
  dom.libraryReadingCount.textContent = String(state.libraryItems.filter((item) => comicHasReadableFile(item) && (item.page || 0) > 0 && (item.page || 0) < (item.pages || 1) - 1).length);
}

async function refreshLibrary() {
  try {
    state.libraryItems = await listLibraryComics();
    renderLibrary();
  } catch (error) {
    console.error(error);
    dom.libraryGrid.replaceChildren(emptyLibraryCard());
    toast("Não foi possível abrir a biblioteca local neste navegador.", "error");
  }
}

async function updateHistory() {
  if (!state.reader || !state.currentComicId) return;
  const comicId = state.currentComicId;
  const page = state.pageIndex;
  const pages = state.pageCount;
  const comic = await getLibraryComic(comicId);
  if (!comic) return;
  comic.page = page;
  comic.pages = pages;
  comic.updatedAt = Date.now();
  comic.lastReadAt = Date.now();
  await saveLibraryComic(comic);
  const local = state.libraryItems.find((item) => item.id === comic.id);
  if (local) Object.assign(local, comic);
}

async function migrateLegacyHistory() {
  if (localStorage.getItem("balao-reader-library-migrated-v1")) return;
  const legacy = readJson(HISTORY_KEY, []);
  if (Array.isArray(legacy)) {
    for (const item of legacy) {
      const parsed = parseComicFilename(item.name || "Quadrinho");
      await saveLibraryComic({
        id: createComicId("legacy"),
        title: parsed.title,
        matchKey: parsed.matchKey,
        volume: parsed.volume,
        issue: parsed.issue,
        year: parsed.year,
        cover: "",
        format: item.format,
        fileName: item.name,
        size: item.size,
        page: item.page || 0,
        pages: item.pages || 0,
        status: "wishlist",
        hasStoredFile: false,
        addedAt: item.updatedAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
      });
    }
  }
  localStorage.setItem("balao-reader-library-migrated-v1", "1");
}

function createPageCache(loader, disposer) {
  const cache = new Map();
  const pending = new Map();
  const limit = 16;

  async function getPage(index) {
    if (cache.has(index)) {
      const value = cache.get(index);
      cache.delete(index);
      cache.set(index, value);
      return value;
    }
    if (pending.has(index)) return pending.get(index);
    const promise = loader(index).then((value) => {
      pending.delete(index);
      cache.set(index, value);
      while (cache.size > limit) {
        const [oldIndex, oldValue] = cache.entries().next().value;
        cache.delete(oldIndex);
        if (oldIndex !== state.pageIndex && oldIndex !== state.pageIndex + 1) disposer?.(oldValue);
      }
      return value;
    }).catch((error) => {
      pending.delete(index);
      throw error;
    });
    pending.set(index, promise);
    return promise;
  }

  function dispose() {
    cache.forEach((value) => disposer?.(value));
    cache.clear();
    pending.clear();
  }

  return { getPage, dispose };
}

async function createArchiveReader(file) {
  if (!window.LocalUnarchiver) throw new Error("O módulo de arquivos compactados não foi carregado.");
  setLoading(true, "Abrindo o arquivo…", "Verificando o pacote de páginas", 24);
  const archive = await window.LocalUnarchiver.open(file);
  const entries = archive.entries
    .filter((entry) => entry.is_file && imagePattern.test(entry.name) && !/(^|\/)__MACOSX\//i.test(entry.name))
    .sort((a, b) => naturalCompare(a.name, b.name));
  if (!entries.length) {
    window.LocalUnarchiver.close(archive);
    throw new Error("Não encontrei imagens compatíveis dentro desse arquivo.");
  }
  if (entries.length > 2000) {
    window.LocalUnarchiver.close(archive);
    throw new Error("O arquivo tem mais de 2.000 páginas e foi bloqueado para proteger a memória do aparelho.");
  }

  const cache = createPageCache(async (index) => {
    const pageFile = await entries[index].read();
    return URL.createObjectURL(pageFile);
  }, (url) => URL.revokeObjectURL(url));

  return {
    name: file.name,
    format: extensionOf(file.name),
    size: file.size,
    pageCount: entries.length,
    getPage: cache.getPage,
    dispose() {
      cache.dispose();
      window.LocalUnarchiver.close(archive);
    },
  };
}

async function createPdfReader(file) {
  setLoading(true, "Preparando o PDF…", "Carregando o renderizador de páginas", 24);
  const pdfjs = await import("./vendor/pdfjs/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.mjs", import.meta.url).href;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data: bytes });
  let passwordRequested = false;
  task.onPassword = () => {
    passwordRequested = true;
    task.destroy();
  };
  let documentProxy;
  try {
    documentProxy = await task.promise;
  } catch (error) {
    if (passwordRequested) throw new Error("Este PDF é protegido por senha e não pode ser aberto nesta versão.");
    throw error;
  }
  if (!documentProxy.numPages) throw new Error("O PDF não contém páginas legíveis.");

  const cache = createPageCache(async (index) => {
    const page = await documentProxy.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    const mobile = matchMedia("(max-width: 760px)").matches;
    const targetWidth = mobile ? 1500 : 2200;
    const scale = Math.min(2.6, Math.max(1.2, targetWidth / base.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    await page.render({ canvasContext: context, viewport }).promise;
    page.cleanup();
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Falha ao renderizar a página.")), "image/webp", 0.94));
    canvas.width = 1;
    canvas.height = 1;
    return URL.createObjectURL(blob);
  }, (url) => URL.revokeObjectURL(url));

  return {
    name: file.name,
    format: "PDF",
    size: file.size,
    pageCount: documentProxy.numPages,
    getPage: cache.getPage,
    dispose() {
      cache.dispose();
      task.destroy();
    },
  };
}

function createImageReader(files) {
  const pages = [...files].filter((file) => file.type.startsWith("image/") || imagePattern.test(file.name));
  pages.sort((a, b) => naturalCompare(a.name, b.name));
  if (!pages.length) throw new Error("Nenhuma imagem compatível foi escolhida.");
  const cache = createPageCache(async (index) => URL.createObjectURL(pages[index]), (url) => URL.revokeObjectURL(url));
  const first = pages[0];
  return {
    name: pages.length === 1 ? first.name : `Seleção com ${pages.length} imagens`,
    format: pages.length === 1 ? extensionOf(first.name) : "IMAGENS",
    size: pages.reduce((sum, file) => sum + file.size, 0),
    pageCount: pages.length,
    getPage: cache.getPage,
    dispose: cache.dispose,
  };
}

async function createReaderFromFiles(files) {
  const first = files[0];
  const allImages = files.every((file) => file.type.startsWith("image/") || imagePattern.test(file.name));
  if (allImages) return createImageReader(files);
  if (/\.pdf$/i.test(first.name) || first.type === "application/pdf") return createPdfReader(first);
  if (archivePattern.test(first.name)) return createArchiveReader(first);
  throw new Error("Formato não reconhecido. Use CBR, CBZ, ZIP, PDF, JPG, PNG, WEBP ou AVIF.");
}

async function coverFromReader(reader) {
  const url = await reader.getPage(0);
  const image = new Image();
  image.src = url;
  await new Promise((resolve, reject) => {
    if (image.complete && image.naturalWidth) return resolve();
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error("Não foi possível criar a capa.")), { once: true });
  });
  const scale = Math.min(1, 440 / image.naturalWidth, 680 / image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const cover = canvas.toDataURL("image/webp", 0.84);
  canvas.width = 1;
  canvas.height = 1;
  return cover;
}

function catalogRecord(item) {
  return {
    id: item.id,
    source: item.source,
    sourceId: item.sourceId,
    title: item.title,
    subtitle: item.subtitle || "",
    matchKey: normalizeMatchText(item.title),
    authors: item.authors || [],
    publisher: item.publisher || "",
    publishedDate: item.publishedDate || "",
    year: item.year || null,
    description: item.description || "",
    cover: item.cover || "",
    categories: item.categories || [],
    pageCount: item.pageCount || null,
    isbn: item.isbn || "",
    infoLink: item.infoLink || "",
    issue: item.issue || null,
    volume: item.volume || null,
    status: "wishlist",
    hasStoredFile: false,
    page: 0,
    pages: 0,
    addedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function chooseFilesFor(targetComicId = null, catalogItem = null) {
  state.fileTargetId = targetComicId;
  state.fileTargetCatalog = catalogItem;
  dom.fileInput.multiple = true;
  dom.fileInput.click();
}

function bindFileDrop(element, options = {}) {
  element.addEventListener("dragenter", (event) => {
    event.preventDefault();
    event.stopPropagation();
    element.classList.add("file-dragging");
  });
  element.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  element.addEventListener("dragleave", (event) => {
    event.stopPropagation();
    if (!element.contains(event.relatedTarget)) element.classList.remove("file-dragging");
  });
  element.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    element.classList.remove("file-dragging");
    importFiles(event.dataTransfer.files, options);
  });
}

function bestLibraryMatch(metadata) {
  return state.libraryItems
    .map((item) => ({ item, score: comicMatchScore(metadata, item) }))
    .sort((a, b) => b.score - a.score)[0];
}

async function importFiles(fileList, options = {}) {
  const files = [...fileList].filter(Boolean);
  if (!files.length) return;
  const first = files[0];
  let reader;
  setLoading(true, "Adicionando à biblioteca…", "Identificando a HQ e preparando a capa", 18);

  try {
    reader = await createReaderFromFiles(files);
    const metadata = parseComicFilename(first.name);
    let target = options.targetComicId ? await getLibraryComic(options.targetComicId) : null;
    if (!target && options.catalogItem) target = catalogRecord(options.catalogItem);
    if (!target) {
      const match = bestLibraryMatch(metadata);
      if (match?.score >= 0.78) target = match.item;
    }
    let cover = target?.cover || "";
    try {
      setLoading(true, "Criando a capa…", `Encontrei ${reader.pageCount} ${reader.pageCount === 1 ? "página" : "páginas"}`, 48);
      cover = await coverFromReader(reader);
    } catch {
      // A ficha continua útil mesmo se uma capa muito incomum não puder ser convertida.
    }

    const id = target?.id || createComicId("local");
    const now = Date.now();
    const record = {
      ...(target || {}),
      id,
      title: target?.title || metadata.title,
      matchKey: target?.matchKey || metadata.matchKey,
      volume: target?.volume || metadata.volume,
      issue: target?.issue || metadata.issue,
      year: target?.year || metadata.year,
      cover,
      fileName: files.length > 1 ? `${files.length} imagens` : first.name,
      format: reader.format,
      size: files.reduce((sum, file) => sum + file.size, 0),
      pages: reader.pageCount,
      page: Math.min(target?.page || 0, Math.max(0, reader.pageCount - 1)),
      status: "owned",
      addedAt: target?.addedAt || now,
      updatedAt: now,
      hasStoredFile: false,
    };

    setLoading(true, "Guardando no aparelho…", "A HQ continua privada e não é enviada", 72);
    await requestPersistentStorage();
    let stored = false;
    try {
      const estimate = await storageEstimate();
      const required = record.size * 1.08;
      const available = estimate?.quota && Number.isFinite(estimate.usage) ? estimate.quota - estimate.usage : Infinity;
      if (required > available * 0.92) throw new DOMException("Espaço local insuficiente", "QuotaExceededError");
      await saveComicFiles(id, files);
      stored = true;
    } catch (error) {
      console.warn("Arquivo disponível apenas nesta sessão:", error);
      state.runtimeFiles.set(id, files);
    }
    record.hasStoredFile = stored;
    await saveLibraryComic(record);
    reader.dispose?.();
    reader = null;
    await refreshLibrary();
    switchHomePanel("libraryPanel");
    dom.comicDetailDialog.open && dom.comicDetailDialog.close();
    setLoading(false);
    toast(stored
      ? `${record.title} foi adicionada à biblioteca.`
      : `${record.title} foi adicionada. O arquivo ficará disponível até esta aba ser fechada.`, stored ? "success" : "info");
  } catch (error) {
    console.error(error);
    reader?.dispose?.();
    setLoading(false);
    const detail = error?.message || "Não foi possível abrir esse arquivo.";
    toast(detail, "error");
  } finally {
    dom.fileInput.value = "";
    dom.fileInput.multiple = true;
    state.fileTargetId = null;
    state.fileTargetCatalog = null;
  }
}

async function startReaderWithFiles(files, comic) {
  let reader;
  setLoading(true, "Abrindo sua HQ…", "Carregando o arquivo guardado neste aparelho", 20);
  try {
    state.reader?.dispose?.();
    state.guidedCache.clear();
    reader = await createReaderFromFiles(files);
    state.reader = reader;
    state.currentComicId = comic.id;
    state.currentComic = comic;
    state.fileKey = comic.id;
    state.pageCount = reader.pageCount;
    state.pageIndex = Math.min(comic.page || 0, reader.pageCount - 1);
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.rotation = 0;
    state.pageAspect = null;
    await showReader();
    setLoading(false);
  } catch (error) {
    console.error(error);
    reader?.dispose?.();
    setLoading(false);
    toast(error?.message || "Não foi possível abrir esta HQ.", "error");
  }
}

async function openLibraryComic(id) {
  const comic = await getLibraryComic(id);
  if (!comic) return;
  let files = state.runtimeFiles.get(id) || [];
  if (!files.length && comic.hasStoredFile) files = await getComicFiles(id);
  if (!files.length) {
    comic.hasStoredFile = false;
    await saveLibraryComic(comic);
    await refreshLibrary();
    toast("Vincule o arquivo desta HQ para começar a leitura.");
    chooseFilesFor(id);
    return;
  }
  await startReaderWithFiles(files, comic);
}

async function showReader() {
  document.body.classList.add("reader-open");
  dom.homeView.hidden = true;
  dom.readerView.hidden = false;
  dom.bookTitle.textContent = state.currentComic?.title || bookName(state.reader.name);
  dom.bookMeta.textContent = `${comicSubtitle(state.currentComic || {})} · ${state.reader.format} · ${formatBytes(state.reader.size)}`;
  dom.pageSlider.max = String(state.pageCount);
  dom.footerTotalPages.textContent = String(state.pageCount);
  buildThumbnails();
  applyPreferencesToUi();
  await setViewMode(state.viewMode, false);
  await setPage(state.pageIndex, { save: false });
  await updateHistory();
  resetControlsTimer();
}

async function closeReader() {
  closeGuidedMode();
  closeSettings();
  await updateHistory();
  state.reader?.dispose?.();
  state.reader = null;
  state.currentComic = null;
  state.currentComicId = null;
  state.fileKey = null;
  state.pageCount = 0;
  state.guidedCache.clear();
  state.scrollObserver?.disconnect();
  cancelAnimationFrame(state.scrollFrame);
  state.thumbnailObserver?.disconnect();
  document.body.classList.remove("reader-open");
  dom.readerView.hidden = true;
  dom.homeView.hidden = false;
  await refreshLibrary();
}

function imageLoaded(image) {
  if (image.complete && image.naturalWidth) return Promise.resolve();
  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error("Não foi possível mostrar esta página.")), { once: true });
  });
}

async function renderPagedView() {
  if (!state.reader) return;
  const token = ++state.renderToken;
  dom.pageStage.hidden = false;
  dom.scrollPages.hidden = true;
  const firstUrl = await state.reader.getPage(state.pageIndex);
  if (token !== state.renderToken) return;
  dom.pageImage.src = firstUrl;
  await imageLoaded(dom.pageImage);
  if (token !== state.renderToken) return;
  state.pageAspect = dom.pageImage.naturalWidth / dom.pageImage.naturalHeight;

  const showSecond = state.viewMode === "double" && state.pageIndex + 1 < state.pageCount;
  dom.secondPageShell.hidden = !showSecond;
  dom.pageStage.classList.toggle("double-mode", showSecond);
  if (showSecond) {
    const secondUrl = await state.reader.getPage(state.pageIndex + 1);
    if (token !== state.renderToken) return;
    dom.secondPageImage.src = secondUrl;
    await imageLoaded(dom.secondPageImage);
  } else {
    dom.secondPageImage.removeAttribute("src");
  }

  applyPageVisuals();
  preloadAround(state.pageIndex);
}

async function ensurePageAspect() {
  if (state.pageAspect || !state.reader) return;
  const url = await state.reader.getPage(state.pageIndex);
  const probe = new Image();
  probe.decoding = "async";
  probe.src = url;
  await imageLoaded(probe);
  state.pageAspect = probe.naturalWidth / probe.naturalHeight;
}

function loadScrollPage(shell) {
  const image = $("img", shell);
  const index = Number(shell.dataset.index);
  if (image.dataset.loading === "true" || image.dataset.loaded === "true") return;
  image.dataset.loading = "true";
  state.reader.getPage(index).then((url) => {
    if (!shell.isConnected || state.viewMode !== "scroll") return;
    image.src = url;
    image.dataset.loaded = "true";
  }).catch(() => {
    image.removeAttribute("src");
  }).finally(() => {
    image.dataset.loading = "false";
  });
}

function unloadDistantScrollPage(shell) {
  const index = Number(shell.dataset.index);
  if (Math.abs(index - state.pageIndex) <= 4) return;
  const image = $("img", shell);
  if (state.guidedActive && image === state.guidedSourceImage) return;
  image.removeAttribute("src");
  delete image.dataset.loaded;
}

function updateScrollPosition() {
  state.scrollFrame = null;
  if (state.viewMode !== "scroll" || !state.reader) return;
  const viewportRect = dom.readerViewport.getBoundingClientRect();
  const readingLine = viewportRect.top + viewportRect.height * 0.42;
  let closest = null;
  let closestDistance = Infinity;

  for (const shell of $$(".scroll-page-shell", dom.scrollPages)) {
    const rect = shell.getBoundingClientRect();
    const containsLine = rect.top <= readingLine && rect.bottom >= readingLine;
    const distance = containsLine ? 0 : Math.min(Math.abs(rect.top - readingLine), Math.abs(rect.bottom - readingLine));
    if (distance < closestDistance) {
      closest = shell;
      closestDistance = distance;
      if (containsLine) break;
    }
  }

  if (!closest) return;
  const index = Number(closest.dataset.index);
  if (index === state.pageIndex) return;
  state.pageIndex = index;
  updatePageControls();
  scheduleHistorySave();
}

function scheduleScrollPositionUpdate() {
  if (state.scrollFrame || state.viewMode !== "scroll") return;
  state.scrollFrame = requestAnimationFrame(updateScrollPosition);
}

function scrollToPageShell(index, behavior = "auto") {
  const target = $(`.scroll-page-shell[data-index="${index}"]`, dom.scrollPages);
  if (!target) return;
  const viewportRect = dom.readerViewport.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const top = dom.readerViewport.scrollTop + targetRect.top - viewportRect.top;
  dom.readerViewport.scrollTo({ left: 0, top: Math.max(0, top), behavior });
}

function buildScrollView() {
  state.scrollObserver?.disconnect();
  dom.scrollPages.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < state.pageCount; index += 1) {
    const shell = document.createElement("div");
    shell.className = "scroll-page-shell";
    shell.dataset.index = String(index);
    shell.style.setProperty("--page-aspect", state.pageAspect || 2 / 3);
    const image = document.createElement("img");
    image.alt = `Página ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";
    shell.append(image);
    fragment.append(shell);
  }
  dom.scrollPages.append(fragment);

  state.scrollObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) loadScrollPage(entry.target);
      else unloadDistantScrollPage(entry.target);
    }
  }, { root: dom.readerViewport, rootMargin: "160% 0px", threshold: 0.01 });
  $$(".scroll-page-shell", dom.scrollPages).forEach((shell) => state.scrollObserver.observe(shell));
}

async function renderScrollView() {
  dom.pageStage.hidden = true;
  dom.scrollPages.hidden = false;
  await ensurePageAspect();
  if (!dom.scrollPages.childElementCount) buildScrollView();
  [state.pageIndex - 1, state.pageIndex, state.pageIndex + 1]
    .filter((index) => index >= 0 && index < state.pageCount)
    .forEach((index) => {
      const shell = $(`.scroll-page-shell[data-index="${index}"]`, dom.scrollPages);
      if (shell) loadScrollPage(shell);
    });
  requestAnimationFrame(() => {
    scrollToPageShell(state.pageIndex);
    scheduleScrollPositionUpdate();
  });
}

async function setPage(index, options = {}) {
  if (!state.reader) return;
  if (state.guidedActive || state.manualMode) closeGuidedMode();
  const step = state.viewMode === "double" ? 2 : 1;
  state.pageIndex = Math.max(0, Math.min(state.pageCount - 1, Number(index) || 0));
  if (state.viewMode === "double") state.pageIndex = Math.floor(state.pageIndex / step) * step;
  closeGuidedMode();
  if (state.viewMode === "scroll") {
    if (!dom.scrollPages.childElementCount) await renderScrollView();
    scrollToPageShell(state.pageIndex, options.smooth ? "smooth" : "auto");
  } else {
    resetPagePan();
    await renderPagedView();
    dom.readerViewport.scrollTo({ left: 0, top: 0 });
  }
  updatePageControls();
  if (options.save !== false) scheduleHistorySave();
}

function waitForAnimation(element, timeout = 620) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      element.removeEventListener("animationend", finish);
      resolve();
    };
    element.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, timeout);
  });
}

async function playDoublePageTurn(direction) {
  if (state.viewMode !== "double" || matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const forward = direction === "next";
  const rtl = state.direction === "rtl";
  const leaf = forward ? dom.secondPageShell : dom.primaryPageShell;
  if (!leaf || leaf.hidden) return false;
  const baseAngle = forward ? -168 : 168;
  const angle = rtl ? -baseAngle : baseAngle;
  const origin = forward
    ? (rtl ? "right center" : "left center")
    : (rtl ? "left center" : "right center");
  leaf.style.setProperty("--page-turn-angle", `${angle}deg`);
  leaf.style.setProperty("--page-turn-origin", origin);
  dom.pageStage.classList.add("page-turning");
  leaf.classList.add("page-turn-leaf");
  await waitForAnimation(leaf);
  leaf.classList.remove("page-turn-leaf");
  dom.pageStage.classList.remove("page-turning");
  leaf.style.removeProperty("--page-turn-angle");
  leaf.style.removeProperty("--page-turn-origin");
  return true;
}

async function playSpreadArrival(direction) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const className = direction === "next" ? "page-turn-arrive-next" : "page-turn-arrive-previous";
  dom.pageStage.classList.remove("page-turn-arrive-next", "page-turn-arrive-previous");
  void dom.pageStage.offsetWidth;
  dom.pageStage.classList.add(className);
  await waitForAnimation(dom.pageStage, 360);
  dom.pageStage.classList.remove(className);
}

async function nextPage() {
  if (state.pageTurnBusy) return;
  const amount = state.viewMode === "double" ? 2 : 1;
  if (state.pageIndex >= state.pageCount - 1) {
    toast("Você chegou ao fim desta leitura.");
    return;
  }
  state.pageTurnBusy = true;
  try {
    if (state.guidedActive || state.manualMode) closeGuidedMode();
    const animated = await playDoublePageTurn("next");
    await setPage(state.pageIndex + amount, { smooth: state.viewMode === "scroll" });
    if (animated) await playSpreadArrival("next");
  } finally {
    state.pageTurnBusy = false;
  }
}

async function previousPage() {
  if (state.pageTurnBusy) return;
  const amount = state.viewMode === "double" ? 2 : 1;
  if (state.pageIndex <= 0) return;
  state.pageTurnBusy = true;
  try {
    if (state.guidedActive || state.manualMode) closeGuidedMode();
    const animated = await playDoublePageTurn("previous");
    await setPage(state.pageIndex - amount, { smooth: state.viewMode === "scroll" });
    if (animated) await playSpreadArrival("previous");
  } finally {
    state.pageTurnBusy = false;
  }
}

function updatePageControls() {
  const current = state.pageIndex + 1;
  dom.pageSlider.value = String(current);
  dom.footerCurrentPage.textContent = String(current);
  dom.mobilePageIndicator.textContent = `${current} / ${state.pageCount}`;
  const max = Math.max(1, state.pageCount - 1);
  const value = state.pageCount <= 1 ? 0 : (state.pageIndex / max) * 100;
  dom.pageSlider.style.setProperty("--range-value", `${value}%`);
  $$(".thumbnail-button", dom.thumbnailList).forEach((button) => {
    const active = Number(button.dataset.index) === state.pageIndex;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

let historyTimer;
function scheduleHistorySave() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(() => updateHistory().catch((error) => console.warn("Não foi possível salvar o progresso:", error)), 450);
}

function preloadAround(index) {
  [index - 1, index + 1, index + 2]
    .filter((page) => page >= 0 && page < state.pageCount)
    .forEach((page) => state.reader.getPage(page).catch(() => {}));
}

function buildThumbnails() {
  state.thumbnailObserver?.disconnect();
  dom.thumbnailList.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < state.pageCount; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumbnail-button";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `Ir para a página ${index + 1}`);
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    const number = document.createElement("span");
    number.textContent = String(index + 1);
    button.append(image, number);
    button.addEventListener("click", () => {
      setPage(index);
      dom.thumbnailRail.classList.remove("mobile-open");
    });
    fragment.append(button);
  }
  dom.thumbnailList.append(fragment);
  state.thumbnailObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const button = entry.target;
      const image = $("img", button);
      if (!image.src) state.reader.getPage(Number(button.dataset.index)).then((url) => { image.src = url; }).catch(() => {});
    }
  }, { root: dom.thumbnailList, rootMargin: "220px 0px" });
  $$(".thumbnail-button", dom.thumbnailList).forEach((button) => state.thumbnailObserver.observe(button));
}

async function setViewMode(mode, rerender = true) {
  if (!['single', 'double', 'scroll'].includes(mode)) return;
  if (state.guidedActive) closeGuidedMode();
  state.viewMode = mode;
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  dom.scrollPages.style.width = "100%";
  dom.readerViewport.classList.remove("is-zoomed", "is-panning");
  state.scrollObserver?.disconnect();
  dom.scrollPages.replaceChildren();
  dom.readerViewport.classList.toggle("scroll-mode", mode === "scroll");
  dom.pageStage.classList.toggle("manga-order", state.direction === "rtl");
  $$('[data-view-mode]').forEach((button) => button.classList.toggle("active", button.dataset.viewMode === mode));
  persistPrefs();
  if (rerender && state.reader) {
    if (mode === "scroll") await renderScrollView();
    else await renderPagedView();
    updatePageControls();
  }
}

function setDirection(direction) {
  state.direction = direction;
  dom.directionLtr.classList.toggle("active", direction === "ltr");
  dom.directionRtl.classList.toggle("active", direction === "rtl");
  dom.pageStage.classList.toggle("manga-order", direction === "rtl");
  state.guidedCache.clear();
  persistPrefs();
}

function setFit(fit) {
  if (!["page", "width", "original"].includes(fit)) return;
  state.fit = fit;
  dom.pageStage.classList.remove("fit-page", "fit-width", "fit-original");
  dom.pageStage.classList.add(`fit-${fit}`);
  $$('[data-fit]').forEach((button) => button.classList.toggle("active", button.dataset.fit === fit));
  dom.fitLabel.textContent = fit === "page" ? "Ajustar" : fit === "width" ? "Largura" : "Original";
  persistPrefs();
  requestAnimationFrame(clampPagePan);
  queueGuidedLayout();
}

function cycleFit() {
  const order = ["page", "width", "original"];
  setFit(order[(order.indexOf(state.fit) + 1) % order.length]);
}

function pagePanLimits(zoom = state.zoom) {
  if (state.viewMode === "scroll" || zoom <= 1.001 || !dom.pageImage.offsetWidth) return { x: 0, y: 0 };
  const images = [dom.pageImage];
  if (state.viewMode === "double" && !dom.secondPageShell.hidden) images.push(dom.secondPageImage);
  const quarterTurn = Math.abs(state.rotation % 180) === 90;
  const gap = images.length > 1 ? 12 : 0;
  const baseWidth = images.reduce((total, image) => total + (quarterTurn ? image.offsetHeight : image.offsetWidth), 0) + gap;
  const baseHeight = Math.max(...images.map((image) => quarterTurn ? image.offsetWidth : image.offsetHeight));
  const viewportWidth = dom.readerViewport.clientWidth;
  const viewportHeight = dom.readerViewport.clientHeight;
  return {
    x: Math.max(0, (baseWidth * zoom - viewportWidth) / 2 + 18),
    y: Math.max(0, (baseHeight * zoom - viewportHeight) / 2 + 18),
  };
}

function applyPagePan(x = state.panX, y = state.panY, options = {}) {
  const limits = pagePanLimits(options.zoom ?? state.zoom);
  state.panX = Math.max(-limits.x, Math.min(limits.x, Number.isFinite(x) ? x : 0));
  state.panY = Math.max(-limits.y, Math.min(limits.y, Number.isFinite(y) ? y : 0));
  dom.pageStage.style.setProperty("--pan-x", `${state.panX}px`);
  dom.pageStage.style.setProperty("--pan-y", `${state.panY}px`);
}

function clampPagePan() {
  applyPagePan(state.panX, state.panY);
  queueGuidedLayout();
}

function resetPagePan() {
  state.panX = 0;
  state.panY = 0;
  state.panPointerId = null;
  state.panStart = null;
  state.touch.isPanning = false;
  state.touch.isPinching = false;
  dom.readerViewport.classList.remove("is-panning");
  applyPagePan(0, 0);
}

function setZoom(value, options = {}) {
  const previousZoom = state.zoom;
  const minimumZoom = state.viewMode === "scroll" ? 1 : 0.5;
  const maximumZoom = state.viewMode === "scroll" ? 4 : 5;
  state.zoom = Math.max(minimumZoom, Math.min(maximumZoom, Math.round(value * 100) / 100));
  dom.pageStage.style.setProperty("--zoom", state.zoom);
  dom.scrollPages.style.width = `${state.zoom * 100}%`;
  dom.zoomValueButton.textContent = `${Math.round(state.zoom * 100)}%`;
  dom.mobileZoomValueButton.textContent = `${Math.round(state.zoom * 100)}%`;
  dom.readerViewport.classList.toggle("is-zoomed", state.zoom > 1.01 && state.viewMode !== "scroll");

  if (state.viewMode === "scroll") {
    state.panX = 0;
    state.panY = 0;
    queueGuidedLayout();
    return;
  }

  if (state.zoom <= 1.01) {
    state.panX = 0;
    state.panY = 0;
  } else if (options.anchor && previousZoom > 0) {
    const ratio = state.zoom / previousZoom;
    state.panX = options.anchor.x - (options.anchor.x - state.panX) * ratio;
    state.panY = options.anchor.y - (options.anchor.y - state.panY) * ratio;
  }

  applyPagePan(state.panX, state.panY);
  if (!options.immediate) requestAnimationFrame(clampPagePan);
  queueGuidedLayout();
}

function applyPageVisuals() {
  dom.pageStage.style.setProperty("--zoom", state.zoom);
  dom.pageStage.style.setProperty("--pan-x", `${state.panX}px`);
  dom.pageStage.style.setProperty("--pan-y", `${state.panY}px`);
  dom.pageStage.style.setProperty("--rotation", `${state.rotation}deg`);
  dom.pageStage.style.setProperty("--brightness", state.brightness / 100);
  dom.pageStage.style.setProperty("--contrast", state.contrast / 100);
  dom.scrollPages.style.setProperty("--brightness", state.brightness / 100);
  dom.scrollPages.style.setProperty("--contrast", state.contrast / 100);
  dom.scrollPages.style.width = `${state.viewMode === "scroll" ? state.zoom * 100 : 100}%`;
  dom.zoomValueButton.textContent = `${Math.round(state.zoom * 100)}%`;
  dom.mobileZoomValueButton.textContent = `${Math.round(state.zoom * 100)}%`;
  dom.readerViewport.classList.toggle("is-zoomed", state.zoom > 1.01 && state.viewMode !== "scroll");
  requestAnimationFrame(clampPagePan);
  queueGuidedLayout();
}

function applyPreferencesToUi() {
  setFit(state.fit);
  setDirection(state.direction);
  $$('[data-view-mode]').forEach((button) => button.classList.toggle("active", button.dataset.viewMode === state.viewMode));
  applyPageVisuals();
}

function rotatePage() {
  state.rotation = (state.rotation + 90) % 360;
  resetPagePan();
  applyPageVisuals();
}

function openSettings() {
  dom.settingsBackdrop.hidden = false;
  dom.settingsSheet.hidden = false;
}

function closeSettings() {
  dom.settingsBackdrop.hidden = true;
  dom.settingsSheet.hidden = true;
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await dom.readerView.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    toast("A tela cheia não está disponível neste navegador.", "error");
  }
}

function resetControlsTimer() {
  clearTimeout(state.controlsTimer);
  dom.readerView.classList.remove("controls-hidden");
  if (!state.autoHide || state.guidedActive || dom.readerView.hidden) return;
  state.controlsTimer = setTimeout(() => dom.readerView.classList.add("controls-hidden"), 3200);
}

function queueGuidedLayout() {
  if (!state.guidedActive) return;
  cancelAnimationFrame(state.guidedLayoutFrame);
  state.guidedLayoutFrame = requestAnimationFrame(() => {
    positionGuidedHotspots();
    if (state.guidedRegionIndex >= 0) drawGuidedBubble(state.guidedRegionIndex, { animate: false });
  });
}

async function startGuidedMode() {
  if (!state.reader) return;
  if (state.guidedActive || state.manualMode) {
    closeGuidedMode();
    return;
  }
  state.guidedActive = true;
  state.guidedRegions = [];
  state.guidedRegionIndex = -1;
  state.freeZoomFactor = 2.8;
  state.guidedSourceImage = null;
  state.guidedSourcePageIndex = null;
  state.guidedPreviewPosition = null;
  state.guidedPreviewPointers.clear();
  state.guidedPreviewGesture = null;
  dom.guidedLayer.classList.remove("has-preview");
  dom.guidedLayer.hidden = false;
  dom.guidedCanvas.hidden = true;
  dom.guidedButton.classList.add("active");
  dom.guidedButtonLabel.textContent = "Sair do zoom";
  dom.mobileGuidedButton.classList.add("active");
  dom.readerView.classList.remove("controls-hidden");
  updateFreeZoomUi();
  startManualRegion();
}

function imageRegionRect(region) {
  const sourceImage = state.guidedSourceImage || dom.pageImage;
  const imageRect = sourceImage.getBoundingClientRect();
  const layerRect = dom.guidedLayer.getBoundingClientRect();
  const scaleX = imageRect.width / sourceImage.naturalWidth;
  const scaleY = imageRect.height / sourceImage.naturalHeight;
  return {
    left: imageRect.left - layerRect.left + region.x * scaleX,
    top: imageRect.top - layerRect.top + region.y * scaleY,
    width: region.width * scaleX,
    height: region.height * scaleY,
    imageRect,
    layerRect,
  };
}

function renderGuidedHotspots() {
  dom.guidedHotspots.replaceChildren();
  if (!state.guidedRegions[0] || isMobileLayout()) return;
  const marker = document.createElement("div");
  marker.className = "free-selection-frame";
  dom.guidedHotspots.append(marker);
}

function positionGuidedHotspots() {
  const sourceImage = state.guidedSourceImage || dom.pageImage;
  if (!state.guidedActive || dom.guidedLayer.hidden || !sourceImage?.naturalWidth) return;
  const marker = $(".free-selection-frame", dom.guidedHotspots);
  const region = state.guidedRegions[0];
  if (!marker || !region) return;
  const rect = imageRegionRect(region);
  const visible = rect.left + rect.width > 0
    && rect.top + rect.height > 0
    && rect.left < rect.layerRect.width
    && rect.top < rect.layerRect.height;
  marker.hidden = !visible;
  if (!visible) return;
  marker.style.left = `${rect.left}px`;
  marker.style.top = `${rect.top}px`;
  marker.style.width = `${rect.width}px`;
  marker.style.height = `${rect.height}px`;
}

function drawGuidedBubble(index, options = {}) {
  if (!state.guidedActive || index < 0 || !state.guidedRegions[index]) return;
  const region = state.guidedRegions[index];
  const placed = imageRegionRect(region);
  const bounds = placed.layerRect;
  const regionVisible = placed.left + placed.width > 0
    && placed.top + placed.height > 0
    && placed.left < bounds.width
    && placed.top < bounds.height;
  if (!regionVisible) {
    dom.guidedCanvas.hidden = true;
    dom.guidedLayer.classList.remove("has-preview");
    return;
  }
  const mobile = isMobileLayout();
  const sourceImage = state.guidedSourceImage || dom.pageImage;
  const sourceWidth = sourceImage.naturalWidth;
  const sourceHeight = sourceImage.naturalHeight;
  const paddingX = Math.max(2, region.width * 0.02);
  const paddingY = Math.max(2, region.height * 0.025);
  const cropX = Math.max(0, region.x - paddingX);
  const cropY = Math.max(0, region.y - paddingY);
  const cropWidth = Math.min(sourceWidth - cropX, region.width + paddingX * 2);
  const cropHeight = Math.min(sourceHeight - cropY, region.height + paddingY * 2);
  const aspect = cropWidth / cropHeight;

  const minWidth = mobile ? Math.min(210, bounds.width - 20) : Math.min(220, bounds.width - 36);
  const maxWidth = bounds.width * (mobile ? 0.92 : 0.64);
  const maxHeight = bounds.height * (mobile ? 0.48 : 0.66);
  let displayWidth = Math.min(maxWidth, Math.max(minWidth, placed.width * state.freeZoomFactor));
  let displayHeight = displayWidth / aspect;
  if (displayHeight > maxHeight) {
    displayHeight = maxHeight;
    displayWidth = displayHeight * aspect;
  }

  const centerX = placed.left + placed.width / 2;
  const centerY = placed.top + placed.height / 2;
  const sideMargin = mobile ? 10 : 18;
  const topInset = mobile ? 58 : 64;
  const bottomInset = mobile ? 78 : 86;
  let left = Math.max(sideMargin, Math.min(bounds.width - displayWidth - sideMargin, centerX - displayWidth / 2));
  const below = placed.top + placed.height + 14;
  const above = placed.top - displayHeight - 14;
  let top;
  if (below + displayHeight <= bounds.height - bottomInset) top = below;
  else if (above >= topInset) top = above;
  else top = Math.max(topInset, Math.min(bounds.height - displayHeight - bottomInset, centerY - displayHeight / 2));

  if (state.guidedPreviewPosition) {
    left = state.guidedPreviewPosition.x;
    top = state.guidedPreviewPosition.y;
  }
  left = Math.max(sideMargin, Math.min(bounds.width - displayWidth - sideMargin, left));
  top = Math.max(topInset, Math.min(bounds.height - displayHeight - bottomInset, top));
  state.guidedPreviewPosition = { x: left, y: top };

  const dpr = Math.min(mobile ? 3 : 2.5, devicePixelRatio || 1);
  const canvas = dom.guidedCanvas;
  canvas.width = Math.max(1, Math.round(displayWidth * dpr));
  canvas.height = Math.max(1, Math.round(displayHeight * dpr));
  canvas.style.left = `${left}px`;
  canvas.style.top = `${top}px`;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  const context = canvas.getContext("2d", { alpha: false });
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#fff";
  context.fillRect(0, 0, displayWidth, displayHeight);
  context.filter = `brightness(${state.brightness}%) contrast(${state.contrast}%)`;
  context.drawImage(sourceImage, cropX, cropY, cropWidth, cropHeight, 0, 0, displayWidth, displayHeight);
  canvas.hidden = false;
  dom.guidedLayer.classList.add("has-preview");

  if (options.animate !== false && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.classList.remove("is-popping");
    void canvas.offsetWidth;
    canvas.classList.add("is-popping");
  }
}

function formatFreeZoom(value = state.freeZoomFactor) {
  return `${value.toFixed(1).replace(".", ",")}×`;
}

function updateFreeZoomUi() {
  const label = formatFreeZoom();
  dom.guidedZoomValueButton.textContent = label;
  dom.guidedCounter.textContent = state.guidedRegionIndex >= 0 ? label : "Marque uma área";
}

function adjustFreeZoom(amount) {
  if (!state.guidedActive) return;
  state.freeZoomFactor = Math.max(1.5, Math.min(6, Math.round((state.freeZoomFactor + amount) * 4) / 4));
  updateFreeZoomUi();
  if (state.guidedRegionIndex >= 0) drawGuidedBubble(state.guidedRegionIndex, { animate: false });
}

function resetFreeZoom() {
  if (!state.guidedActive) return;
  state.freeZoomFactor = 2.8;
  updateFreeZoomUi();
  if (state.guidedRegionIndex >= 0) drawGuidedBubble(state.guidedRegionIndex, { animate: false });
}

function closeGuidedMode() {
  cancelAnimationFrame(state.guidedLayoutFrame);
  state.guidedLayoutFrame = null;
  state.guidedActive = false;
  state.guidedRegions = [];
  state.guidedRegionIndex = -1;
  state.guidedSourceImage = null;
  state.guidedSourcePageIndex = null;
  state.guidedPreviewPosition = null;
  state.guidedPreviewPointers.clear();
  state.guidedPreviewGesture = null;
  dom.guidedHotspots.replaceChildren();
  dom.guidedCanvas.hidden = true;
  dom.guidedCanvas.classList.remove("is-popping");
  dom.guidedLayer.hidden = true;
  dom.guidedLayer.classList.remove("has-preview");
  dom.emptyDetection.hidden = true;
  dom.guidedButton.classList.remove("active");
  dom.guidedButtonLabel.textContent = "Zoom Livre";
  dom.mobileGuidedButton.classList.remove("active");
  cancelManualRegion();
}

function startManualRegion() {
  dom.emptyDetection.hidden = true;
  if (!state.guidedActive) return;
  dom.guidedLayer.hidden = false;
  dom.guidedCanvas.hidden = true;
  dom.guidedHotspots.replaceChildren();
  state.guidedRegions = [];
  state.guidedRegionIndex = -1;
  state.guidedSourceImage = null;
  state.guidedSourcePageIndex = null;
  state.guidedPreviewPosition = null;
  state.guidedPreviewPointers.clear();
  state.guidedPreviewGesture = null;
  dom.guidedLayer.classList.remove("has-preview");
  state.manualMode = true;
  state.manualStart = null;
  state.manualPointerId = null;
  dom.readerViewport.classList.add("manual-mode");
  dom.manualSelection.hidden = true;
  dom.guidedCounter.textContent = "Marque uma área";
  dom.guidedHelp.textContent = "Arraste sobre uma fala ou toque no trecho que quer ampliar";
}

function cancelManualRegion() {
  if (state.manualPointerId !== null) {
    try { dom.readerViewport.releasePointerCapture?.(state.manualPointerId); } catch { /* captura já encerrada */ }
  }
  state.manualMode = false;
  state.manualStart = null;
  state.manualPointerId = null;
  dom.readerViewport.classList.remove("manual-mode");
  dom.manualSelection.hidden = true;
}

function readerImagesForCurrentView() {
  if (state.viewMode === "scroll") {
    return $$(".scroll-page-shell img", dom.scrollPages).filter((image) => image.naturalWidth && image.naturalHeight);
  }
  const images = [dom.pageImage];
  if (state.viewMode === "double" && !dom.secondPageShell.hidden) images.push(dom.secondPageImage);
  return images.filter((image) => image.naturalWidth && image.naturalHeight);
}

function readerImageAtPoint(event) {
  let candidate = event.target?.closest?.("img");
  if (!candidate) candidate = event.target?.closest?.(".scroll-page-shell")?.querySelector("img");
  if (candidate?.naturalWidth) {
    const rect = candidate.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) return candidate;
  }
  return readerImagesForCurrentView().find((image) => {
    const rect = image.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }) || null;
}

function pageIndexForImage(image) {
  if (state.viewMode === "scroll") {
    return Number(image.closest(".scroll-page-shell")?.dataset.index ?? state.pageIndex);
  }
  return image === dom.secondPageImage ? Math.min(state.pageCount - 1, state.pageIndex + 1) : state.pageIndex;
}

function pointInImage(event, sourceImage = readerImageAtPoint(event)) {
  if (!sourceImage) return null;
  const rect = sourceImage.getBoundingClientRect();
  const x = Math.max(rect.left, Math.min(rect.right, event.clientX));
  const y = Math.max(rect.top, Math.min(rect.bottom, event.clientY));
  return {
    x,
    y,
    naturalX: ((x - rect.left) / Math.max(1, rect.width)) * sourceImage.naturalWidth,
    naturalY: ((y - rect.top) / Math.max(1, rect.height)) * sourceImage.naturalHeight,
    rect,
    image: sourceImage,
    pageIndex: pageIndexForImage(sourceImage),
  };
}

function manualPointerDown(event) {
  if (!state.manualMode || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
  if (event.target.closest?.("button, canvas, input, a, .guided-topbar, .guided-controls")) return;
  const point = pointInImage(event);
  if (!point) return;
  if (event.clientX < point.rect.left || event.clientX > point.rect.right || event.clientY < point.rect.top || event.clientY > point.rect.bottom) return;
  event.preventDefault();
  state.manualStart = point;
  state.manualPointerId = event.pointerId;
  dom.manualSelection.hidden = false;
  dom.manualSelection.style.left = `${point.x}px`;
  dom.manualSelection.style.top = `${point.y}px`;
  dom.manualSelection.style.width = "0px";
  dom.manualSelection.style.height = "0px";
  dom.readerViewport.setPointerCapture?.(event.pointerId);
}

function manualPointerMove(event) {
  if (!state.manualMode || !state.manualStart || event.pointerId !== state.manualPointerId) return;
  event.preventDefault();
  const point = pointInImage(event, state.manualStart.image);
  if (!point) return;
  const left = Math.min(state.manualStart.x, point.x);
  const top = Math.min(state.manualStart.y, point.y);
  dom.manualSelection.style.left = `${left}px`;
  dom.manualSelection.style.top = `${top}px`;
  dom.manualSelection.style.width = `${Math.abs(point.x - state.manualStart.x)}px`;
  dom.manualSelection.style.height = `${Math.abs(point.y - state.manualStart.y)}px`;
}

function manualPointerCancel(event) {
  if (!state.manualMode || (state.manualPointerId !== null && event.pointerId !== state.manualPointerId)) return;
  if (state.manualPointerId !== null) {
    try { dom.readerViewport.releasePointerCapture?.(state.manualPointerId); } catch { /* captura já encerrada */ }
  }
  state.manualStart = null;
  state.manualPointerId = null;
  dom.manualSelection.hidden = true;
}

function manualPointerUp(event) {
  if (!state.manualMode || !state.manualStart || event.pointerId !== state.manualPointerId) return;
  event.preventDefault();
  const end = pointInImage(event, state.manualStart.image);
  if (!end) return;
  const start = state.manualStart;
  const sourceImage = start.image;
  const imageRect = sourceImage.getBoundingClientRect();
  const screenWidth = Math.abs(end.x - start.x);
  const screenHeight = Math.abs(end.y - start.y);
  let width = Math.abs(end.naturalX - start.naturalX);
  let height = Math.abs(end.naturalY - start.naturalY);
  let left = Math.min(start.naturalX, end.naturalX);
  let top = Math.min(start.naturalY, end.naturalY);

  if (screenWidth < 12 && screenHeight < 12) {
    width = sourceImage.naturalWidth * (isMobileLayout() ? 0.3 : 0.24);
    height = sourceImage.naturalHeight * (isMobileLayout() ? 0.1 : 0.085);
    left = Math.max(0, Math.min(sourceImage.naturalWidth - width, end.naturalX - width / 2));
    top = Math.max(0, Math.min(sourceImage.naturalHeight - height, end.naturalY - height / 2));
  } else {
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const padX = (12 / Math.max(1, imageRect.width)) * sourceImage.naturalWidth;
    const padY = (12 / Math.max(1, imageRect.height)) * sourceImage.naturalHeight;
    width = Math.min(sourceImage.naturalWidth, Math.max(sourceImage.naturalWidth * 0.045, width + padX));
    height = Math.min(sourceImage.naturalHeight, Math.max(sourceImage.naturalHeight * 0.025, height + padY));
    left = Math.max(0, Math.min(sourceImage.naturalWidth - width, centerX - width / 2));
    top = Math.max(0, Math.min(sourceImage.naturalHeight - height, centerY - height / 2));
  }

  const region = {
    x: left,
    y: top,
    width,
    height,
    confidence: 1,
  };
  state.guidedRegions = [region];
  state.guidedRegionIndex = 0;
  state.guidedSourceImage = sourceImage;
  state.guidedSourcePageIndex = start.pageIndex;
  state.guidedActive = true;
  cancelManualRegion();
  dom.guidedLayer.hidden = false;
  dom.guidedButton.classList.add("active");
  dom.guidedButtonLabel.textContent = "Sair do zoom";
  dom.mobileGuidedButton.classList.add("active");
  renderGuidedHotspots();
  updateFreeZoomUi();
  dom.guidedHelp.textContent = "Arraste a ampliação para mover · use pinça ou +/− para ajustar";
  requestAnimationFrame(() => {
    positionGuidedHotspots();
    drawGuidedBubble(0);
  });
}

function clampGuidedPreviewPosition(x, y) {
  const bounds = dom.guidedLayer.getBoundingClientRect();
  const preview = dom.guidedCanvas.getBoundingClientRect();
  const side = isMobileLayout() ? 10 : 18;
  const top = isMobileLayout() ? 58 : 64;
  const bottom = isMobileLayout() ? 78 : 86;
  return {
    x: Math.max(side, Math.min(bounds.width - preview.width - side, x)),
    y: Math.max(top, Math.min(bounds.height - preview.height - bottom, y)),
  };
}

function guidedPreviewPointerDown(event) {
  if (!state.guidedActive || state.manualMode || dom.guidedCanvas.hidden) return;
  event.preventDefault();
  event.stopPropagation();
  dom.guidedCanvas.setPointerCapture?.(event.pointerId);
  state.guidedPreviewPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (state.guidedPreviewPointers.size >= 2) {
    const [a, b] = [...state.guidedPreviewPointers.values()];
    state.guidedPreviewGesture = {
      type: "pinch",
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      zoom: state.freeZoomFactor,
    };
  } else {
    const rect = dom.guidedCanvas.getBoundingClientRect();
    state.guidedPreviewGesture = {
      type: "drag",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left - dom.guidedLayer.getBoundingClientRect().left,
      originY: rect.top - dom.guidedLayer.getBoundingClientRect().top,
    };
    dom.guidedCanvas.classList.add("is-dragging");
  }
}

function guidedPreviewPointerMove(event) {
  if (!state.guidedPreviewPointers.has(event.pointerId) || !state.guidedPreviewGesture) return;
  event.preventDefault();
  event.stopPropagation();
  state.guidedPreviewPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (state.guidedPreviewPointers.size >= 2) {
    const [a, b] = [...state.guidedPreviewPointers.values()];
    if (state.guidedPreviewGesture.type !== "pinch") {
      state.guidedPreviewGesture = {
        type: "pinch",
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        zoom: state.freeZoomFactor,
      };
      return;
    }
    const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    state.freeZoomFactor = Math.max(1.5, Math.min(6, state.guidedPreviewGesture.zoom * (distance / state.guidedPreviewGesture.distance)));
    updateFreeZoomUi();
    drawGuidedBubble(state.guidedRegionIndex, { animate: false });
    return;
  }

  const gesture = state.guidedPreviewGesture;
  if (gesture.type !== "drag" || gesture.pointerId !== event.pointerId) return;
  const next = clampGuidedPreviewPosition(
    gesture.originX + event.clientX - gesture.startX,
    gesture.originY + event.clientY - gesture.startY,
  );
  state.guidedPreviewPosition = next;
  dom.guidedCanvas.style.left = `${next.x}px`;
  dom.guidedCanvas.style.top = `${next.y}px`;
}

function guidedPreviewPointerEnd(event) {
  if (!state.guidedPreviewPointers.has(event.pointerId)) return;
  state.guidedPreviewPointers.delete(event.pointerId);
  try { dom.guidedCanvas.releasePointerCapture?.(event.pointerId); } catch { /* captura já encerrada */ }
  dom.guidedCanvas.classList.remove("is-dragging");

  if (state.guidedPreviewPointers.size === 1) {
    const [pointerId, point] = [...state.guidedPreviewPointers.entries()][0];
    const rect = dom.guidedCanvas.getBoundingClientRect();
    const layerRect = dom.guidedLayer.getBoundingClientRect();
    state.guidedPreviewGesture = {
      type: "drag",
      pointerId,
      startX: point.x,
      startY: point.y,
      originX: rect.left - layerRect.left,
      originY: rect.top - layerRect.top,
    };
  } else if (!state.guidedPreviewPointers.size) {
    state.guidedPreviewGesture = null;
  }
}

function pagePanPointerDown(event) {
  if (event.pointerType === "touch" || state.viewMode === "scroll" || state.zoom <= 1.01) return;
  if (state.manualMode || state.guidedActive || event.button !== 0 || event.target.closest?.("button, input")) return;
  event.preventDefault();
  state.panPointerId = event.pointerId;
  state.panStart = { x: event.clientX, y: event.clientY, panX: state.panX, panY: state.panY };
  dom.readerViewport.classList.add("is-panning");
  dom.readerViewport.setPointerCapture?.(event.pointerId);
}

function pagePanPointerMove(event) {
  if (state.panPointerId !== event.pointerId || !state.panStart) return;
  event.preventDefault();
  applyPagePan(
    state.panStart.panX + event.clientX - state.panStart.x,
    state.panStart.panY + event.clientY - state.panStart.y,
  );
}

function pagePanPointerEnd(event) {
  if (state.panPointerId !== event.pointerId) return;
  try { dom.readerViewport.releasePointerCapture?.(event.pointerId); } catch { /* captura já encerrada */ }
  state.panPointerId = null;
  state.panStart = null;
  dom.readerViewport.classList.remove("is-panning");
}

async function saveCatalogItem(item, options = {}) {
  const existing = await getLibraryComic(item.id);
  const record = { ...catalogRecord(item), ...(existing || {}), updatedAt: Date.now() };
  await saveLibraryComic(record);
  await refreshLibrary();
  if (!options.silent) toast(`${record.title} foi salva em Quero ler.`, "success");
  return record;
}

function catalogCard(item) {
  const saved = state.libraryItems.find((comic) => comic.id === item.id);
  const article = document.createElement("article");
  article.className = "comic-card catalog-comic-card";
  article.tabIndex = 0;
  const cover = createComicCover(item);
  const source = document.createElement("span");
  source.className = "catalog-source-badge";
  source.textContent = item.source;
  cover.append(source);

  const body = document.createElement("div");
  body.className = "comic-card-body";
  const title = document.createElement("h2");
  title.textContent = item.title;
  const meta = document.createElement("p");
  meta.textContent = comicSubtitle(item);
  const author = document.createElement("small");
  author.textContent = item.authors?.slice(0, 2).join(", ") || item.publisher || "Autor não informado";
  const actions = document.createElement("div");
  actions.className = "comic-card-actions";
  const save = document.createElement("button");
  save.type = "button";
  save.className = `comic-card-primary ${saved ? "saved" : ""}`;
  save.textContent = saved ? "Na biblioteca" : "Quero ler";
  save.disabled = Boolean(saved);
  save.addEventListener("click", async (event) => {
    event.stopPropagation();
    await saveCatalogItem(item);
    renderCatalogResults();
  });
  const link = document.createElement("button");
  link.type = "button";
  link.className = "comic-card-file";
  link.setAttribute("aria-label", `Vincular arquivo de ${item.title}`);
  link.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 14v5h14v-5"/></svg>`;
  link.addEventListener("click", (event) => {
    event.stopPropagation();
    chooseFilesFor(saved?.id || null, item);
  });
  actions.append(save, link);
  body.append(title, meta, author, actions);
  article.append(cover, body);
  article.addEventListener("click", () => openComicDetails(saved || item, saved ? "library" : "catalog"));
  article.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openComicDetails(saved || item, saved ? "library" : "catalog");
    }
  });
  bindFileDrop(article, { targetComicId: saved?.id || null, catalogItem: item });
  return article;
}

function renderCatalogResults() {
  dom.catalogResults.replaceChildren();
  state.catalogResults.forEach((item) => dom.catalogResults.append(catalogCard(item)));
}

function setCatalogStatus(title, message, mode = "idle") {
  dom.catalogStatus.hidden = false;
  dom.catalogStatus.classList.toggle("loading", mode === "loading");
  dom.catalogStatus.classList.toggle("error", mode === "error");
  $("strong", dom.catalogStatus).textContent = title;
  $("span:not(.catalog-status-icon)", dom.catalogStatus).textContent = message;
}

async function performCatalogSearch(query) {
  const value = query.trim();
  if (value.length < 2) return;
  dom.catalogSearchInput.value = value;
  dom.catalogResults.replaceChildren();
  setCatalogStatus("Pesquisando o catálogo…", "Buscando capas, edições, autores e sinopses.", "loading");
  try {
    state.catalogResults = await searchComicCatalog(value, catalogPrefs());
    if (!state.catalogResults.length) {
      setCatalogStatus("Nenhuma edição encontrada", "Tente usar somente o nome da série, o autor ou a editora.");
      return;
    }
    dom.catalogStatus.hidden = true;
    renderCatalogResults();
  } catch (error) {
    console.error(error);
    setCatalogStatus("O catálogo não respondeu", error?.message || "Tente novamente em alguns instantes.", "error");
  }
}

function detailRow(label, value) {
  if (!value) return null;
  const row = document.createElement("div");
  row.className = "detail-fact";
  const term = document.createElement("span");
  term.textContent = label;
  const content = document.createElement("strong");
  content.textContent = value;
  row.append(term, content);
  return row;
}

function openComicDetails(item, origin = "library") {
  const saved = state.libraryItems.find((comic) => comic.id === item.id);
  const current = saved || item;
  state.detailItem = current;
  dom.comicDetailContent.replaceChildren();

  const layout = document.createElement("div");
  layout.className = "comic-detail-layout";
  const cover = createComicCover(current, "comic-detail-cover");
  const content = document.createElement("div");
  content.className = "comic-detail-copy";
  const eyebrow = document.createElement("span");
  eyebrow.className = "detail-eyebrow";
  eyebrow.textContent = saved
    ? (comicHasReadableFile(saved) ? "NA SUA BIBLIOTECA · PRONTA PARA LER" : "NA SUA LISTA · AGUARDANDO ARQUIVO")
    : `${current.source || "CATÁLOGO"} · FICHA DA HQ`;
  const title = document.createElement("h2");
  title.textContent = current.title;
  const subtitle = document.createElement("p");
  subtitle.className = "detail-subtitle";
  subtitle.textContent = current.subtitle || comicSubtitle(current);
  const facts = document.createElement("div");
  facts.className = "detail-facts";
  [
    detailRow("Autores", current.authors?.join(", ")),
    detailRow("Editora", current.publisher),
    detailRow("Publicação", current.publishedDate || current.year),
    detailRow("Páginas", current.pageCount || current.pages),
    detailRow("ISBN", current.isbn),
  ].filter(Boolean).forEach((row) => facts.append(row));
  const descriptionTitle = document.createElement("h3");
  descriptionTitle.textContent = "Sinopse";
  const description = document.createElement("p");
  description.className = "detail-description";
  description.textContent = current.description || "Ainda não há uma sinopse disponível para esta edição.";
  const tags = document.createElement("div");
  tags.className = "detail-tags";
  (current.categories || []).slice(0, 5).forEach((category) => {
    const tag = document.createElement("span");
    tag.textContent = category;
    tags.append(tag);
  });

  const drop = document.createElement("div");
  drop.className = "comic-detail-drop";
  drop.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 15V4m0 0L8 8m4-4 4 4M5 14v5h14v-5"/></svg><div><strong>Tem o arquivo?</strong><span>Arraste o CBR, CBZ ou PDF aqui para vincular automaticamente.</span></div>`;
  bindFileDrop(drop, { targetComicId: saved?.id || null, catalogItem: origin === "catalog" ? item : null });

  const actions = document.createElement("div");
  actions.className = "comic-detail-actions";
  const primary = document.createElement("button");
  primary.type = "button";
  primary.className = "primary-button compact";
  if (saved && comicHasReadableFile(saved)) {
    primary.textContent = "Ler agora";
    primary.addEventListener("click", () => { dom.comicDetailDialog.close(); openLibraryComic(saved.id); });
  } else {
    primary.textContent = "Vincular meu arquivo";
    primary.addEventListener("click", () => chooseFilesFor(saved?.id || null, origin === "catalog" ? item : null));
  }
  actions.append(primary);

  if (!saved) {
    const save = document.createElement("button");
    save.type = "button";
    save.className = "secondary-button compact";
    save.textContent = "Salvar em Quero ler";
    save.addEventListener("click", async () => {
      const record = await saveCatalogItem(item);
      dom.comicDetailDialog.close();
      openComicDetails(record, "library");
      renderCatalogResults();
    });
    actions.append(save);
  } else {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "detail-remove-button";
    remove.textContent = "Remover da biblioteca";
    remove.addEventListener("click", async () => {
      if (!confirm(`Remover “${saved.title}” e o arquivo guardado neste aparelho?`)) return;
      await removeLibraryComic(saved.id);
      state.runtimeFiles.delete(saved.id);
      dom.comicDetailDialog.close();
      await refreshLibrary();
      renderCatalogResults();
    });
    actions.append(remove);
  }

  if (current.infoLink) {
    const sourceLink = document.createElement("a");
    sourceLink.href = current.infoLink;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = `Ver ficha em ${current.source || "catálogo"}`;
    actions.append(sourceLink);
  }

  content.append(eyebrow, title, subtitle, facts, descriptionTitle, description, tags, drop, actions);
  layout.append(cover, content);
  dom.comicDetailContent.append(layout);
  if (dom.comicDetailDialog.showModal) dom.comicDetailDialog.showModal();
  else dom.comicDetailDialog.setAttribute("open", "");
}

function bindEvents() {
  dom.libraryNavButton.addEventListener("click", () => switchHomePanel("libraryPanel"));
  dom.discoverNavButton.addEventListener("click", () => switchHomePanel("discoverPanel"));
  dom.headerImportButton.addEventListener("click", () => chooseFilesFor());
  dom.openButton.addEventListener("click", (event) => { event.stopPropagation(); chooseFilesFor(); });
  dom.dropZone.addEventListener("click", () => chooseFilesFor());
  dom.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseFilesFor(); }
  });
  bindFileDrop(dom.dropZone);
  dom.fileInput.addEventListener("change", () => importFiles(dom.fileInput.files, {
    targetComicId: state.fileTargetId,
    catalogItem: state.fileTargetCatalog,
  }));

  dom.librarySearchInput.addEventListener("input", () => {
    state.libraryQuery = dom.librarySearchInput.value;
    renderLibrary();
  });
  $$("[data-library-filter]").forEach((button) => button.addEventListener("click", () => {
    state.libraryFilter = button.dataset.libraryFilter;
    $$("[data-library-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderLibrary();
  }));
  dom.catalogSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    performCatalogSearch(dom.catalogSearchInput.value);
  });
  $$("[data-catalog-query]").forEach((button) => button.addEventListener("click", () => performCatalogSearch(button.dataset.catalogQuery)));
  dom.googleApiKeyInput.value = catalogPrefs().googleApiKey || "";
  dom.saveCatalogSettingsButton.addEventListener("click", () => {
    saveJson(CATALOG_KEY, { googleApiKey: dom.googleApiKeyInput.value.trim() });
    toast("Configuração do catálogo salva somente neste aparelho.", "success");
  });
  dom.closeComicDetailButton.addEventListener("click", () => dom.comicDetailDialog.close());
  dom.comicDetailDialog.addEventListener("click", (event) => {
    if (event.target === dom.comicDetailDialog) dom.comicDetailDialog.close();
  });

  dom.themeButton.addEventListener("click", () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    persistPrefs();
  });
  dom.closeReaderButton.addEventListener("click", closeReader);
  [dom.previousPageZone, dom.footerPreviousButton, dom.mobilePreviousButton].forEach((button) => button.addEventListener("click", previousPage));
  [dom.nextPageZone, dom.footerNextButton, dom.mobileNextButton].forEach((button) => button.addEventListener("click", nextPage));
  dom.pageSlider.addEventListener("input", () => setPage(Number(dom.pageSlider.value) - 1));
  dom.zoomOutButton.addEventListener("click", () => setZoom(state.zoom - 0.2));
  dom.zoomInButton.addEventListener("click", () => setZoom(state.zoom + 0.2));
  dom.zoomValueButton.addEventListener("click", () => setZoom(1));
  dom.mobileZoomOutButton.addEventListener("click", () => setZoom(state.zoom - 0.2));
  dom.mobileZoomInButton.addEventListener("click", () => setZoom(state.zoom + 0.2));
  dom.mobileZoomValueButton.addEventListener("click", () => setZoom(1));
  dom.fitButton.addEventListener("click", cycleFit);
  dom.rotateButton.addEventListener("click", rotatePage);
  dom.mobileRotateButton.addEventListener("click", rotatePage);
  [dom.guidedButton, dom.mobileGuidedButton].forEach((button) => button.addEventListener("click", startGuidedMode));
  dom.fullscreenButton.addEventListener("click", toggleFullscreen);
  dom.mobileFullscreenButton.addEventListener("click", toggleFullscreen);
  [dom.settingsButton, dom.mobileSettingsButton].forEach((button) => button.addEventListener("click", openSettings));
  [dom.closeSettingsButton, dom.settingsBackdrop].forEach((element) => element.addEventListener("click", closeSettings));
  dom.thumbnailToggle.addEventListener("click", () => dom.thumbnailRail.classList.toggle("collapsed"));
  dom.mobileThumbsButton.addEventListener("click", () => dom.thumbnailRail.classList.toggle("mobile-open"));
  $$('[data-view-mode]').forEach((button) => button.addEventListener("click", () => setViewMode(button.dataset.viewMode)));
  $$('[data-fit]').forEach((button) => button.addEventListener("click", () => setFit(button.dataset.fit)));
  dom.directionLtr.addEventListener("click", () => setDirection("ltr"));
  dom.directionRtl.addEventListener("click", () => setDirection("rtl"));
  dom.brightnessSlider.addEventListener("input", () => {
    state.brightness = Number(dom.brightnessSlider.value);
    dom.brightnessOutput.value = `${state.brightness}%`;
    applyPageVisuals();
    persistPrefs();
  });
  dom.contrastSlider.addEventListener("input", () => {
    state.contrast = Number(dom.contrastSlider.value);
    dom.contrastOutput.value = `${state.contrast}%`;
    applyPageVisuals();
    persistPrefs();
  });
  dom.autoHideToggle.addEventListener("click", () => {
    state.autoHide = !state.autoHide;
    dom.autoHideToggle.classList.toggle("active", state.autoHide);
    dom.autoHideToggle.setAttribute("aria-checked", String(state.autoHide));
    persistPrefs();
    resetControlsTimer();
  });

  dom.closeGuidedButton.addEventListener("click", closeGuidedMode);
  dom.guidedZoomOutButton.addEventListener("click", () => adjustFreeZoom(-0.25));
  dom.guidedZoomInButton.addEventListener("click", () => adjustFreeZoom(0.25));
  dom.guidedZoomValueButton.addEventListener("click", resetFreeZoom);
  dom.manualRegionButton.addEventListener("click", startManualRegion);
  dom.startManualButton.addEventListener("click", startManualRegion);
  dom.guidedCanvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startManualRegion();
    }
  });
  dom.guidedCanvas.addEventListener("pointerdown", guidedPreviewPointerDown);
  dom.guidedCanvas.addEventListener("pointermove", guidedPreviewPointerMove);
  dom.guidedCanvas.addEventListener("pointerup", guidedPreviewPointerEnd);
  dom.guidedCanvas.addEventListener("pointercancel", guidedPreviewPointerEnd);
  dom.readerViewport.addEventListener("pointerdown", manualPointerDown);
  dom.readerViewport.addEventListener("pointermove", manualPointerMove);
  dom.readerViewport.addEventListener("pointerup", manualPointerUp);
  dom.readerViewport.addEventListener("pointercancel", manualPointerCancel);
  dom.readerViewport.addEventListener("pointerdown", pagePanPointerDown);
  dom.readerViewport.addEventListener("pointermove", pagePanPointerMove);
  dom.readerViewport.addEventListener("pointerup", pagePanPointerEnd);
  dom.readerViewport.addEventListener("pointercancel", pagePanPointerEnd);

  dom.readerViewport.addEventListener("wheel", (event) => {
    if ((event.ctrlKey || event.metaKey) && state.viewMode !== "scroll") {
      event.preventDefault();
      setZoom(state.zoom + (event.deltaY < 0 ? 0.15 : -0.15));
    }
  }, { passive: false });

  dom.readerViewport.addEventListener("touchstart", (event) => {
    if (state.manualMode || event.target.closest?.(".guided-bubble, .guided-controls, .guided-topbar")) return;
    resetControlsTimer();
    if (event.touches.length === 2) {
      const viewportRect = dom.readerViewport.getBoundingClientRect();
      const middleX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const middleY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      state.touch.pinchDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      );
      state.touch.pinchZoom = state.zoom;
      state.touch.pinchPanX = state.panX;
      state.touch.pinchPanY = state.panY;
      state.touch.pinchCenterX = middleX - viewportRect.left - viewportRect.width / 2;
      state.touch.pinchCenterY = middleY - viewportRect.top - viewportRect.height / 2;
      state.touch.pinchViewportX = middleX - viewportRect.left;
      state.touch.pinchViewportY = middleY - viewportRect.top;
      state.touch.pinchScrollLeft = dom.readerViewport.scrollLeft;
      state.touch.pinchScrollTop = dom.readerViewport.scrollTop;
      state.touch.isPinching = true;
      state.touch.isPanning = false;
      if (state.viewMode !== "scroll") dom.readerViewport.classList.add("is-panning");
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    state.touch.startX = touch.clientX;
    state.touch.startY = touch.clientY;
    state.touch.startTime = Date.now();
    if (state.viewMode !== "scroll" && state.zoom > 1.01) {
      state.touch.isPanning = true;
      state.touch.panStartX = touch.clientX;
      state.touch.panStartY = touch.clientY;
      state.touch.panOriginX = state.panX;
      state.touch.panOriginY = state.panY;
      dom.readerViewport.classList.add("is-panning");
    }
  }, { passive: true });

  dom.readerViewport.addEventListener("touchmove", (event) => {
    if (state.manualMode || event.target.closest?.(".guided-bubble, .guided-controls, .guided-topbar")) return;
    if (event.touches.length === 2 && state.touch.pinchDistance) {
      event.preventDefault();
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      );
      const viewportRect = dom.readerViewport.getBoundingClientRect();
      const currentCenterX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - viewportRect.left - viewportRect.width / 2;
      const currentCenterY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - viewportRect.top - viewportRect.height / 2;
      const nextZoom = state.touch.pinchZoom * (distance / state.touch.pinchDistance);
      setZoom(nextZoom, { immediate: true });
      const ratio = Math.max(0.01, state.zoom / state.touch.pinchZoom);
      if (state.viewMode === "scroll") {
        const currentViewportX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - viewportRect.left;
        const currentViewportY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - viewportRect.top;
        dom.readerViewport.scrollLeft = (state.touch.pinchScrollLeft + state.touch.pinchViewportX) * ratio - currentViewportX;
        dom.readerViewport.scrollTop = (state.touch.pinchScrollTop + state.touch.pinchViewportY) * ratio - currentViewportY;
        return;
      }
      applyPagePan(
        currentCenterX - (state.touch.pinchCenterX - state.touch.pinchPanX) * ratio,
        currentCenterY - (state.touch.pinchCenterY - state.touch.pinchPanY) * ratio,
      );
      return;
    }

    if (event.touches.length === 1 && state.touch.isPanning && state.zoom > 1.01) {
      event.preventDefault();
      const touch = event.touches[0];
      applyPagePan(
        state.touch.panOriginX + touch.clientX - state.touch.panStartX,
        state.touch.panOriginY + touch.clientY - state.touch.panStartY,
      );
    }
  }, { passive: false });

  dom.readerViewport.addEventListener("touchend", (event) => {
    if (state.manualMode || event.target.closest?.(".guided-bubble, .guided-controls, .guided-topbar")) return;
    const wasManipulating = state.touch.isPinching || state.touch.isPanning;
    if (event.touches.length === 1 && state.zoom > 1.01 && state.viewMode !== "scroll") {
      const touch = event.touches[0];
      state.touch.isPinching = false;
      state.touch.isPanning = true;
      state.touch.panStartX = touch.clientX;
      state.touch.panStartY = touch.clientY;
      state.touch.panOriginX = state.panX;
      state.touch.panOriginY = state.panY;
      return;
    }
    state.touch.isPinching = false;
    state.touch.isPanning = false;
    state.touch.pinchDistance = 0;
    dom.readerViewport.classList.remove("is-panning");
    if (wasManipulating || state.viewMode === "scroll" || state.zoom > 1.01 || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - state.touch.startX;
    const dy = touch.clientY - state.touch.startY;
    const elapsed = Date.now() - state.touch.startTime;
    if (elapsed < 500 && Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if ((dx < 0 && state.direction === "ltr") || (dx > 0 && state.direction === "rtl")) nextPage();
      else previousPage();
    }
  }, { passive: true });

  dom.readerViewport.addEventListener("touchcancel", () => {
    state.touch.isPinching = false;
    state.touch.isPanning = false;
    state.touch.pinchDistance = 0;
    dom.readerViewport.classList.remove("is-panning");
  }, { passive: true });

  dom.readerViewport.addEventListener("dblclick", () => {
    if (!state.manualMode && !state.guidedActive) setZoom(state.zoom > 1.1 ? 1 : 2.25);
  });
  dom.readerViewport.addEventListener("scroll", () => {
    scheduleScrollPositionUpdate();
    queueGuidedLayout();
  }, { passive: true });
  dom.readerView.addEventListener("pointermove", resetControlsTimer);
  dom.readerView.addEventListener("pointerdown", resetControlsTimer);
  const redrawGuidedAfterResize = () => {
    queueGuidedLayout();
  };
  addEventListener("resize", redrawGuidedAfterResize);
  window.visualViewport?.addEventListener("resize", redrawGuidedAfterResize);

  document.addEventListener("keydown", (event) => {
    if (dom.readerView.hidden || ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    resetControlsTimer();
    if (event.key === "Escape") {
      if (state.guidedActive || state.manualMode) closeGuidedMode();
      else if (!dom.settingsSheet.hidden) closeSettings();
      return;
    }
    if (event.key.toLowerCase() === "g" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      startGuidedMode();
    }
    else if (event.key === "ArrowRight") state.direction === "ltr" ? nextPage() : previousPage();
    else if (event.key === "ArrowLeft") state.direction === "ltr" ? previousPage() : nextPage();
    else if (event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      state.guidedActive ? startManualRegion() : nextPage();
    }
    else if (event.key === "PageUp") previousPage();
    else if (event.key === "+" || event.key === "=") state.guidedActive ? adjustFreeZoom(0.25) : setZoom(state.zoom + 0.2);
    else if (event.key === "-") state.guidedActive ? adjustFreeZoom(-0.25) : setZoom(state.zoom - 0.2);
    else if (event.key === "0") state.guidedActive ? resetFreeZoom() : setZoom(1);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

async function initializeApp() {
  loadPrefs();
  bindEvents();
  registerServiceWorker();
  try {
    await migrateLegacyHistory();
  } catch (error) {
    console.warn("Não foi possível migrar o histórico antigo:", error);
  }
  await refreshLibrary();
}

initializeApp();
