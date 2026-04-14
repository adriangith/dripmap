import type { SiteStatus } from "@/lib/types";

type BadgeStatus = SiteStatus | "restricted" | string;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  closed: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  seasonal: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  restricted: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  unknown: "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
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
