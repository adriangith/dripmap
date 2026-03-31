const STORAGE_KEY = "dripmap-bookmarks";

export function getBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addBookmark(slug: string): void {
  const bookmarks = getBookmarks();
  if (!bookmarks.includes(slug)) {
    bookmarks.push(slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(slug: string): void {
  const bookmarks = getBookmarks().filter((b) => b !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}
