import type { LayerData, DataRow, PointData } from "../types";
import { COLORADO_COUNTIES } from "../data/coloradoCounties";

// ── Convert LayerData rows → PointData[] for map display ─────

export function layerDataToPoints(layer: LayerData): PointData[] {
  if (layer.rows.length === 0 || layer.columns.length === 0) return [];

  const { columns, rows, columnMappings } = layer;

  // Find columns by role
  const nameCol = columns.find((c) => columnMappings[c] === "name");
  const groupCol = columns.find((c) => columnMappings[c] === "group");
  const iconCol = columns.find((c) => columnMappings[c] === "icon");
  const imageCol = columns.find((c) => columnMappings[c] === "image");
  const addressCol = columns.find((c) => columnMappings[c] === "address");
  const urlCol = columns.find((c) => columnMappings[c] === "url");
  const metaCols = columns.filter((c) => columnMappings[c] === "metadata");
  const geoCols = columns.filter((c) => columnMappings[c] === "geometry");

  // Detect lat/lng columns among geometry-mapped columns
  let latCol: string | undefined;
  let lngCol: string | undefined;
  for (const col of geoCols) {
    const lower = col.toLowerCase();
    if (lower.includes("lat")) latCol = col;
    else if (lower.includes("lng") || lower.includes("lon")) lngCol = col;
  }

  const points: PointData[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    let lat: number | undefined;
    let lng: number | undefined;

    if (latCol && lngCol) {
      lat = parseFloat(row[latCol]);
      lng = parseFloat(row[lngCol]);
    } else if (geoCols.length === 1) {
      // Try parsing "lat, lng" format
      const parts = (row[geoCols[0]] ?? "").split(",").map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        lat = parts[0];
        lng = parts[1];
      }
    }

    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) continue;

    points.push({
      id: row._rowId ?? `row-${i}`,
      title: nameCol ? (row[nameCol] ?? "") : "",
      category: groupCol ? (row[groupCol] ?? "") : "",
      description: metaCols.map((c) => row[c] ?? "").filter(Boolean).join(" · "),
      address: addressCol ? (row[addressCol] ?? "") : "",
      imageUrl: imageCol ? (row[imageCol] ?? "") : "",
      url: urlCol ? (row[urlCol] ?? "") : "",
      lat,
      lng,
      icon: iconCol ? (row[iconCol] ?? undefined) : undefined,
    });
  }

  return points;
}

// ── Default county regions (preloaded for every map) ─────────

let _defaultCountyRegions: LayerData | null = null;

export function defaultCountyRegions(): LayerData {
  if (_defaultCountyRegions) return _defaultCountyRegions;

  const columns = ["County", "Value"];
  const rows: DataRow[] = COLORADO_COUNTIES.features.map((f, i) => ({
    _rowId: `county-${i}`,
    County: (f.properties as { name: string }).name,
    Value: "",
  }));

  _defaultCountyRegions = {
    columns,
    rows,
    columnMappings: { County: "name", Value: "value" },
  };
  return _defaultCountyRegions;
}

// ── Starter: Single Point ────────────────────────────────────

export function singlePointStarter(): LayerData {
  return {
    columns: ["Name", "Latitude", "Longitude", "Category", "Description"],
    rows: [
      {
        _rowId: "sp-1",
        Name: "Colorado State Capitol",
        Latitude: "39.7393",
        Longitude: "-104.9848",
        Category: "Government",
        Description: "Seat of Colorado state government, Denver",
      },
    ],
    columnMappings: {
      Name: "name",
      Latitude: "geometry",
      Longitude: "geometry",
      Category: "group",
      Description: "metadata",
    },
  };
}

// ── Starter: Categorized Points ──────────────────────────────

export function categorizedPointsStarter(): LayerData {
  const columns = ["Name", "Latitude", "Longitude", "Category", "Description"];
  const rows: DataRow[] = [
    { _rowId: "cp-1", Name: "Civic Center Park", Latitude: "39.7375", Longitude: "-104.9886", Category: "Parks & Recreation", Description: "Downtown Denver park" },
    { _rowId: "cp-2", Name: "Denver City Hall", Latitude: "39.7392", Longitude: "-104.9847", Category: "Government", Description: "Municipal government offices" },
    { _rowId: "cp-3", Name: "University of Denver", Latitude: "39.6773", Longitude: "-104.9615", Category: "Education", Description: "Private research university" },
    { _rowId: "cp-4", Name: "Denver Health", Latitude: "39.7265", Longitude: "-104.9978", Category: "Healthcare", Description: "Public hospital and clinic network" },
    { _rowId: "cp-5", Name: "Red Rocks Amphitheatre", Latitude: "39.6654", Longitude: "-105.2058", Category: "Arts & Culture", Description: "Outdoor concert venue in Morrison" },
    { _rowId: "cp-6", Name: "Garden of the Gods", Latitude: "38.8733", Longitude: "-104.8691", Category: "Parks & Recreation", Description: "Public park in Colorado Springs" },
    { _rowId: "cp-7", Name: "Air Force Academy", Latitude: "38.9983", Longitude: "-104.8613", Category: "Education", Description: "U.S. military academy near CO Springs" },
    { _rowId: "cp-8", Name: "UCHealth Memorial", Latitude: "38.8363", Longitude: "-104.8247", Category: "Healthcare", Description: "Hospital in Colorado Springs" },
    { _rowId: "cp-9", Name: "Fort Collins City Hall", Latitude: "40.5887", Longitude: "-105.0753", Category: "Government", Description: "City government offices" },
    { _rowId: "cp-10", Name: "Horsetooth Reservoir", Latitude: "40.5437", Longitude: "-105.1697", Category: "Parks & Recreation", Description: "Popular reservoir near Fort Collins" },
    { _rowId: "cp-11", Name: "Colorado Mesa University", Latitude: "39.0806", Longitude: "-108.5413", Category: "Education", Description: "Public university in Grand Junction" },
    { _rowId: "cp-12", Name: "Mesa Mall", Latitude: "39.0728", Longitude: "-108.5641", Category: "Business", Description: "Regional shopping center" },
    { _rowId: "cp-13", Name: "Durango & Silverton Railroad", Latitude: "37.2753", Longitude: "-107.8801", Category: "Arts & Culture", Description: "Historic narrow-gauge railroad" },
    { _rowId: "cp-14", Name: "Purgatory Resort", Latitude: "37.6307", Longitude: "-107.8142", Category: "Parks & Recreation", Description: "Ski resort north of Durango" },
    { _rowId: "cp-15", Name: "Pueblo Riverwalk", Latitude: "38.2664", Longitude: "-104.6095", Category: "Arts & Culture", Description: "Riverfront district in Pueblo" },
  ];

  return {
    columns,
    rows,
    columnMappings: {
      Name: "name",
      Latitude: "geometry",
      Longitude: "geometry",
      Category: "group",
      Description: "metadata",
    },
  };
}

// ── Starter: Color-coded Regions ─────────────────────────────

export function colorCodedRegionsStarter(): LayerData {
  const base = defaultCountyRegions();
  // Fill in sample values (population density proxy)
  const sampleValues: Record<string, string> = {
    Adams: "523", Arapahoe: "643", Boulder: "350", Broomfield: "2200",
    Denver: "4500", Douglas: "490", "El Paso": "380", Jefferson: "720",
    Larimer: "142", Mesa: "47", Pueblo: "95", Weld: "82",
    "La Plata": "35", Eagle: "22", Summit: "18", Pitkin: "15",
    Garfield: "29", Routt: "12", Gunnison: "4", Chaffee: "11",
  };

  const rows = base.rows.map((r) => ({
    ...r,
    Value: sampleValues[r.County] ?? String(Math.floor(Math.random() * 30) + 1),
  }));

  return { ...base, rows };
}

export type StarterType = "single-point" | "categorized-points" | "color-coded-regions";
