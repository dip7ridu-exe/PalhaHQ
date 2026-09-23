const GOOGLE_BOOKS_ENDPOINT = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_ENDPOINT = "https://openlibrary.org/search.json";

function stripHtml(value = "") {
  const template = document.createElement("template");
  template.innerHTML = value;
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

function secureImage(url = "") {
  return url.replace(/^http:/, "https:");
}

function normalizeGoogleVolume(item) {
  const info = item.volumeInfo || {};
  const identifiers = info.industryIdentifiers || [];
  return {
    id: `google:${item.id}`,
    source: "Google Books",
    sourceId: item.id,
    title: info.title || "Título não informado",
    subtitle: info.subtitle || "",
    authors: info.authors || [],
    publisher: info.publisher || "",
    publishedDate: info.publishedDate || "",
    year: Number(String(info.publishedDate || "").slice(0, 4)) || null,
    description: stripHtml(info.description || "Sinopse ainda não disponível para esta edição."),
    cover: secureImage(info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || ""),
    categories: info.categories || [],
    pageCount: info.pageCount || null,
    isbn: identifiers.find((entry) => entry.type === "ISBN_13")?.identifier
      || identifiers.find((entry) => entry.type === "ISBN_10")?.identifier
      || "",
    infoLink: info.canonicalVolumeLink || info.infoLink || "",
    issue: null,
    volume: null,
  };
}

function normalizeOpenLibraryDoc(item) {
  const key = String(item.key || "").replace(/^\//, "");
  const cover = item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : "";
  return {
    id: `openlibrary:${key || item.edition_key?.[0] || item.title}`,
    source: "Open Library",
    sourceId: key,
    title: item.title || "Título não informado",
    subtitle: item.subtitle || "",
    authors: item.author_name || [],
    publisher: item.publisher?.[0] || "",
    publishedDate: item.first_publish_year ? String(item.first_publish_year) : "",
    year: Number(item.first_publish_year) || null,
    description: "A Open Library possui a ficha desta obra, mas ainda não disponibilizou uma sinopse completa.",
    cover,
    categories: (item.subject || []).slice(0, 5),
    pageCount: item.number_of_pages_median || null,
    isbn: item.isbn?.[0] || "",
    infoLink: key ? `https://openlibrary.org/${key}` : "",
    issue: null,
    volume: null,
  };
}

async function searchGoogleBooks(query, apiKey) {
  const terms = /\b(comic|quadrinho|hq|graphic novel|mang[aá])\b/i.test(query)
    ? query
    : `${query} comics`;
  const parameters = new URLSearchParams({
    q: terms,
    maxResults: "30",
    orderBy: "relevance",
    printType: "books",
    projection: "full",
  });
  if (apiKey) parameters.set("key", apiKey);
  const response = await fetch(`${GOOGLE_BOOKS_ENDPOINT}?${parameters}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Google Books respondeu com ${response.status}.`);
  const data = await response.json();
  return (data.items || []).map(normalizeGoogleVolume).filter((item) => item.title);
}

async function searchOpenLibrary(query) {
  const parameters = new URLSearchParams({
    q: query,
    limit: "30",
    fields: "key,title,subtitle,author_name,first_publish_year,publisher,cover_i,subject,isbn,edition_key,number_of_pages_median",
  });
  const response = await fetch(`${OPEN_LIBRARY_ENDPOINT}?${parameters}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Open Library respondeu com ${response.status}.`);
  const data = await response.json();
  return (data.docs || []).map(normalizeOpenLibraryDoc).filter((item) => item.title);
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title.toLowerCase()}|${item.year || ""}|${item.authors[0] || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchComicCatalog(query, options = {}) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const results = [];
  const errors = [];

  try {
    results.push(...await searchGoogleBooks(trimmed, options.googleApiKey || ""));
  } catch (error) {
    errors.push(error);
  }

  if (results.length < 12) {
    try {
      results.push(...await searchOpenLibrary(trimmed));
    } catch (error) {
      errors.push(error);
    }
  }

  const unique = deduplicate(results).slice(0, 36);
  if (!unique.length && errors.length) throw new Error("Não foi possível consultar o catálogo agora. Verifique sua conexão ou configure uma chave do Google Books.");
  return unique;
}
