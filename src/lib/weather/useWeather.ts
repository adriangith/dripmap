"use client";

import { useContext } from "react";
import { WeatherContext } from "./WeatherProvider";
import type { WeatherContextValue } from "./types";

export function useWeather(): WeatherContextValue {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    throw new Error("useWeather must be used inside <WeatherProvider>");
  }
  return ctx;
}
