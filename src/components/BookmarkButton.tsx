"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { isBookmarked, addBookmark, removeBookmark } from "@/lib/bookmarks";

interface BookmarkButtonProps {
  slug: string;
}

export default function BookmarkButton({ slug }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(slug));
  }, [slug]);

  const toggle = () => {
    if (bookmarked) {
      removeBookmark(slug);
    } else {
      addBookmark(slug);
    }
    setBookmarked(!bookmarked);
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
        bookmarked
          ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600"
      }`}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this location"}
    >
      <Bookmark
        className={`w-5 h-5 ${bookmarked ? "fill-blue-600" : ""}`}
      />
      <span className="text-sm font-medium">
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </span>
    </button>
  );
}
