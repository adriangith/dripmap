import type { SiteStatus } from "@/lib/types";

type BadgeStatus = SiteStatus | "restricted" | string;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  closed: "bg-red-100 text-red-800",
  seasonal: "bg-amber-100 text-amber-800",
  restricted: "bg-amber-100 text-amber-800",
  unknown: "bg-gray-100 text-gray-600",
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
