import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <Compass className="w-16 h-16 text-blue-200 dark:text-blue-600 mb-6 animate-pulse" />
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
      <p className="text-gray-400 dark:text-gray-500 mb-8 max-w-sm text-[15px]">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-150"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to map
      </Link>
    </div>
  );
}
