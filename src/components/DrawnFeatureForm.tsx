import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faCheck } from "@fortawesome/free-solid-svg-icons";
import type { DrawnFeatureProperties } from "../types";

interface DrawnFeatureFormProps {
  /** "create" opens with blank/defaults; "edit" pre-fills with existing props */
  mode: "create" | "edit";
  featureType: DrawnFeatureProperties["featureType"];
  initial: DrawnFeatureProperties;
  onSave: (updates: Partial<DrawnFeatureProperties>) => void;
  onCancel: () => void;
}

export default function DrawnFeatureForm({
  mode,
  featureType,
  initial,
  onSave,
  onCancel,
}: DrawnFeatureFormProps) {
  const [label, setLabel] = useState(initial.label);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState(initial.color);
  const [fillColor, setFillColor] = useState(initial.fillColor);
  const [fillOpacity, setFillOpacity] = useState(initial.fillOpacity);
  const [weight, setWeight] = useState(initial.weight);
  const [dashArray, setDashArray] = useState(initial.dashArray);
  const [opacity, setOpacity] = useState(initial.opacity);

  useEffect(() => {
    setLabel(initial.label);
    setDescription(initial.description);
    setColor(initial.color);
    setFillColor(initial.fillColor);
    setFillOpacity(initial.fillOpacity);
    setWeight(initial.weight);
    setDashArray(initial.dashArray);
    setOpacity(initial.opacity);
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ label, description, color, fillColor, fillOpacity, weight, dashArray, opacity });
  };

  const title =
    mode === "create"
      ? `New ${featureType === "point" ? "Point" : featureType === "line" ? "Line" : "Region"}`
      : `Edit ${featureType === "point" ? "Point" : featureType === "line" ? "Line" : "Region"}`;

  return (
    <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-black/30">
      <div className="w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          {/* Label */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional label"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Color row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {featureType === "polygon" ? "Stroke Color" : "Color"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="w-20">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Opacity
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Line/polygon-specific */}
          {featureType !== "point" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Weight (px)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Dash pattern
                </label>
                <input
                  type="text"
                  value={dashArray}
                  onChange={(e) => setDashArray(e.target.value)}
                  placeholder="e.g. 5,5"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Polygon fill */}
          {featureType === "polygon" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Fill Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={fillColor}
                    onChange={(e) => setFillColor(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Fill Opacity
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={fillOpacity}
                  onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faCheck} />
              {mode === "create" ? "Add to Map" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
