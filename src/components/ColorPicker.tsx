import { useState, useRef, useEffect, useCallback } from "react";

// ── Carbon Design System Data Visualization Palettes ────────────────
// https://carbondesignsystem.com/data-visualization/color-palettes/

export const CARBON_CATEGORICAL = [
  "#6929c4", "#1192e8", "#005d5d", "#9f1853", "#fa4d56",
  "#570408", "#198038", "#002d9c", "#ee538b", "#b28600",
  "#009d9a", "#012749", "#8a3800", "#a56eff",
];

const PALETTES: { name: string; colors: string[] }[] = [
  {
    name: "Categorical",
    colors: CARBON_CATEGORICAL.slice(0, 10),
  },
  {
    name: "Blue",
    colors: ["#edf5ff", "#a6c8ff", "#4589ff", "#0f62fe", "#002d9c"],
  },
  {
    name: "Teal",
    colors: ["#d9fbfb", "#3ddbd9", "#009d9a", "#005d5d", "#022b30"],
  },
  {
    name: "Purple",
    colors: ["#f6f2ff", "#d4bbff", "#a56eff", "#6929c4", "#31135e"],
  },
  {
    name: "Red",
    colors: ["#fff1f1", "#ffb3b8", "#fa4d56", "#da1e28", "#750e13"],
  },
  {
    name: "Cyan",
    colors: ["#e5f6ff", "#82cfff", "#1192e8", "#0043ce", "#001141"],
  },
  {
    name: "Green",
    colors: ["#defbe6", "#6fdc8c", "#24a148", "#198038", "#044317"],
  },
  {
    name: "Magenta",
    colors: ["#fff0f7", "#ffafd2", "#ee5396", "#9f1853", "#510224"],
  },
  {
    name: "Gray",
    colors: ["#f4f4f4", "#c6c6c6", "#8d8d8d", "#525252", "#161616"],
  },
];

// ── Color Conversion Utilities ──────────────────────────────────────

interface HSV {
  h: number; // 0–360
  s: number; // 0–1
  v: number; // 0–1
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  const n = parseInt(c.length >= 6 ? c.slice(0, 6) : c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
  );
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, v };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hexToHsv(hex: string): HSV {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

function hsvToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

// ── Color Picker Component ──────────────────────────────────────────

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [flipUp, setFlipUp] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Determine if popover should flip upward
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setFlipUp(spaceBelow < 360);
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5"
      >
        <div
          className="h-6 w-6 rounded border border-gray-300 cursor-pointer"
          style={{ backgroundColor: value }}
        />
        <span className="text-xs text-gray-500 font-mono">{value}</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={`absolute right-0 z-50 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-xl ${
            flipUp ? "bottom-8" : "top-8"
          }`}
        >
          <ColorPickerPanel value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/** Inline panel version (used inside popovers or directly embedded). */
export function ColorPickerPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(value);

  // Sync when external value changes
  useEffect(() => {
    const newHsv = hexToHsv(value);
    setHsv(newHsv);
    setHexInput(value);
  }, [value]);

  const updateFromHsv = useCallback(
    (newHsv: HSV) => {
      setHsv(newHsv);
      const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
      setHexInput(hex);
      onChange(hex);
    },
    [onChange],
  );

  const handleHexCommit = useCallback(
    (raw: string) => {
      const clean = raw.startsWith("#") ? raw : `#${raw}`;
      if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
        setHexInput(clean);
        setHsv(hexToHsv(clean));
        onChange(clean);
      }
    },
    [onChange],
  );

  const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);

  const handleRgbChange = useCallback(
    (channel: "r" | "g" | "b", val: number) => {
      const clamped = Math.max(0, Math.min(255, val));
      const nr = channel === "r" ? clamped : r;
      const ng = channel === "g" ? clamped : g;
      const nb = channel === "b" ? clamped : b;
      const hex = rgbToHex(nr, ng, nb);
      setHexInput(hex);
      setHsv(rgbToHsv(nr, ng, nb));
      onChange(hex);
    },
    [r, g, b, onChange],
  );

  return (
    <div className="space-y-2.5">
      {/* SV gradient field */}
      <SatValField hue={hsv.h} sat={hsv.s} val={hsv.v} onChange={(s, v) => updateFromHsv({ ...hsv, s, v })} />

      {/* Hue strip */}
      <HueStrip hue={hsv.h} onChange={(h) => updateFromHsv({ ...hsv, h })} />

      {/* Hex + RGB inputs */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">#</span>
          <input
            type="text"
            value={hexInput.replace("#", "")}
            onChange={(e) => setHexInput(`#${e.target.value}`)}
            onBlur={(e) => handleHexCommit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleHexCommit((e.target as HTMLInputElement).value)}
            maxLength={6}
            className="w-[52px] rounded border border-gray-200 px-1 py-0.5 text-[11px] font-mono text-gray-700"
          />
        </div>
        <RgbInput label="R" value={r} onChange={(v) => handleRgbChange("r", v)} />
        <RgbInput label="G" value={g} onChange={(v) => handleRgbChange("g", v)} />
        <RgbInput label="B" value={b} onChange={(v) => handleRgbChange("b", v)} />
      </div>

      {/* Palettes */}
      <div className="max-h-36 space-y-1.5 overflow-y-auto">
        {PALETTES.map((p) => (
          <div key={p.name}>
            <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400">{p.name}</span>
            <div className="mt-0.5 flex flex-wrap gap-0.5">
              {p.colors.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setHsv(hexToHsv(c));
                    setHexInput(c);
                    onChange(c);
                  }}
                  className={`h-4 w-4 rounded-sm border transition-transform hover:scale-125 ${
                    value.toLowerCase() === c.toLowerCase() ? "border-gray-800 ring-1 ring-gray-800" : "border-gray-200"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Saturation / Value gradient field ───────────────────────────────

function SatValField({
  hue,
  sat,
  val,
  onChange,
}: {
  hue: number;
  sat: number;
  val: number;
  onChange: (s: number, v: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      onChange(x, 1 - y);
    },
    [onChange],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => { if (dragging.current) update(e); };
    const handleUp = () => { dragging.current = false; };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [update]);

  const pureColor = hsvToHex(hue, 1, 1);

  return (
    <div
      ref={canvasRef}
      className="relative h-32 w-full cursor-crosshair rounded"
      style={{ backgroundColor: pureColor }}
      onMouseDown={(e) => {
        dragging.current = true;
        update(e);
      }}
    >
      {/* White → transparent left-to-right */}
      <div className="absolute inset-0 rounded" style={{ background: "linear-gradient(to right, white, transparent)" }} />
      {/* Transparent → black top-to-bottom */}
      <div className="absolute inset-0 rounded" style={{ background: "linear-gradient(to bottom, transparent, black)" }} />
      {/* Thumb */}
      <div
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${sat * 100}%`,
          top: `${(1 - val) * 100}%`,
          boxShadow: "0 0 2px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

// ── Hue strip ───────────────────────────────────────────────────────

function HueStrip({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const rect = stripRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onChange(x * 360);
    },
    [onChange],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => { if (dragging.current) update(e); };
    const handleUp = () => { dragging.current = false; };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [update]);

  return (
    <div
      ref={stripRef}
      className="relative h-3 w-full cursor-pointer rounded"
      style={{
        background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
      }}
      onMouseDown={(e) => {
        dragging.current = true;
        update(e);
      }}
    >
      <div
        className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${(hue / 360) * 100}%`,
          boxShadow: "0 0 2px rgba(0,0,0,0.5)",
          backgroundColor: hsvToHex(hue, 1, 1),
        }}
      />
    </div>
  );
}

// ── Small numeric input ─────────────────────────────────────────────

function RgbInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center">
      <input
        type="number"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-8 rounded border border-gray-200 px-0.5 py-0.5 text-center text-[11px] font-mono text-gray-700"
      />
      <span className="text-[9px] text-gray-400">{label}</span>
    </div>
  );
}
