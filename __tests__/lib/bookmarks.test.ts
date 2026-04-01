import { describe, it, expect, beforeEach } from "vitest";
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked,
} from "../../src/lib/bookmarks";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("bookmarks", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("returns empty array when no bookmarks exist", () => {
    expect(getBookmarks()).toEqual([]);
  });

  it("adds a bookmark", () => {
    addBookmark("niagara-falls");
    expect(getBookmarks()).toEqual(["niagara-falls"]);
  });

  it("does not add duplicate bookmarks", () => {
    addBookmark("niagara-falls");
    addBookmark("niagara-falls");
    expect(getBookmarks()).toEqual(["niagara-falls"]);
  });

  it("removes a bookmark", () => {
    addBookmark("niagara-falls");
    addBookmark("hamilton-pool");
    removeBookmark("niagara-falls");
    expect(getBookmarks()).toEqual(["hamilton-pool"]);
  });

  it("checks if a slug is bookmarked", () => {
    addBookmark("niagara-falls");
    expect(isBookmarked("niagara-falls")).toBe(true);
    expect(isBookmarked("hamilton-pool")).toBe(false);
  });
});
