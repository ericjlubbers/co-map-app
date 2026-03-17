import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapPin,
  faMinus,
  faDrawPolygon,
  faArrowPointer,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { DrawingMode } from "../types";

interface DrawingToolbarProps {
  activeMode: DrawingMode | null;
  onModeChange: (mode: DrawingMode | null) => void;
}

interface ToolButton {
  mode: DrawingMode;
  icon: typeof faMapPin;
  label: string;
  title: string;
}

const TOOLS: ToolButton[] = [
  { mode: "point",   icon: faMapPin,       label: "Point",   title: "Drop a point marker" },
  { mode: "line",    icon: faMinus,        label: "Line",    title: "Draw a line — click vertices, double-click to finish" },
  { mode: "polygon", icon: faDrawPolygon,  label: "Region",  title: "Sketch a region — click vertices, double-click to close" },
  { mode: "select",  icon: faArrowPointer, label: "Select",  title: "Select a drawn feature to edit" },
  { mode: "delete",  icon: faTrash,        label: "Delete",  title: "Click a drawn feature to remove it" },
];

const MODE_HINTS: Record<DrawingMode, string> = {
  point:   "Click anywhere on the map to place a point",
  line:    "Click to add vertices — double-click to finish",
  polygon: "Click to add vertices — double-click to close",
  select:  "Click a drawn feature to edit its properties",
  delete:  "Click a drawn feature to delete it",
};

export default function DrawingToolbar({ activeMode, onModeChange }: DrawingToolbarProps) {
  const handleToolClick = (mode: DrawingMode) => {
    onModeChange(activeMode === mode ? null : mode);
  };

  return (
    <div className="absolute left-3 top-1/2 z-[1000] -translate-y-1/2 flex flex-col gap-1">
      {/* Tool buttons */}
      <div className="flex flex-col gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
        {TOOLS.map(({ mode, icon, label, title }) => (
          <button
            key={mode}
            onClick={() => handleToolClick(mode)}
            title={title}
            className={`flex items-center gap-2 rounded px-2.5 py-2 text-xs font-medium transition-colors
              ${activeMode === mode
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <FontAwesomeIcon icon={icon} className="w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Active mode hint + cancel */}
      {activeMode && (
        <div className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50 p-2 shadow-md">
          <p className="text-[11px] leading-snug text-blue-700">
            {MODE_HINTS[activeMode]}
          </p>
          <button
            onClick={() => onModeChange(null)}
            className="flex items-center gap-1 self-end rounded px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
