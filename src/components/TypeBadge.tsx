import { Waves, Droplets, CloudRain, Sparkles, TreePine, type LucideIcon } from "lucide-react";
import type { LocationType } from "@/lib/types";

const TYPE_CONFIG: Record<LocationType, { icon: LucideIcon; label: string; color: string }> = {
  waterfall: { icon: Waves, label: "Waterfall", color: "text-blue-600" },
  "swimming-hole": { icon: Droplets, label: "Swimming Hole", color: "text-cyan-600" },
  "splash-pad": { icon: CloudRain, label: "Splash Pad", color: "text-violet-600" },
  spring: { icon: Sparkles, label: "Spring", color: "text-emerald-600" },
  creek: { icon: TreePine, label: "Creek", color: "text-teal-600" },
};

interface TypeBadgeProps {
  type: LocationType;
  showLabel?: boolean;
}

export default function TypeBadge({ type, showLabel = true }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="w-4 h-4" />
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </span>
  );
}
