import Link from "next/link";
import { Droplets, Search, Info } from "lucide-react";

interface HeaderProps {
  onSearchClick?: () => void;
  showSearch?: boolean;
}

export default function Header({ onSearchClick, showSearch = true }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 z-50 relative">
      <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold text-lg">
        <Droplets className="w-6 h-6" />
        <span>dripmap</span>
      </Link>
      <nav className="flex items-center gap-3">
        {showSearch && onSearchClick && (
          <button
            onClick={onSearchClick}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="Search locations"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
        <Link
          href="/about"
          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          aria-label="About dripmap"
        >
          <Info className="w-5 h-5" />
        </Link>
      </nav>
    </header>
  );
}
