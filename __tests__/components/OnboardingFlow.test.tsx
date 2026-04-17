import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockSavePreferences = vi.fn();
const mockSetOnboardingComplete = vi.fn();
const mockSignIn = vi.fn();

vi.mock("../../src/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    signIn: mockSignIn,
  }),
}));

vi.mock("../../src/lib/use-user-data", () => ({
  useUserData: () => ({
    savePreferences: mockSavePreferences,
    setOnboardingComplete: mockSetOnboardingComplete,
  }),
}));

const getOnboardingFlow = () =>
  import("../../src/components/OnboardingFlow").then((m) => m.default);

describe("OnboardingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders welcome step initially", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);
    expect(screen.getByText("Welcome to Drift")).toBeTruthy();
  });

  it("advances to account step on Next", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Sync across devices")).toBeTruthy();
  });

  it("shows back button after first step", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);
    // No back button on welcome
    expect(screen.queryByText("Back")).toBeNull();
    fireEvent.click(screen.getByText("Next"));
    // Back button on account step
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("goes back to previous step on Back", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);
    fireEvent.click(screen.getByText("Next")); // account
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Welcome to Drift")).toBeTruthy();
  });

  it("skip completes onboarding", async () => {
    const onComplete = vi.fn();
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Skip"));
    expect(mockSetOnboardingComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("shows family step when family group selected", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);
    // Navigate to group step: welcome → account → group
    fireEvent.click(screen.getByText("Next")); // account
    fireEvent.click(screen.getByText("Continue without account")); // group
    expect(screen.getByText("Who's exploring?")).toBeTruthy();

    // Select family
    fireEvent.click(screen.getByText("Family with kids"));
    fireEvent.click(screen.getByText("Next")); // family
    expect(screen.getByText("Family details")).toBeTruthy();
  });

  it("skips family step when non-family group selected", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);
    // Navigate to group step
    fireEvent.click(screen.getByText("Next")); // account
    fireEvent.click(screen.getByText("Continue without account")); // group

    // Select solo
    fireEvent.click(screen.getByText("Just me"));
    fireEvent.click(screen.getByText("Next")); // should skip family → distance
    expect(screen.getByText("How far will you go?")).toBeTruthy();
  });

  it("shows summary step before finishing", async () => {
    const onComplete = vi.fn();
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={onComplete} />);

    // Navigate through all steps (solo path — no family step)
    fireEvent.click(screen.getByText("Next")); // welcome → account
    fireEvent.click(screen.getByText("Continue without account")); // → group
    fireEvent.click(screen.getByText("Just me"));
    fireEvent.click(screen.getByText("Next")); // → distance
    fireEvent.click(screen.getByText("Next")); // → interests
    fireEvent.click(screen.getByText("Next")); // → cost
    fireEvent.click(screen.getByText("Next")); // → summary

    expect(screen.getByText("You're all set!")).toBeTruthy();
    expect(screen.getByText("Just me")).toBeTruthy(); // summary shows group choice
  });

  it("saves preferences and completes on Get started", async () => {
    const onComplete = vi.fn();
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={onComplete} />);

    // Navigate through all steps
    fireEvent.click(screen.getByText("Next")); // → account
    fireEvent.click(screen.getByText("Continue without account")); // → group
    fireEvent.click(screen.getByText("Just me"));
    fireEvent.click(screen.getByText("Next")); // → distance
    fireEvent.click(screen.getByText("Close by"));
    fireEvent.click(screen.getByText("Next")); // → interests
    fireEvent.click(screen.getByText("Next")); // → cost
    fireEvent.click(screen.getByText("Next")); // → summary
    fireEvent.click(screen.getByText("Get started")); // finish

    expect(mockSavePreferences).toHaveBeenCalledOnce();
    const savedPrefs = mockSavePreferences.mock.calls[0][0];
    expect(savedPrefs.group).toBe("solo");
    expect(savedPrefs.distance).toBe("30min");
    expect(mockSetOnboardingComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("saves family composition when family group selected", async () => {
    const onComplete = vi.fn();
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={onComplete} />);

    // Navigate to family flow
    fireEvent.click(screen.getByText("Next")); // → account
    fireEvent.click(screen.getByText("Continue without account")); // → group
    fireEvent.click(screen.getByText("Family with kids"));
    fireEvent.click(screen.getByText("Next")); // → family details

    // Default is 2 adults, 1 kid age 5 — just proceed
    fireEvent.click(screen.getByText("Next")); // → distance
    fireEvent.click(screen.getByText("Next")); // → interests
    fireEvent.click(screen.getByText("Next")); // → cost
    fireEvent.click(screen.getByText("Next")); // → summary
    fireEvent.click(screen.getByText("Get started")); // finish

    const savedPrefs = mockSavePreferences.mock.calls[0][0];
    expect(savedPrefs.group).toBe("family");
    expect(savedPrefs.familyComposition).toBeDefined();
    expect(savedPrefs.familyComposition.adults).toBe(2);
    expect(savedPrefs.familyComposition.kids).toBe(1);
    expect(savedPrefs.familyComposition.kidAges).toEqual([5]);
  });

  it("allows editing from summary step", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);

    // Navigate to summary (solo path)
    fireEvent.click(screen.getByText("Next")); // → account
    fireEvent.click(screen.getByText("Continue without account")); // → group
    fireEvent.click(screen.getByText("Just me"));
    fireEvent.click(screen.getByText("Next")); // → distance
    fireEvent.click(screen.getByText("Next")); // → interests
    fireEvent.click(screen.getByText("Next")); // → cost
    fireEvent.click(screen.getByText("Next")); // → summary

    // Click edit on "Who" row
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[0]); // first Edit button = Who
    expect(screen.getByText("Who's exploring?")).toBeTruthy();
  });

  it("shows cost group size hint for family groups", async () => {
    const OnboardingFlow = await getOnboardingFlow();
    render(<OnboardingFlow onComplete={() => {}} />);

    // Navigate to cost step with family
    fireEvent.click(screen.getByText("Next")); // → account
    fireEvent.click(screen.getByText("Continue without account")); // → group
    fireEvent.click(screen.getByText("Family with kids"));
    fireEvent.click(screen.getByText("Next")); // → family (2 adults + 1 kid)
    fireEvent.click(screen.getByText("Next")); // → distance
    fireEvent.click(screen.getByText("Next")); // → interests
    fireEvent.click(screen.getByText("Next")); // → cost

    expect(screen.getByText("For a group of 3")).toBeTruthy();
  });
});
