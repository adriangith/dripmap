"use client";

import { useState, useCallback } from "react";
import { useUserData } from "@/lib/use-user-data";
import { ChevronRight, Users, MapPin, Sparkles, DollarSign, X } from "lucide-react";
import type { PlaceType } from "@/lib/types";

type Step = "welcome" | "group" | "distance" | "interests" | "cost" | "done";

const STEPS: Step[] = ["welcome", "group", "distance", "interests", "cost"];

const GROUP_OPTIONS = [
  { value: "solo", label: "Just me", emoji: "🚶" },
  { value: "adults", label: "With my partner", emoji: "👫" },
  { value: "family-young", label: "Family (young kids)", emoji: "👶" },
  { value: "family-older", label: "Family (older kids)", emoji: "👨‍👩‍👧‍👦" },
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
  { value: "free", label: "Free stuff", emoji: "🆓" },
  { value: "affordable", label: "Budget-friendly", emoji: "💰" },
  { value: "any", label: "Price doesn't matter", emoji: "💎" },
] as const;

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { savePreferences, setOnboardingComplete } = useUserData();
  const [stepIndex, setStepIndex] = useState(0);

  const [group, setGroup] = useState<string | null>(null);
  const [distance, setDistance] = useState<string>("any");
  const [interests, setInterests] = useState<Set<PlaceType>>(new Set());
  const [cost, setCost] = useState<string>("any");

  const step = STEPS[stepIndex];

  const handleNext = useCallback(() => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      // Save and finish
      const prefs: Record<string, unknown> = {};
      if (group) prefs.group = group;
      if (distance !== "any") prefs.distance = distance;
      if (cost !== "any") prefs.cost = cost;
      if (interests.size > 0) prefs.favoriteTypes = [...interests];

      savePreferences(prefs);
      setOnboardingComplete();
      onComplete();
    }
  }, [stepIndex, group, distance, cost, interests, savePreferences, setOnboardingComplete, onComplete]);

  const handleSkip = useCallback(() => {
    setOnboardingComplete();
    onComplete();
  }, [setOnboardingComplete, onComplete]);

  const toggleInterest = (type: PlaceType) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[90] bg-white dark:bg-gray-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Skip <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        {step === "welcome" && (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-2">🌊</div>
            <h1 className="text-2xl font-bold">Welcome to Drift</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover beaches, walks, events, and hidden gems across Victoria.
              Let&apos;s personalise your experience.
            </p>
          </div>
        )}

        {step === "group" && (
          <div className="w-full space-y-4">
            <div className="text-center mb-2">
              <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <h2 className="text-xl font-bold">Who&apos;s exploring?</h2>
            </div>
            <div className="space-y-2">
              {GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGroup(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    group === opt.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
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
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                    distance === opt.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-colors ${
                    interests.has(opt.value)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
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
              <h2 className="text-xl font-bold">Budget preference?</h2>
            </div>
            <div className="space-y-2">
              {COST_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCost(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    cost === opt.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="p-6 max-w-md mx-auto w-full">
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
        >
          {stepIndex === STEPS.length - 1 ? "Get started" : "Next"}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
