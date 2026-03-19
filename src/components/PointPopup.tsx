import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDirections, faGlobe } from "@fortawesome/free-solid-svg-icons";
import type { PointData } from "../types";
import { getCategoryInfo } from "../config";

interface Props {
  point: PointData;
}

export default function PointPopup({ point }: Props) {
  const catInfo = getCategoryInfo(point.category);

  return (
    <div className="min-w-[220px] max-w-[280px]">
      {/* Thumbnail (from image column or legacy imageUrl) */}
      {point.imageUrl && (
        <div className="mb-2 overflow-hidden rounded-lg">
          <img
            src={point.imageUrl}
            alt={point.title}
            className="h-32 w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Title with optional icon */}
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold leading-tight text-gray-900">
        {point.icon && (
          <FontAwesomeIcon icon={point.icon as never} className="shrink-0 text-xs" style={{ color: catInfo.color }} />
        )}
        {point.title}
      </h3>

      {/* Category badge */}
      <span
        className="mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: catInfo.bgColor, color: catInfo.color }}
      >
        {point.category}
      </span>

      {/* Description */}
      <p className="mb-2 text-xs leading-relaxed text-gray-600">
        {point.description}
      </p>

      {/* Address */}
      <p className="mb-2 text-xs text-gray-500">{point.address}</p>

      {/* Actions */}
      <div className="flex gap-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          <FontAwesomeIcon icon={faDirections} className="text-[10px]" />
          Directions
        </a>
        {point.url && (
          <a
            href={point.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <FontAwesomeIcon icon={faGlobe} className="text-[10px]" />
            Website
          </a>
        )}
      </div>
    </div>
  );
}
