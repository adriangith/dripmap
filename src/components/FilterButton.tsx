"use client";

import { SlidersHorizontal } from "lucide-react";
import { generateSentence, activeFilterCount } from "@/lib/sentence";
import type { Filters, Constraints } from "@/lib/types";

interface FilterButtonProps {
  filters: Filters;
  constraints: Constraints;
  onClick: () => void;
}

export default function FilterButton({ filters, constraints, onClick }: FilterButtonProps) {
  const count = activeFilterCount(filters, constraints);
  const sentence = generateSentence(filters, constraints);

  return (
    <button
      onClick={onClick}
      aria-label="Open filter preferences"
      aria-haspopup="dialog"
      className="flex items-start gap-2 backdrop-blur-md bg-white/85 dark:bg-gray-900/85
                 rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/60
                 px-3 py-2 lg:px-4 lg:py-2.5 transition-all hover:shadow-xl active:scale-[0.98]"
    >
      <div className="relative mt-0.5">
        <SlidersHorizontal className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 dark:text-gray-300" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 lg:w-4 lg:h-4 bg-blue-600 text-white text-[9px] lg:text-[10px] font-bold rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
      </div>
      <span className="text-sm lg:text-base text-gray-700 dark:text-gray-300 max-w-[25rem] lg:max-w-[32.5rem] text-left">
        {sentence}
      </span>
    </button>
  );
}
