"use client";

import { Bookmark } from "lucide-react";
import { useUserData } from "@/lib/use-user-data";

interface BookmarkButtonProps {
  slug: string;
}

export default function BookmarkButton({ slug }: BookmarkButtonProps) {
  const { bookmarks, toggleBookmark } = useUserData();
  const bookmarked = bookmarks.includes(slug);

  return (
    <button
      onClick={() => toggleBookmark(slug)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-150 ${
        bookmarked
          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-[var(--shadow-xs)]"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
      }`}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this location"}
    >
      <Bookmark
        className={`w-4 h-4 ${bookmarked ? "fill-blue-600" : ""}`}
      />
      <span className="text-[13px] font-medium">
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </span>
    </button>
  );
}
