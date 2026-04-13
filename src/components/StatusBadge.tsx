import type { SiteStatus, WaterAccessStatus } from "@/lib/types";

type AllStatus = SiteStatus | WaterAccessStatus;

const STATUS_STYLES: Record<AllStatus, string> = {
  open: "bg-green-100 text-green-800",
  closed: "bg-red-100 text-red-800",
  seasonal: "bg-amber-100 text-amber-800",
  restricted: "bg-amber-100 text-amber-800",
  unknown: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<AllStatus, string> = {
  open: "Open",
  closed: "Closed",
  seasonal: "Seasonal",
  restricted: "Restricted",
  unknown: "Unknown",
};

interface StatusBadgeProps {
  status: SiteStatus | WaterAccessStatus;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
