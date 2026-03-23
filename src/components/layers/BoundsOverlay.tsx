import { useCallback, useMemo } from "react";
import { Rectangle, Marker } from "react-leaflet";
import L from "leaflet";
import type { PublicationBounds } from "../../types";

interface BoundsOverlayProps {
  publicationBounds?: PublicationBounds;
  onUpdatePublicationBounds?: (bounds: PublicationBounds) => void;
}

function cornerIcon(color: string) {
  return L.divIcon({
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    html: `<div style="width:12px;height:12px;border-radius:2px;background:${color};border:2px solid white;cursor:grab;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  });
}

function BoundsRect({
  bounds,
  color,
  label,
  onBoundsChange,
}: {
  bounds: [[number, number], [number, number]];
  color: string;
  label: string;
  onBoundsChange?: (bounds: [[number, number], [number, number]]) => void;
}) {
  const [[south, west], [north, east]] = bounds;

  const corners = useMemo<[number, number][]>(
    () => [
      [south, west], // SW - index 0
      [south, east], // SE - index 1
      [north, east], // NE - index 2
      [north, west], // NW - index 3
    ],
    [south, west, north, east],
  );

  const handleDrag = useCallback(
    (index: number, latlng: L.LatLng) => {
      if (!onBoundsChange) return;
      let newSouth = south, newWest = west, newNorth = north, newEast = east;
      switch (index) {
        case 0: // SW
          newSouth = latlng.lat;
          newWest = latlng.lng;
          break;
        case 1: // SE
          newSouth = latlng.lat;
          newEast = latlng.lng;
          break;
        case 2: // NE
          newNorth = latlng.lat;
          newEast = latlng.lng;
          break;
        case 3: // NW
          newNorth = latlng.lat;
          newWest = latlng.lng;
          break;
      }
      onBoundsChange([[newSouth, newWest], [newNorth, newEast]]);
    },
    [onBoundsChange, south, west, north, east],
  );

  const icon = useMemo(() => cornerIcon(color), [color]);

  const labelIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        iconSize: [60, 16],
        iconAnchor: [30, -4],
        html: `<div style="font-size:9px;font-weight:600;color:${color};text-align:center;text-shadow:0 0 3px white,0 0 3px white">${label}</div>`,
      }),
    [color, label],
  );

  return (
    <>
      <Rectangle
        bounds={[
          [south, west],
          [north, east],
        ]}
        pathOptions={{
          color,
          weight: 2,
          dashArray: "6,4",
          fillOpacity: 0.05,
          interactive: false,
        }}
      />
      {/* Label at top center */}
      <Marker
        position={[north, (west + east) / 2]}
        icon={labelIcon}
        interactive={false}
      />
      {/* Draggable corner handles */}
      {corners.map((pos, i) => (
        <Marker
          key={i}
          position={pos}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target as L.Marker;
              handleDrag(i, marker.getLatLng());
            },
          }}
        />
      ))}
    </>
  );
}

export default function BoundsOverlay({
  publicationBounds,
  onUpdatePublicationBounds,
}: BoundsOverlayProps) {
  const handleDesktopChange = useCallback(
    (bounds: [[number, number], [number, number]]) => {
      onUpdatePublicationBounds?.({
        ...publicationBounds,
        desktop: bounds,
      });
    },
    [publicationBounds, onUpdatePublicationBounds],
  );

  const handleMobileChange = useCallback(
    (bounds: [[number, number], [number, number]]) => {
      onUpdatePublicationBounds?.({
        ...publicationBounds,
        mobile: bounds,
      });
    },
    [publicationBounds, onUpdatePublicationBounds],
  );

  return (
    <>
      {publicationBounds?.desktop && (
        <BoundsRect
          bounds={publicationBounds.desktop}
          color="#3b82f6"
          label="Desktop"
          onBoundsChange={handleDesktopChange}
        />
      )}
      {publicationBounds?.mobile && (
        <BoundsRect
          bounds={publicationBounds.mobile}
          color="#ec4899"
          label="Mobile"
          onBoundsChange={handleMobileChange}
        />
      )}
    </>
  );
}
