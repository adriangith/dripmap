import {
  Waves, Droplets, Calendar, TreePine, Eye, Mountain,
  PawPrint, Droplet, Bike, Fish, UtensilsCrossed, ToyBrick, Footprints,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { PlaceType } from "@/lib/types";

const TYPE_CONFIG: Record<PlaceType, { icon: LucideIcon; label: string; color: string }> = {
  swim: { icon: Droplets, label: "Swim", color: "text-cyan-500/80" },
  beach: { icon: Waves, label: "Beach", color: "text-blue-400/80" },
  event: { icon: Calendar, label: "Event", color: "text-pink-400/80" },
  bushwalk: { icon: TreePine, label: "Bushwalk", color: "text-green-600/80" },
  walk: { icon: Footprints, label: "Walk", color: "text-amber-600/80" },
  lookout: { icon: Eye, label: "Lookout", color: "text-amber-500/80" },
  waterfall: { icon: Droplet, label: "Waterfall", color: "text-blue-500/80" },
  cave: { icon: Mountain, label: "Cave", color: "text-gray-500/80" },
  wildlife: { icon: PawPrint, label: "Wildlife", color: "text-orange-500/80" },
  pool: { icon: Waves, label: "Pool", color: "text-violet-500/80" },
  cycling: { icon: Bike, label: "Cycling", color: "text-lime-500/80" },
  fishing: { icon: Fish, label: "Fishing", color: "text-teal-500/80" },
  eatery: { icon: UtensilsCrossed, label: "Eatery", color: "text-pink-400/80" },
  playground: { icon: ToyBrick, label: "Playground", color: "text-emerald-400/80" },
  museum: { icon: Landmark, label: "Museum", color: "text-violet-500/80" },
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
