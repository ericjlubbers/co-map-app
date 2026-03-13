import type { PointData } from "../types";

// 150 generated locations within Colorado's borders.
// Biased toward population centers (Denver metro, Colorado Springs, Fort Collins,
// Pueblo, Grand Junction) with spread across rural areas.

const CATEGORIES = [
  "Parks & Recreation",
  "Government",
  "Education",
  "Healthcare",
  "Dining",
  "Arts & Culture",
  "Business",
  "Community",
];

// Seeded pseudo-random number generator for deterministic output
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

// Population center clusters with approximate lat/lng and radius
const CLUSTERS = [
  { name: "Denver", lat: 39.7392, lng: -104.9903, radius: 0.15, weight: 40 },
  { name: "Colorado Springs", lat: 38.8339, lng: -104.8214, radius: 0.1, weight: 20 },
  { name: "Fort Collins", lat: 40.5853, lng: -105.0844, radius: 0.08, weight: 12 },
  { name: "Pueblo", lat: 38.2544, lng: -104.6091, radius: 0.07, weight: 8 },
  { name: "Grand Junction", lat: 39.0639, lng: -108.5506, radius: 0.07, weight: 8 },
  { name: "Boulder", lat: 40.015, lng: -105.2705, radius: 0.06, weight: 10 },
  { name: "Durango", lat: 37.2753, lng: -107.88, radius: 0.06, weight: 5 },
  { name: "Steamboat Springs", lat: 40.485, lng: -106.8317, radius: 0.05, weight: 4 },
  { name: "Glenwood Springs", lat: 39.5505, lng: -107.3248, radius: 0.05, weight: 4 },
  { name: "Trinidad", lat: 37.1694, lng: -104.5008, radius: 0.05, weight: 3 },
  { name: "Alamosa", lat: 37.4695, lng: -105.87, radius: 0.05, weight: 3 },
  { name: "Craig", lat: 40.5152, lng: -107.5464, radius: 0.05, weight: 2 },
  { name: "Rural", lat: 39.0, lng: -106.0, radius: 1.8, weight: 31 },
];

// Title templates per category
const TITLES: Record<string, string[]> = {
  "Parks & Recreation": [
    "Summit Trail Outpost", "Elk Meadow Park", "Cottonwood Creek Trail",
    "Aspen Grove Recreation Area", "Red Rock Canyon Park", "Pine Ridge Open Space",
    "Wildflower Nature Preserve", "Bear Creek Trailhead", "Eagle's Nest Park",
    "Columbine Meadows", "Riverside Recreation Center", "Falcon Crest Open Space",
    "Ponderosa Trail System", "Silver Lake State Park", "Thunder Ridge Trail",
    "Cedar Point Nature Area", "Juniper Hills Park", "Clearwater Recreation Area",
    "Lookout Mountain Trail", "Bighorn Canyon Preserve",
  ],
  Government: [
    "County Administration Building", "City Hall Annex", "Municipal Services Center",
    "Clerk & Recorder Office", "DMV Regional Office", "County Courthouse",
    "Public Works Department", "Water District Office", "Regional Planning Office",
    "Fire Station 12", "Sheriff's Substation", "Town Hall",
    "Community Development Office", "Tax Assessor Office", "District Court Annex",
    "Permit & Licensing Center", "Emergency Management Office", "Post Office",
    "Federal Building", "County Health Dept",
  ],
  Education: [
    "Mountain View Elementary", "Valley High School", "Prairie Learning Center",
    "Summit Community College", "Frontier STEM Academy", "Heritage Middle School",
    "Sunrise Charter School", "Aspire Academy", "Western Slope University",
    "Pathfinder Montessori", "Canyon Ridge High", "Meadowlark Elementary",
    "Innovation Lab School", "Pioneer Technical Institute", "Blue Sky Preschool",
    "Ridgeline Preparatory", "Crestview School District", "Summit Learning Hub",
    "Mesa Academy", "Riverstone School",
  ],
  Healthcare: [
    "Mountain Medical Center", "Valley Health Clinic", "Prairie Family Practice",
    "Summit Urgent Care", "Regional Hospital", "Community Health Center",
    "Sunrise Dental Group", "Peak Physical Therapy", "Western Wellness Center",
    "Canyon Creek Eye Care", "Alpine Mental Health", "Evergreen Pediatrics",
    "Frontier Women's Health", "Mesa Orthopedics", "Rocky Mountain Pharmacy",
    "Clear Creek Chiropractic", "Timberline Veterinary", "High Plains Dermatology",
    "Gateway Rehabilitation", "Pikes Peak Family Medicine",
  ],
  Dining: [
    "The Rustic Plate", "Mountain Brew Café", "Valley Bistro & Bar",
    "Elk Horn Steakhouse", "The Hungry Miner", "Aspen Leaf Kitchen",
    "Blue Spruce Diner", "Trailhead Taqueria", "Summit Sushi Bar",
    "Prairie Fire BBQ", "The Golden Pick Saloon", "Ridgeline Roasters",
    "Mesa Verde Cantina", "Snowcap Ice Cream Parlor", "The Broken Spoke Grill",
    "Creekside Café", "The Silver Fork", "Basecamp Burgers",
    "Pinecone Bakery", "The Copper Kettle",
  ],
  "Arts & Culture": [
    "Mountain Heritage Museum", "Valley Art Gallery", "Prairie Wind Theater",
    "Summit Sculpture Park", "Western History Center", "Aspen Cultural Center",
    "Blue Mesa Gallery", "Pioneer Arts Collective", "Canyon Music Hall",
    "Frontier Film Society", "High Country Photography Studio",
    "The Painted Desert Gallery", "Rocky Mountain Artisan Market",
    "Silversmith Studio", "Red Rocks Music Venue", "Heritage Quilt Museum",
    "Mesa Arts Center", "River Walk Gallery", "Wildflower Studio",
    "The Creative Space",
  ],
  Business: [
    "Summit Tech Solutions", "Mountain Realty Group", "Valley Insurance Partners",
    "Peak Performance Consulting", "Frontier Financial Advisors",
    "Rocky Mountain Accounting", "Western Digital Marketing", "Alpine Law Group",
    "Trailhead Coworking Space", "Mesa Business Center", "Ridgeline Engineering",
    "Pikes Peak Properties", "Elevation Architecture Firm", "Blue Sky Solar Co",
    "Canyon Creek Construction", "Timberline Web Design", "Prairie Wind Energy",
    "High Plains Logistics", "Gateway Import/Export", "The Innovation Hub",
  ],
  Community: [
    "Community Center", "Veterans Memorial Hall", "Senior Resource Center",
    "Youth Development Center", "Neighborhood Association", "Food Bank & Pantry",
    "Animal Shelter", "Community Garden", "Volunteer Fire Dept",
    "Historical Society", "Rotary Club Meeting Hall", "Lions Club Community Room",
    "Family Support Services", "Community Library", "Cultural Exchange Center",
    "Immigrant Resource Center", "Housing Assistance Office", "Job Training Center",
    "Substance Recovery Center", "Community Foundation",
  ],
};

const STREETS = [
  "Main St", "Oak Ave", "Elm St", "Pine Rd", "Maple Dr", "Cedar Ln",
  "Spruce Way", "Aspen St", "Willow Ct", "Birch Blvd", "Summit Rd",
  "Mountain View Dr", "Valley Rd", "Prairie Ln", "Canyon Dr", "Mesa Ave",
  "Ridgeline Way", "Peak St", "Trail Blvd", "Creek Rd", "River Dr",
  "Lake Ave", "Forest Ln", "Meadow Dr", "Highland Rd",
];

const TOWNS = [
  "Denver", "Colorado Springs", "Fort Collins", "Pueblo", "Grand Junction",
  "Boulder", "Durango", "Steamboat Springs", "Glenwood Springs", "Trinidad",
  "Alamosa", "Craig", "Salida", "Buena Vista", "Leadville", "Silverton",
  "Telluride", "Ouray", "Cortez", "Montrose", "Delta", "Rifle",
  "Vail", "Breckenridge", "Estes Park", "Loveland", "Longmont",
  "Lakewood", "Aurora", "Thornton", "Westminster", "Arvada",
];

const DESCRIPTIONS = [
  "Serving the local community with dedication since 1985.",
  "A cornerstone of the neighborhood, offering essential services.",
  "Located in the heart of downtown with easy access from the highway.",
  "Family-friendly destination with something for everyone.",
  "Open year-round with seasonal programs and events.",
  "Recently renovated with modern amenities and accessibility features.",
  "Award-winning establishment recognized for excellence.",
  "A hidden gem tucked away in the scenic Colorado landscape.",
  "Community-driven organization focused on sustainable growth.",
  "Popular spot for locals and visitors alike.",
  "Offering world-class experiences with a small-town feel.",
  "Historic landmark that has served generations of Coloradans.",
  "State-of-the-art facility with cutting-edge technology.",
  "Nestled in the foothills with stunning mountain views.",
  "Committed to making a positive impact on the community.",
];

function pickCluster(): (typeof CLUSTERS)[number] {
  const totalWeight = CLUSTERS.reduce((sum, c) => sum + c.weight, 0);
  let r = rand() * totalWeight;
  for (const cluster of CLUSTERS) {
    r -= cluster.weight;
    if (r <= 0) return cluster;
  }
  return CLUSTERS[CLUSTERS.length - 1];
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function generateLocation(index: number): PointData {
  const category = CATEGORIES[index % CATEGORIES.length];
  const titles = TITLES[category];
  const titleIndex = Math.floor(rand() * titles.length);
  const title = titles[titleIndex];

  const cluster = pickCluster();
  const angle = rand() * Math.PI * 2;
  const dist = rand() * cluster.radius;
  const lat = clamp(cluster.lat + Math.cos(angle) * dist, 37.0, 41.0);
  const lng = clamp(cluster.lng + Math.sin(angle) * dist * 1.3, -109.05, -102.05);

  const streetNum = Math.floor(rand() * 9000) + 100;
  const street = STREETS[Math.floor(rand() * STREETS.length)];
  const town = TOWNS[Math.floor(rand() * TOWNS.length)];
  const zip = 80000 + Math.floor(rand() * 2000);

  const description = DESCRIPTIONS[Math.floor(rand() * DESCRIPTIONS.length)];

  return {
    id: `loc-${String(index + 1).padStart(3, "0")}`,
    title,
    imageUrl: `https://picsum.photos/seed/co${index + 1}/200/200`,
    category,
    description,
    address: `${streetNum} ${street}, ${town}, CO ${zip}`,
    url: `https://example.com/location/${index + 1}`,
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
  };
}

export const seedLocations: PointData[] = Array.from({ length: 150 }, (_, i) =>
  generateLocation(i)
);
