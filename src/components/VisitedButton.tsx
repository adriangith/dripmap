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
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
        isVisited
          ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-600"
      }`}
      aria-label={isVisited ? "Mark as not visited" : "Mark as visited"}
    >
      <CircleCheck
        className={`w-5 h-5 ${isVisited ? "fill-green-600 text-white dark:fill-green-500" : ""}`}
      />
      <span className="text-sm font-medium">
        {isVisited ? "Visited" : "Been here?"}
      </span>
    </button>
  );
}
