const STORAGE_KEY = "dripmap-visited";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getVisited(): string[] {
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

export function addVisited(slug: string): void {
  if (!isClient()) return;
  const visited = getVisited();
  if (!visited.includes(slug)) {
    visited.push(slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
  }
}

export function removeVisited(slug: string): void {
  if (!isClient()) return;
  const visited = getVisited().filter((s) => s !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
}

export function isVisited(slug: string): boolean {
  return getVisited().includes(slug);
}
