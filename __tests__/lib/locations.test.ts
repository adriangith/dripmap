import { afterEach, describe, expect, it, vi } from "vitest";

const { mockGetDoc, mockDoc } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getDoc: mockGetDoc,
  doc: mockDoc,
}));

vi.mock("../../src/lib/firebase", () => ({
  db: {},
}));

import { getLocationDetail, getLocationIndex } from "../../src/lib/locations";

describe("locations", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockGetDoc.mockReset();
    mockDoc.mockReset();
  });

  it("reads index from Firestore when available", async () => {
    const firestoreEntries = [{ slug: "fairy-pools", name: "Fairy Pools" }];
    mockDoc.mockReturnValue({});
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ entries: firestoreEntries }),
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await getLocationIndex();

    expect(result).toEqual(firestoreEntries);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to generated JSON when Firestore index read fails", async () => {
    const fallbackEntries = [{ slug: "niagara-falls", name: "Niagara Falls" }];
    mockDoc.mockReturnValue({});
    mockGetDoc.mockRejectedValue(new Error("firestore down"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => fallbackEntries,
    } as Response);

    const result = await getLocationIndex();

    expect(result).toEqual(fallbackEntries);
    expect(globalThis.fetch).toHaveBeenCalledWith("/generated/locations-index.json");
  });

  it("falls back to generated JSON when Firestore detail read fails", async () => {
    const fallbackDetail = { slug: "fairy-pools", name: "Fairy Pools" };
    mockDoc.mockReturnValue({});
    mockGetDoc.mockRejectedValue(new Error("firestore down"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => fallbackDetail,
    } as Response);

    const result = await getLocationDetail("fairy-pools");

    expect(result).toEqual(fallbackDetail);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/generated/locations/fairy-pools.json"
    );
  });
});
