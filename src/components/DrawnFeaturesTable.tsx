import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapPin,
  faMinus,
  faDrawPolygon,
  faPencil,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import type { DrawnFeatureCollection, DrawnFeatureProperties } from "../types";

interface DrawnFeaturesTableProps {
  features: DrawnFeatureCollection;
  selectedFeatureId: string | null;
  onSelectFeature: (id: string) => void;
  onEditFeature: (id: string) => void;
  onDeleteFeature: (id: string) => void;
}

const FEATURE_ICON = {
  point: faMapPin,
  line: faMinus,
  polygon: faDrawPolygon,
} as const;

const FEATURE_LABEL = {
  point: "Point",
  line: "Line",
  polygon: "Region",
} as const;

export default function DrawnFeaturesTable({
  features,
  selectedFeatureId,
  onSelectFeature,
  onEditFeature,
  onDeleteFeature,
}: DrawnFeaturesTableProps) {
  if (features.features.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-gray-400 px-6">
        <FontAwesomeIcon icon={faDrawPolygon} className="text-2xl text-gray-300" />
        <p>No drawn features yet.</p>
        <p className="text-xs">
          Use the drawing toolbar on the map to add points, lines, or regions.
        </p>
      </div>
    );
  }

  const colorSwatch = (props: DrawnFeatureProperties) => (
    <span
      className="inline-block h-3 w-3 rounded-full border border-white/50 ring-1 ring-gray-300"
      style={{ backgroundColor: props.featureType === "polygon" ? props.fillColor : props.color }}
    />
  );

  return (
    <div className="custom-scrollbar h-full overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-3 w-10"></th>
            <th className="px-4 py-3">Label</th>
            <th className="hidden px-4 py-3 md:table-cell">Type</th>
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {features.features.map((feature) => {
            const p = feature.properties;
            const isSelected = p.id === selectedFeatureId;
            const Icon = FEATURE_ICON[p.featureType];
            return (
              <tr
                key={p.id}
                onClick={() => onSelectFeature(p.id)}
                className={`cursor-pointer transition-colors hover:bg-gray-50
                  ${isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-300" : ""}`}
              >
                {/* Color swatch */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center">
                    {colorSwatch(p)}
                  </div>
                </td>

                {/* Label + description */}
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {p.label || <span className="italic text-gray-400">Unlabeled</span>}
                  </div>
                  {p.description && (
                    <div className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                      {p.description}
                    </div>
                  )}
                </td>

                {/* Type badge */}
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    <FontAwesomeIcon icon={Icon} className="text-[10px]" />
                    {FEATURE_LABEL[p.featureType]}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditFeature(p.id); }}
                      title="Edit feature"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                    >
                      <FontAwesomeIcon icon={faPencil} className="text-xs" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteFeature(p.id); }}
                      title="Delete feature"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
