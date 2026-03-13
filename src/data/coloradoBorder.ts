import type { Feature, Polygon } from "geojson";

// Colorado state border (approximate rectangle matching county extremes)
const CO_BORDER: [number, number][] = [
  [-109.060, 41.003],
  [-102.042, 41.003],
  [-102.042, 36.993],
  [-109.060, 36.993],
  [-109.060, 41.003], // close ring
];

export const COLORADO_BORDER: Feature<Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [CO_BORDER],
  },
};

// Mask polygon: large bounding box with Colorado cut out (hole)
// Used to fade everything outside the state border
const WORLD_BOX: [number, number][] = [
  [-130, 20],
  [-80, 20],
  [-80, 55],
  [-130, 55],
  [-130, 20], // close ring
];

// Hole is wound in opposite direction (clockwise for GeoJSON holes)
const CO_HOLE: [number, number][] = [
  [-109.060, 41.003],
  [-109.060, 36.993],
  [-102.042, 36.993],
  [-102.042, 41.003],
  [-109.060, 41.003], // close ring
];

export const COLORADO_MASK: Feature<Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [WORLD_BOX, CO_HOLE],
  },
};
