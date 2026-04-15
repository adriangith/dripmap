"use client";

import { CircleCheck } from "lucide-react";
import { useUserData } from "@/lib/use-user-data";

interface VisitedButtonProps {
  slug: string;
}

export default function VisitedButton({ slug }: VisitedButtonProps) {
  const { visited, toggleVisited } = useUserData();
  const isVisited = visited.includes(slug);

  return (
    <button
      onClick={() => toggleVisited(slug)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-150 ${
        isVisited
          ? "bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 shadow-[var(--shadow-xs)]"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/50 dark:hover:bg-green-950/30"
      }`}
      aria-label={isVisited ? "Mark as not visited" : "Mark as visited"}
    >
      <CircleCheck
        className={`w-4 h-4 ${isVisited ? "fill-green-600 text-white dark:fill-green-500" : ""}`}
      />
      <span className="text-[13px] font-medium">
        {isVisited ? "Visited" : "Been here?"}
      </span>
    </button>
  );
}
