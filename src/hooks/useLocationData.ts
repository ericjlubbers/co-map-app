import { useState, useEffect } from "react";
import type { PointData } from "../types";
import { seedLocations } from "../data/seedLocations";

// This hook abstracts the data source.
// Currently returns static seed data.
// To swap to a live Google Sheets CSV fetch later, replace the body of this hook.

export function useLocationData() {
  const [data, setData] = useState<PointData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate a brief load to exercise loading states
    const timer = setTimeout(() => {
      try {
        setData(seedLocations);
        setLoading(false);
      } catch {
        setError("Failed to load location data.");
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const retry = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setData(seedLocations);
      setLoading(false);
    }, 400);
  };

  return { data, loading, error, retry };
}
