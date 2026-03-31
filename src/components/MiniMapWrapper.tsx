"use client";

import dynamic from "next/dynamic";
import type { Coordinates } from "@/lib/types";

const MiniMap = dynamic(() => import("@/components/MiniMap"), { ssr: false });

interface MiniMapWrapperProps {
  coordinates: Coordinates;
  name: string;
}

export default function MiniMapWrapper({ coordinates, name }: MiniMapWrapperProps) {
  return <MiniMap coordinates={coordinates} name={name} />;
}
