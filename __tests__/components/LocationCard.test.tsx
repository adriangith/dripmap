import { render, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import type { PlaceIndexEntry } from "../../src/lib/types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const getLocationCard = () =>
  import("../../src/components/LocationCard").then((m) => m.default);

const location: PlaceIndexEntry = {
  slug: "fairy-pools",
  name: "Fairy Pools",
  type: "swim",
  coordinates: { lat: 57.25, lng: -6.27 },
  region: "Scotland, UK",
  country: "GB",
  cost: "free",
  highlights: ["Crystal clear pools"],
  status: { site: "open", lastVerified: "2026-02-20" },
  tags: ["scenic", "hiking", "cold-water"],
};

describe("LocationCard", () => {
  it("renders a link to the detail page", async () => {
    const LocationCard = await getLocationCard();
    const { container } = render(<LocationCard location={location} />);
    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/location/fairy-pools");
  });

  it("displays location name and country", async () => {
    const LocationCard = await getLocationCard();
    const { getByText } = render(<LocationCard location={location} />);
    expect(getByText("Fairy Pools")).toBeTruthy();
    expect(getByText("GB")).toBeTruthy();
  });

  it("applies highlight styling when isHighlighted is true", async () => {
    const LocationCard = await getLocationCard();
    const { container } = render(
      <LocationCard location={location} isHighlighted={true} />
    );
    const link = container.querySelector("a")!;
    expect(link.className).toContain("border-blue-400");
    expect(link.className).toContain("bg-blue-50");
  });

  it("does not apply highlight styling by default", async () => {
    const LocationCard = await getLocationCard();
    const { container } = render(<LocationCard location={location} />);
    const link = container.querySelector("a")!;
    expect(link.className).toContain("border-gray-200");
    expect(link.className).not.toContain("border-blue-400");
  });

  it("calls onHover with slug on mouseEnter and null on mouseLeave", async () => {
    const LocationCard = await getLocationCard();
    const onHover = vi.fn();
    const { container } = render(
      <LocationCard location={location} onHover={onHover} />
    );
    const link = container.querySelector("a")!;

    fireEvent.mouseEnter(link);
    expect(onHover).toHaveBeenCalledWith("fairy-pools");

    fireEvent.mouseLeave(link);
    expect(onHover).toHaveBeenCalledWith(null);
  });
});
