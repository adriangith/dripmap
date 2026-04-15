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
      className="flex items-center gap-2 backdrop-blur-md bg-white/90 dark:bg-gray-900/90
                 rounded-2xl shadow-[var(--shadow-md)] border border-white/70 dark:border-gray-700/50
                 px-3 py-2 transition-all duration-150 hover:shadow-[var(--shadow-lg)] active:scale-[0.97]"
    >
      <div className="relative">
        <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
            {count}
          </span>
        )}
      </div>
      <span className="text-[13px] text-gray-700 dark:text-gray-300 max-w-[240px] truncate">
        {sentence}
      </span>
    </button>
  );
}
