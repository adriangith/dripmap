import type { SiteStatus } from "@/lib/types";

type BadgeStatus = SiteStatus | "restricted" | string;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  seasonal: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  restricted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  unknown: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
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
