import type { EditorTab, DataLayerTab } from "../types";

interface DataTabBarProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  activeLayer: DataLayerTab;
  onLayerChange: (layer: DataLayerTab) => void;
}

export default function DataTabBar({
  activeTab,
  onTabChange,
  activeLayer,
  onLayerChange,
}: DataTabBarProps) {
  return (
    <div className="flex flex-col border-b border-gray-200 bg-white">
      {/* Top-level tabs: Preview | Data */}
      <div className="flex items-center px-4">
        {(["layout", "data"] as EditorTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative px-4 py-2.5 text-sm font-medium capitalize transition-colors focus:outline-none ${
              activeTab === tab
                ? "text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Sub-tabs: Regions | Points — only shown when Data tab is active */}
      {activeTab === "data" && (
        <div className="flex items-center gap-1 border-t border-gray-100 bg-gray-50 px-4 py-1.5">
          {(["regions", "points"] as DataLayerTab[]).map((layer) => (
            <button
              key={layer}
              onClick={() => onLayerChange(layer)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                activeLayer === layer
                  ? "bg-white text-blue-700 shadow-sm ring-1 ring-gray-200"
                  : "text-gray-500 hover:bg-white hover:text-gray-700"
              }`}
            >
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
