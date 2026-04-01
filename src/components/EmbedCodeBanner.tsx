import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { useDesign } from "../context/DesignContext";

/**
 * Generates embed snippets using the live design state (aspect ratio, height).
 * Must be rendered inside <DesignProvider>.
 */
export default function EmbedCodeBanner({
  mapId,
}: {
  mapId: string;
}) {
  const { design } = useDesign();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const origin = window.location.origin;
  const baseEmbedUrl = `${origin}/embed/${mapId}`;
  const embedUrl = design.enableDemoMode ? `${baseEmbedUrl}?demo=1` : baseEmbedUrl;
  const scriptUrl = `${origin}/embed.js`;

  const dataAttrs = [
    `data-co-map`,
    `data-ratio-desktop="${design.embedAspectRatio}"`,
    `data-ratio-mobile="${design.embedMobileAspectRatio}"`,
    `data-height="${design.embedHeight}"`,
    `data-height-unit="${design.embedHeightUnit}"`,
    ...(design.embedLayout === "sidebar-filter" && design.embedHeightUnit === "vh"
      ? [`data-vh-desktop="75"`, `data-vh-mobile="85"`]
      : []),
  ].join(" ");

  const fallbackHeightPx = design.embedHeightUnit === "auto"
    ? "600"
    : design.embedHeightUnit === "vh"
      ? String(Math.round((parseFloat(design.embedHeight) / 100) * 800))
      : design.embedHeight;

  const iframeTag = `<iframe src="${embedUrl}" ${dataAttrs} width="100%" height="${fallbackHeightPx}" frameborder="0" style="border:0;display:block" allowfullscreen></iframe>`;
  const embedCode = `${iframeTag}\n<script src="${scriptUrl}" defer><\/script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedIdx(0);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
      <SnippetRow
        label="Embed code (paste into WordPress)"
        value={embedCode}
        copied={copiedIdx === 0}
        onCopy={handleCopy}
      />
      <p className="text-[10px] text-gray-400">
        Desktop ratio {design.embedAspectRatio} · Mobile ratio {design.embedMobileAspectRatio}
        {design.embedHeightUnit !== "auto" && ` · Height ${design.embedHeight}${design.embedHeightUnit}`}
        {design.enableDemoMode && " · Auto-rotate enabled"}
      </p>
    </div>
  );
}

function SnippetRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <div className="flex gap-2">
        <textarea
          readOnly
          rows={2}
          value={value}
          className="flex-1 resize-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-mono text-gray-700 leading-relaxed"
          onFocus={(e) => e.target.select()}
        />
        <button
          onClick={onCopy}
          className="self-start rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {copied ? (
            <FontAwesomeIcon icon={faCheck} />
          ) : (
            <FontAwesomeIcon icon={faCopy} />
          )}
        </button>
      </div>
    </div>
  );
}
