
import { BucketItem } from "../types";

// --- EXISTING CURATED DATA (Kept for quality) ---
const CURATED_ITEMS: BucketItem[] = [
  // --- INDIA: TEMPLES & SPIRITUAL ---
  {
    id: "ind-t-1",
    title: "Darshan at Tirupati Balaji",
    description: "Seek blessings at the Sri Venkateswara Temple, located in the hill town of Tirumala.",
    locationName: "Tirumala, Andhra Pradesh",
    coordinates: { latitude: 13.6833, longitude: 79.3472 },
    category: "Culture",
    interests: ["Temple", "Spiritual", "Pilgrimage"],
    completed: false,
    createdAt: Date.now() - 100000000
  },
  {
    id: "ind-t-2",
    title: "Meenakshi Amman Temple",
    description: "Marvel at the colorful gopurams of this historic Hindu temple on the southern bank of the Vaigai River.",
    locationName: "Madurai, Tamil Nadu",
    coordinates: { latitude: 9.9195, longitude: 78.1193 },
    category: "Culture",
    interests: ["Temple", "Architecture", "History"],
    completed: false,
    createdAt: Date.now() - 99000000
  },
  {
    id: "ind-t-3",
    title: "Ganga Aarti at Kashi Vishwanath",
    description: "Experience the spiritual energy of the Ganga Aarti and visit one of the 12 Jyotirlingas.",
    locationName: "Varanasi, Uttar Pradesh",
    coordinates: { latitude: 25.3109, longitude: 83.0107 },
    category: "Culture",
    interests: ["Spiritual", "River", "History"],
    completed: false,
    createdAt: Date.now() - 98000000
  },
  {
    id: "ind-t-4",
    title: "Golden Temple (Harmandir Sahib)",
    description: "Visit the holiest Gurdwara of Sikhism and participate in the Langar.",
    locationName: "Amritsar, Punjab",
    coordinates: { latitude: 31.6200, longitude: 74.8765 },
    category: "Culture",
    interests: ["Spiritual", "Peace", "Community"],
    completed: true,
    createdAt: Date.now() - 97000000
  },
  {
    id: "ind-t-5",
    title: "Konark Sun Temple",
    description: "Explore the 13th-century temple designed as a chariot of the Sun God.",
    locationName: "Konark, Odisha",
    coordinates: { latitude: 19.8876, longitude: 86.0945 },
    category: "Culture",
    interests: ["Architecture", "History", "Unesco"],
    completed: false,
    createdAt: Date.now() - 96000000
  },
  // --- USA: LANDMARKS ---
  {
    id: "usa-l-1",
    title: "Statue of Liberty",
    description: "Take the ferry to Liberty Island.",
    locationName: "New York, NY",
    coordinates: { latitude: 40.6892, longitude: -74.0445 },
    category: "Travel",
    interests: ["Iconic", "History", "Boat"],
    completed: false,
    createdAt: Date.now() - 50000000
  },
  {
    id: "usa-l-2",
    title: "Golden Gate Bridge",
    description: "Walk or bike across the bridge.",
    locationName: "San Francisco, CA",
    coordinates: { latitude: 37.8199, longitude: -122.4783 },
    category: "Travel",
    interests: ["Architecture", "Views", "Iconic"],
    completed: true,
    createdAt: Date.now() - 49000000
  },
  {
    id: "usa-l-3",
    title: "Mount Rushmore",
    description: "See the presidents carved into the Black Hills.",
    locationName: "Keystone, SD",
    coordinates: { latitude: 43.8791, longitude: -103.4591 },
    category: "Travel",
    interests: ["History", "Monument", "Mountains"],
    completed: false,
    createdAt: Date.now() - 48000000
  },
  {
    id: "usa-n-1",
    title: "Grand Canyon South Rim",
    description: "Watch the sunset at Mather Point.",
    locationName: "Arizona",
    coordinates: { latitude: 36.0544, longitude: -112.1401 },
    category: "Nature",
    interests: ["Views", "Hiking", "Wonder"],
    completed: false,
    createdAt: Date.now() - 38000000
  },
  {
    id: "usa-f-1",
    title: "Beignets at Cafe Du Monde",
    description: "Eat powdered sugar donuts and chicory coffee.",
    locationName: "New Orleans, LA",
    coordinates: { latitude: 29.9574, longitude: -90.0618 },
    category: "Food",
    interests: ["Sweet", "Coffee", "Jazz"],
    completed: false,
    createdAt: Date.now() - 23000000
  }
];

// --- GENERATOR DATA POOLS ---

const CITIES = [
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, country: "Japan" },
  { name: "Paris", lat: 48.8566, lng: 2.3522, country: "France" },
  { name: "London", lat: 51.5074, lng: -0.1278, country: "UK" },
  { name: "Rome", lat: 41.9028, lng: 12.4964, country: "Italy" },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, country: "Australia" },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, country: "Brazil" },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241, country: "South Africa" },
  { name: "Bangkok", lat: 13.7563, lng: 100.5018, country: "Thailand" },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, country: "UAE" },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, country: "Turkey" },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, country: "Singapore" },
  { name: "Barcelona", lat: 41.3851, lng: 2.1734, country: "Spain" },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041, country: "Netherlands" },
  { name: "Seoul", lat: 37.5665, lng: 126.9780, country: "South Korea" },
  { name: "Prague", lat: 50.0755, lng: 14.4378, country: "Czech Republic" },
  { name: "Kyoto", lat: 35.0116, lng: 135.7681, country: "Japan" },
  { name: "Santorini", lat: 36.3932, lng: 25.4615, country: "Greece" },
  { name: "Cairo", lat: 30.0444, lng: 31.2357, country: "Egypt" },
  { name: "Bali", lat: -8.4095, lng: 115.1889, country: "Indonesia" },
  { name: "Machu Picchu", lat: -13.1631, lng: -72.5450, country: "Peru" },
  { name: "Venice", lat: 45.4408, lng: 12.3155, country: "Italy" },
  { name: "Vienna", lat: 48.2082, lng: 16.3738, country: "Austria" },
  { name: "Lisbon", lat: 38.7223, lng: -9.1393, country: "Portugal" },
  { name: "Toronto", lat: 43.6532, lng: -79.3832, country: "Canada" },
  { name: "Buenos Aires", lat: -34.6037, lng: -58.3816, country: "Argentina" }
];

const ACTIVITIES = [
  { verb: "Visit the", noun: "History Museum", cat: "Culture", tags: ["History", "Learning"] },
  { verb: "Try the street food in", noun: "Downtown", cat: "Food", tags: ["Food", "Spicy"] },
  { verb: "Go hiking near", noun: "National Park", cat: "Adventure", tags: ["Hiking", "Nature"] },
  { verb: "Take a sunset photo at", noun: "Observation Deck", cat: "Travel", tags: ["Photography", "Views"] },
  { verb: "Relax at the", noun: "Royal Spa", cat: "Luxury", tags: ["Relax", "Wellness"] },
  { verb: "Shop at the", noun: "Grand Bazaar", cat: "Travel", tags: ["Shopping", "Local"] },
  { verb: "Attend a concert in", noun: "Opera House", cat: "Culture", tags: ["Music", "Art"] },
  { verb: "Walk across the", noun: "Old Bridge", cat: "Travel", tags: ["Architecture", "Walk"] },
  { verb: "Explore the ancient", noun: "Ruins", cat: "Adventure", tags: ["History", "Ruins"] },
  { verb: "Drink coffee at", noun: "City Center Cafe", cat: "Food", tags: ["Coffee", "Cafe"] },
  { verb: "Go skydiving over", noun: "The Coast", cat: "Adventure", tags: ["Extreme", "Flying"] },
  { verb: "Take a cooking class in", noun: "Culinary School", cat: "Food", tags: ["Cooking", "Learning"] },
  { verb: "Meditate at", noun: "Peace Garden", cat: "Personal Growth", tags: ["Peace", "Mindfulness"] },
  { verb: "Run a marathon in", noun: "City Streets", cat: "Personal Growth", tags: ["Running", "Fitness"] },
  { verb: "Stay at a luxury hotel in", noun: "Downtown", cat: "Luxury", tags: ["Hotel", "Comfort"] }
];

// Helper to generate a random coordinate offset (approx within 10-20km of city center)
const randomOffset = () => (Math.random() - 0.5) * 0.2; 

const generateItem = (index: number): BucketItem => {
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
  
  return {
    id: `gen-${index}`,
    title: `${activity.verb} ${city.name} ${activity.noun}`,
    description: `A must-do experience: ${activity.verb.toLowerCase()} the famous ${activity.noun.toLowerCase()} while visiting ${city.name}, ${city.country}.`,
    locationName: `${city.name}, ${city.country}`,
    coordinates: {
      latitude: city.lat + randomOffset(),
      longitude: city.lng + randomOffset()
    },
    category: activity.cat,
    interests: [...activity.tags, city.country],
    completed: Math.random() > 0.8, // 20% chance of being completed
    createdAt: Date.now() - Math.floor(Math.random() * 1000000000)
  };
};

export const generateMockItems = (): BucketItem[] => {
  const generated: BucketItem[] = [];
  // Generate ~950 items to reach approx 1000 total with curated ones
  for (let i = 0; i < 950; i++) {
    generated.push(generateItem(i));
  }
  return [...CURATED_ITEMS, ...generated];
};

export const MOCK_BUCKET_ITEMS = generateMockItems();
