import { useState, useCallback } from "react";
import type { PointData } from "../types";
import { seedLocations } from "../data/seedLocations";

/**
 * useLocationData — manages local point data state.
 *
 * Starts empty by default. Call `loadExampleData()` to populate with
 * the built-in seed locations, or `clearData()` to reset.
 */
export function useLocationData() {
  const [data, setData] = useState<PointData[]>([]);

  const loadExampleData = useCallback(() => {
    setData(seedLocations);
  }, []);

  const clearData = useCallback(() => {
    setData([]);
  }, []);

  return { data, setData, loadExampleData, clearData };
}
