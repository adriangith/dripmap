import type { SiteStatus } from "@/lib/types";

type BadgeStatus = SiteStatus | "restricted" | string;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-400 ring-1 ring-green-200/60 dark:ring-green-800/40",
  closed: "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400 ring-1 ring-red-200/60 dark:ring-red-800/40",
  seasonal: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-1 ring-amber-200/60 dark:ring-amber-800/40",
  restricted: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-1 ring-amber-200/60 dark:ring-amber-800/40",
  unknown: "bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400 ring-1 ring-gray-200/60 dark:ring-gray-700/40",
};

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
