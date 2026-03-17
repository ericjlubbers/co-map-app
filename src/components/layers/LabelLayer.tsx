import { useEffect } from "react";
import { TileLayer } from "react-leaflet";
import { useDesign } from "../../context/DesignContext";
import { getTileConfig } from "../../config";

// Google Fonts that can be used for label overlays / city layer
const GOOGLE_FONT_URLS: Record<string, string> = {
  "Libre Franklin": "https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600&display=swap",
  "Atkinson Hyperlegible": "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap",
  "Plus Jakarta Sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600&display=swap",
};

/**
 * LabelLayer — renders the labels-only tile overlay above all other map layers
 * and injects the selected label font from Google Fonts (if applicable).
 *
 * Mount this *last* inside <MapContainer> so it sits on top.
 */
export default function LabelLayer() {
  const { design } = useDesign();
  const tileConfig = getTileConfig(design.tilePreset);

  // Inject Google Font for the label font selection
  const targetFont = design.labelFont === "inherit" ? design.fontFamily : design.labelFont;
  useEffect(() => {
    const fontUrl = GOOGLE_FONT_URLS[targetFont];
    if (!fontUrl) return;

    const linkId = `gf-label-${targetFont.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(linkId)) return; // already loaded

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);

    return () => {
      // Leave the font loaded — removing it could break other parts of the UI
    };
  }, [targetFont]);

  if (!design.showLabels || !tileConfig.labelsUrl) return null;

  return (
    <TileLayer
      key={`${design.tilePreset}-labels`}
      url={tileConfig.labelsUrl}
      maxZoom={tileConfig.maxZoom}
      // Render in the overlay pane so labels always appear above feature layers
      pane="overlayPane"
    />
  );
}
