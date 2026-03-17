/** GeoJSON feature CRUD helpers for drawn map features */

import type {
  DrawnFeature,
  DrawnFeatureCollection,
  DrawnFeatureProperties,
} from '../types';

// ── ID generation ────────────────────────────────────────────

export function generateFeatureId(): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `df_${Date.now()}_${rand}`;
}

// ── Default properties ───────────────────────────────────────

export function defaultProps(
  featureType: DrawnFeatureProperties['featureType'],
): DrawnFeatureProperties {
  const isPolygon = featureType === 'polygon';
  return {
    id: generateFeatureId(),
    label: '',
    featureType,
    color: isPolygon ? '#3b82f6' : '#ef4444',
    weight: 3,
    dashArray: '',
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    opacity: 1,
    description: '',
  };
}

// ── Feature constructors ─────────────────────────────────────

export function createPointFeature(
  lat: number,
  lng: number,
  props: Partial<DrawnFeatureProperties> = {},
): DrawnFeature {
  const base = defaultProps('point');
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { ...base, ...props, id: props.id ?? base.id, featureType: 'point' },
  };
}

export function createLineFeature(
  latlngs: [number, number][],
  props: Partial<DrawnFeatureProperties> = {},
): DrawnFeature {
  const base = defaultProps('line');
  const coordinates: [number, number][] = latlngs.map(([lat, lng]) => [lng, lat]);
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: { ...base, ...props, id: props.id ?? base.id, featureType: 'line' },
  };
}

export function createPolygonFeature(
  latlngs: [number, number][],
  props: Partial<DrawnFeatureProperties> = {},
): DrawnFeature {
  const base = defaultProps('polygon');
  const ring: [number, number][] = latlngs.map(([lat, lng]) => [lng, lat]);
  // Close the ring if open
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push(first);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: { ...base, ...props, id: props.id ?? base.id, featureType: 'polygon' },
  };
}

// ── Collection CRUD ──────────────────────────────────────────

export function emptyCollection(): DrawnFeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

export function addFeature(
  collection: DrawnFeatureCollection,
  feature: DrawnFeature,
): DrawnFeatureCollection {
  return { ...collection, features: [...collection.features, feature] };
}

export function updateFeature(
  collection: DrawnFeatureCollection,
  id: string,
  updates: Partial<DrawnFeatureProperties>,
): DrawnFeatureCollection {
  return {
    ...collection,
    features: collection.features.map((f) =>
      f.properties.id === id
        ? { ...f, properties: { ...f.properties, ...updates } }
        : f,
    ),
  };
}

export function deleteFeature(
  collection: DrawnFeatureCollection,
  id: string,
): DrawnFeatureCollection {
  return {
    ...collection,
    features: collection.features.filter((f) => f.properties.id !== id),
  };
}
