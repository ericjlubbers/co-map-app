import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";

/**
 * LOD (Level-of-Detail) zoom thresholds per feature type.
 * Features are only rendered when the current zoom >= their threshold.
 */
export const LOD_THRESHOLDS = {
  motorway: 0,    // always visible
  trunk: 0,       // always visible
  primary: 7,
  secondary: 9,
  tertiary: 11,
  stream: 13,
  park: 9,
  lake: 7,
} as const;

export type LODFeatureType = keyof typeof LOD_THRESHOLDS;

/** Hook that tracks current zoom level for LOD filtering. */
export function useZoom(): number {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });
  return zoom;
}
