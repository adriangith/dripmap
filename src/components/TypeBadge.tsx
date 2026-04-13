import {
  Waves, Droplets, Calendar, TreePine, Eye, Mountain,
  PawPrint, Droplet, Bike, Fish, UtensilsCrossed, ToyBrick, Footprints,
  type LucideIcon,
} from "lucide-react";
import type { PlaceType } from "@/lib/types";

const TYPE_CONFIG: Record<PlaceType, { icon: LucideIcon; label: string; color: string }> = {
  swim: { icon: Droplets, label: "Swim", color: "text-cyan-600" },
  beach: { icon: Waves, label: "Beach", color: "text-blue-500" },
  event: { icon: Calendar, label: "Event", color: "text-pink-600" },
  bushwalk: { icon: TreePine, label: "Bushwalk", color: "text-green-700" },
  walk: { icon: Footprints, label: "Walk", color: "text-amber-700" },
  lookout: { icon: Eye, label: "Lookout", color: "text-amber-600" },
  waterfall: { icon: Droplet, label: "Waterfall", color: "text-blue-700" },
  cave: { icon: Mountain, label: "Cave", color: "text-gray-600" },
  wildlife: { icon: PawPrint, label: "Wildlife", color: "text-orange-600" },
  pool: { icon: Waves, label: "Pool", color: "text-violet-600" },
  cycling: { icon: Bike, label: "Cycling", color: "text-lime-600" },
  fishing: { icon: Fish, label: "Fishing", color: "text-teal-600" },
  eatery: { icon: UtensilsCrossed, label: "Eatery", color: "text-pink-500" },
  playground: { icon: ToyBrick, label: "Playground", color: "text-emerald-500" },
};

interface TypeBadgeProps {
  type: PlaceType;
  showLabel?: boolean;
}

export default function TypeBadge({ type, showLabel = true }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="w-4 h-4" />
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </span>
  );
}
