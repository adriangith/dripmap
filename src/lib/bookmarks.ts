const STORAGE_KEY = "dripmap-bookmarks";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getBookmarks(): string[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addBookmark(slug: string): void {
  if (!isClient()) return;
  const bookmarks = getBookmarks();
  if (!bookmarks.includes(slug)) {
    bookmarks.push(slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(slug: string): void {
  if (!isClient()) return;
  const bookmarks = getBookmarks().filter((b) => b !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}
