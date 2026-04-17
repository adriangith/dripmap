"use client";

import { useState, useCallback, type CSSProperties } from "react";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/use-user-data";
import {
  ChevronRight,
  ChevronLeft,
  Users,
  MapPin,
  Sparkles,
  DollarSign,
  X,
  Minus,
  Plus,
  Check,
  Baby,
} from "lucide-react";
import type { PlaceType, FamilyComposition } from "@/lib/types";

type Step = "welcome" | "account" | "group" | "family" | "distance" | "interests" | "cost" | "summary";

const ALL_STEPS: Step[] = ["welcome", "account", "group", "family", "distance", "interests", "cost", "summary"];

function getVisibleSteps(group: string | null): Step[] {
  const needsFamily = group === "family" || group === "family-young" || group === "family-older";
  return needsFamily ? ALL_STEPS : ALL_STEPS.filter((s) => s !== "family");
}

const GROUP_OPTIONS = [
  { value: "solo", label: "Just me", emoji: "🚶" },
  { value: "adults", label: "With my partner", emoji: "👫" },
  { value: "family", label: "Family with kids", emoji: "👨‍👩‍👧‍👦" },
  { value: "friends", label: "With friends", emoji: "👯" },
] as const;

const DISTANCE_OPTIONS = [
  { value: "30min", label: "Close by", desc: "Under 30 min" },
  { value: "1hr", label: "Nearby", desc: "Under 1 hour" },
  { value: "2hr", label: "A bit of a drive", desc: "Under 2 hours" },
  { value: "daytrip", label: "Day trip", desc: "Worth the drive" },
  { value: "any", label: "Anywhere", desc: "No limit" },
] as const;

const TYPE_OPTIONS: { value: PlaceType; label: string; emoji: string }[] = [
  { value: "swim", label: "Swimming", emoji: "🏊" },
  { value: "beach", label: "Beaches", emoji: "🏖️" },
  { value: "walk", label: "Walks", emoji: "🚶" },
  { value: "bushwalk", label: "Bushwalks", emoji: "🌲" },
  { value: "waterfall", label: "Waterfalls", emoji: "💧" },
  { value: "lookout", label: "Lookouts", emoji: "👁️" },
  { value: "wildlife", label: "Wildlife", emoji: "🦘" },
  { value: "cycling", label: "Cycling", emoji: "🚴" },
  { value: "event", label: "Events", emoji: "🎪" },
  { value: "playground", label: "Playgrounds", emoji: "🎠" },
  { value: "museum", label: "Museums", emoji: "🏛️" },
  { value: "eatery", label: "Eateries", emoji: "🍴" },
  { value: "cave", label: "Caves", emoji: "🕳️" },
  { value: "fishing", label: "Fishing", emoji: "🎣" },
  { value: "pool", label: "Pools", emoji: "🏊‍♂️" },
];

const COST_OPTIONS = [
  { value: "free", label: "Free activities only", emoji: "🆓", desc: "Parks, beaches, free events" },
  { value: "affordable", label: "Budget-friendly", emoji: "💰", desc: "Under $20/person" },
  { value: "any", label: "Price doesn't matter", emoji: "💎", desc: "Show me everything" },
] as const;

const KID_AGE_LABELS: Record<number, string> = {
  0: "Under 1",
  1: "1 yr",
  2: "2 yrs",
  3: "3 yrs",
  4: "4 yrs",
  5: "5 yrs",
  6: "6 yrs",
  7: "7 yrs",
  8: "8 yrs",
  9: "9 yrs",
  10: "10 yrs",
  11: "11 yrs",
  12: "12 yrs",
  13: "13 yrs",
  14: "14 yrs",
  15: "15 yrs",
  16: "16 yrs",
  17: "17 yrs",
};

// ── Animation wrapper ──────────────────────────────────────────

type SlideDir = "left" | "right";

function StepTransition({
  stepKey,
  direction,
  children,
}: {
  stepKey: string;
  direction: SlideDir;
  children: React.ReactNode;
}) {
  // CSS animation class for slide-in, keyed by step to force remount
  const translateFrom = direction === "left" ? "60px" : "-60px";

  return (
    <div
      key={stepKey}
      className="animate-step-in"
      style={{ "--step-translate-from": translateFrom } as CSSProperties}
    >
      {children}
    </div>
  );
}

// ── Stepper (adults / kids counter) ────────────────────────────

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="text-blue-500">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-6 text-center font-semibold tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Kid age selector ───────────────────────────────────────────

function KidAgeSelector({
  index,
  age,
  onChange,
}: {
  index: number;
  age: number;
  onChange: (age: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Child {index + 1}
      </span>
      <select
        value={age}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
      >
        {Object.entries(KID_AGE_LABELS).map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Summary row ────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <p className="font-medium text-sm">{value}</p>
      </div>
      <button
        onClick={onEdit}
        className="text-xs text-blue-500 hover:text-blue-600 font-medium"
      >
        Edit
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { user, signIn } = useAuth();
  const { savePreferences, setOnboardingComplete } = useUserData();
  const [stepIndex, setStepIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<SlideDir>("left");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Preference state
  const [group, setGroup] = useState<string | null>(null);
  const [family, setFamily] = useState<FamilyComposition>({ adults: 2, kids: 1, kidAges: [5] });
  const [distance, setDistance] = useState<string>("any");
  const [interests, setInterests] = useState<Set<PlaceType>>(new Set());
  const [cost, setCost] = useState<string>("any");

  const steps = getVisibleSteps(group);
  const step = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const goTo = useCallback(
    (target: Step) => {
      const idx = steps.indexOf(target);
      if (idx === -1) return;
      setSlideDir(idx > stepIndex ? "left" : "right");
      setStepIndex(idx);
    },
    [steps, stepIndex],
  );

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setSlideDir("left");
      setStepIndex(stepIndex + 1);
    } else {
      // Save and finish
      const prefs: Record<string, unknown> = {};
      if (group) prefs.group = group;
      if (distance !== "any") prefs.distance = distance;
      if (cost !== "any") prefs.cost = cost;
      if (interests.size > 0) prefs.favoriteTypes = [...interests];
      if (group === "family" && family.kids > 0) {
        prefs.familyComposition = family;
      }

      savePreferences(prefs);
      setOnboardingComplete();
      onComplete();
    }
  }, [stepIndex, steps, group, distance, cost, interests, family, savePreferences, setOnboardingComplete, onComplete]);

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      setSlideDir("right");
      setStepIndex(stepIndex - 1);
    }
  }, [stepIndex]);

  const handleSkip = useCallback(() => {
    setOnboardingComplete();
    onComplete();
  }, [setOnboardingComplete, onComplete]);

  const handleSignIn = async (provider: "google" | "apple" | "facebook") => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signIn(provider);
      setSlideDir("left");
      setStepIndex((i) => i + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      if (!msg.includes("popup-closed") && !msg.includes("cancelled")) {
        setAuthError(msg);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const toggleInterest = (type: PlaceType) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const updateKidCount = useCallback(
    (count: number) => {
      setFamily((prev) => {
        const kidAges = [...prev.kidAges];
        while (kidAges.length < count) kidAges.push(5);
        while (kidAges.length > count) kidAges.pop();
        return { ...prev, kids: count, kidAges };
      });
    },
    [],
  );

  const updateKidAge = useCallback(
    (index: number, age: number) => {
      setFamily((prev) => {
        const kidAges = [...prev.kidAges];
        kidAges[index] = age;
        return { ...prev, kidAges };
      });
    },
    [],
  );

  // Summary helpers
  const groupLabel = GROUP_OPTIONS.find((o) => o.value === group)?.label ?? "Not set";
  const distanceLabel = DISTANCE_OPTIONS.find((o) => o.value === distance)?.label ?? "Anywhere";
  const costLabel = COST_OPTIONS.find((o) => o.value === cost)?.label ?? "Any";
  const interestLabels =
    interests.size > 0
      ? TYPE_OPTIONS.filter((o) => interests.has(o.value))
          .map((o) => o.label)
          .join(", ")
      : "None selected";

  const familySummary =
    group === "family" && family.kids > 0
      ? `${family.adults} adult${family.adults !== 1 ? "s" : ""}, ${family.kids} kid${family.kids !== 1 ? "s" : ""} (${family.kidAges.map((a) => KID_AGE_LABELS[a] ?? `${a}`).join(", ")})`
      : null;

  // Next button label
  const nextLabel =
    step === "summary"
      ? "Get started"
      : step === "account" && !user
        ? "Continue without account"
        : "Next";

  return (
    <div className="fixed inset-0 z-[90] bg-white dark:bg-gray-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top bar: back + skip */}
      <div className="flex items-center justify-between px-4 py-3">
        {stepIndex > 0 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleSkip}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Skip <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full overflow-y-auto">
        <StepTransition stepKey={step} direction={slideDir}>
          {step === "welcome" && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🌊</div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome to Drift</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                Discover beaches, walks, events, and hidden gems across Victoria.
                Let&apos;s personalise your experience.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Takes about 1 minute</p>
            </div>
          )}

          {step === "account" && (
            <div className="w-full space-y-4">
              <div className="text-center mb-2">
                <div className="text-5xl mb-3">🔄</div>
                <h2 className="text-xl font-bold">Sync across devices</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Sign in to save your bookmarks and preferences
                </p>
              </div>

              {user ? (
                <div className="text-center space-y-3 py-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Signed in as {user.displayName || user.email}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => handleSignIn("google")}
                    disabled={signingIn}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="font-medium">Continue with Google</span>
                  </button>

                  <button
                    onClick={() => handleSignIn("apple")}
                    disabled={signingIn}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span className="font-medium">Continue with Apple</span>
                  </button>

                  <button
                    onClick={() => handleSignIn("facebook")}
                    disabled={signingIn}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="font-medium">Continue with Facebook</span>
                  </button>

                  {authError && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">{authError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === "group" && (
            <div className="w-full space-y-4">
              <div className="text-center mb-2">
                <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h2 className="text-xl font-bold">Who&apos;s exploring?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  We&apos;ll tailor recommendations to your group
                </p>
              </div>
              <div className="space-y-2">
                {GROUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGroup(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                      group === opt.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="font-medium">{opt.label}</span>
                    {group === opt.value && (
                      <Check className="w-5 h-5 ml-auto text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "family" && (
            <div className="w-full space-y-4">
              <div className="text-center mb-2">
                <Baby className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h2 className="text-xl font-bold">Family details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Helps us find age-appropriate activities and estimate costs
                </p>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 divide-y divide-gray-100 dark:divide-gray-800">
                <Stepper
                  label="Adults"
                  value={family.adults}
                  min={1}
                  max={10}
                  onChange={(v) => setFamily((prev) => ({ ...prev, adults: v }))}
                  icon={<Users className="w-5 h-5" />}
                />
                <Stepper
                  label="Kids"
                  value={family.kids}
                  min={0}
                  max={10}
                  onChange={updateKidCount}
                  icon={<Baby className="w-5 h-5" />}
                />
              </div>

              {family.kids > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    How old are they?
                  </p>
                  {family.kidAges.map((age, i) => (
                    <KidAgeSelector
                      key={i}
                      index={i}
                      age={age}
                      onChange={(a) => updateKidAge(i, a)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "distance" && (
            <div className="w-full space-y-4">
              <div className="text-center mb-2">
                <MapPin className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h2 className="text-xl font-bold">How far will you go?</h2>
              </div>
              <div className="space-y-2">
                {DISTANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDistance(opt.value)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                      distance === opt.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "interests" && (
            <div className="w-full space-y-4">
              <div className="text-center mb-2">
                <Sparkles className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h2 className="text-xl font-bold">What interests you?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pick as many as you like</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleInterest(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-all ${
                      interests.has(opt.value)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "cost" && (
            <div className="w-full space-y-4">
              <div className="text-center mb-2">
                <DollarSign className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h2 className="text-xl font-bold">Budget preference</h2>
                {group === "family" && family.kids > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    For a group of {family.adults + family.kids}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                {COST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCost(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                      cost === opt.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <div className="text-left">
                      <span className="font-medium block">{opt.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</span>
                    </div>
                    {cost === opt.value && (
                      <Check className="w-5 h-5 ml-auto text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "summary" && (
            <div className="w-full space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold">You&apos;re all set!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Here&apos;s a summary — you can change these anytime in settings
                </p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl px-4">
                <SummaryRow label="Who" value={groupLabel} onEdit={() => goTo("group")} />
                {familySummary && (
                  <SummaryRow label="Family" value={familySummary} onEdit={() => goTo("family")} />
                )}
                <SummaryRow label="Distance" value={distanceLabel} onEdit={() => goTo("distance")} />
                <SummaryRow label="Interests" value={interestLabels} onEdit={() => goTo("interests")} />
                <SummaryRow label="Budget" value={costLabel} onEdit={() => goTo("cost")} />
              </div>
            </div>
          )}
        </StepTransition>
      </div>

      {/* Bottom: step dots + next button */}
      <div className="p-6 max-w-md mx-auto w-full space-y-4">
        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? "w-6 bg-blue-500"
                  : i < stepIndex
                    ? "w-1.5 bg-blue-300 dark:bg-blue-700"
                    : "w-1.5 bg-gray-300 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold transition-colors shadow-sm"
        >
          {nextLabel}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
