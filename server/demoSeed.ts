import { db } from "./db";
import { venues, events, eventArtists } from "@shared/schema";
import { eq } from "drizzle-orm";
import { normalizeName } from "./feedService";

const DEMO_VENUES = [
  // ── Brisbane Inner ───────────────────────────────────────────────────────
  { name: "The Triffid", suburb: "Newstead", city: "Brisbane", state: "QLD", lat: -27.4526, lng: 153.0444 },
  { name: "Fortitude Music Hall", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4582, lng: 153.0336 },
  { name: "The Tivoli", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4616, lng: 153.0331 },
  { name: "Crowbar Brisbane", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4598, lng: 153.0341 },
  { name: "The Princess Theatre", suburb: "Woolloongabba", city: "Brisbane", state: "QLD", lat: -27.4882, lng: 153.0361 },
  { name: "Black Bear Lodge", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4562, lng: 153.0348 },
  { name: "The Zoo", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4572, lng: 153.0332 },
  { name: "Lefty's Old Time Music Hall", suburb: "Brisbane CBD", city: "Brisbane", state: "QLD", lat: -27.4697, lng: 153.0251 },
  { name: "The Brightside", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4601, lng: 153.0402 },
  { name: "The Foundry", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4588, lng: 153.0361 },
  { name: "Woolly Mammoth", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4578, lng: 153.0344 },
  { name: "Bigsound Stage", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4564, lng: 153.0320 },
  { name: "The Courier-Mail Piazza", suburb: "South Bank", city: "Brisbane", state: "QLD", lat: -27.4757, lng: 153.0194 },
  { name: "Brisbane Jazz Club", suburb: "Kangaroo Point", city: "Brisbane", state: "QLD", lat: -27.4762, lng: 153.0348 },
  { name: "The End", suburb: "Brisbane CBD", city: "Brisbane", state: "QLD", lat: -27.4691, lng: 153.0231 },
  { name: "Rosie's Bar", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4596, lng: 153.0319 },
  { name: "The Green Beacon Brewing", suburb: "Teneriffe", city: "Brisbane", state: "QLD", lat: -27.4519, lng: 153.0425 },
  { name: "Mana Bar", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4583, lng: 153.0338 },
  { name: "The Joynt", suburb: "West End", city: "Brisbane", state: "QLD", lat: -27.4813, lng: 153.0133 },
  { name: "West End Markets Stage", suburb: "West End", city: "Brisbane", state: "QLD", lat: -27.4826, lng: 153.0086 },
  // ── Brisbane Suburbs ─────────────────────────────────────────────────────
  { name: "The Shed", suburb: "Windsor", city: "Brisbane", state: "QLD", lat: -27.4388, lng: 153.0305 },
  { name: "Cloudland", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4563, lng: 153.0302 },
  { name: "X&Y Bar", suburb: "Brisbane CBD", city: "Brisbane", state: "QLD", lat: -27.4693, lng: 153.0264 },
  { name: "The Wickham Hotel", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4592, lng: 153.0362 },
  { name: "The Paddo Tavern", suburb: "Paddington", city: "Brisbane", state: "QLD", lat: -27.4614, lng: 152.9996 },
  { name: "The Laneway", suburb: "New Farm", city: "Brisbane", state: "QLD", lat: -27.4649, lng: 153.0483 },
  { name: "Ric's Bar", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4571, lng: 153.0349 },
  { name: "The Gabba Entertainment Centre", suburb: "Woolloongabba", city: "Brisbane", state: "QLD", lat: -27.4858, lng: 153.0384 },
  { name: "Bearded Lady", suburb: "West End", city: "Brisbane", state: "QLD", lat: -27.4838, lng: 153.0148 },
  { name: "Greaser Bar", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4599, lng: 153.0353 },
  { name: "La La Land Bar", suburb: "Brisbane CBD", city: "Brisbane", state: "QLD", lat: -27.4718, lng: 153.0263 },
  { name: "Altar", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4575, lng: 153.0358 },
  { name: "Hangar 33", suburb: "Banyo", city: "Brisbane", state: "QLD", lat: -27.3888, lng: 153.0716 },
  { name: "The Hamilton Hotel", suburb: "Hamilton", city: "Brisbane", state: "QLD", lat: -27.4341, lng: 153.0655 },
  { name: "Caxton Hotel", suburb: "Petrie Terrace", city: "Brisbane", state: "QLD", lat: -27.4629, lng: 153.0132 },
  { name: "The Plough Inn", suburb: "South Bank", city: "Brisbane", state: "QLD", lat: -27.4782, lng: 153.0194 },
  { name: "Archive Beer Boutique", suburb: "South Brisbane", city: "Brisbane", state: "QLD", lat: -27.4802, lng: 153.0171 },
  { name: "Chalk Hotel", suburb: "Woolloongabba", city: "Brisbane", state: "QLD", lat: -27.4921, lng: 153.0371 },
  { name: "The Soapbox Public House", suburb: "Spring Hill", city: "Brisbane", state: "QLD", lat: -27.4608, lng: 153.0268 },
  { name: "Netherworld", suburb: "Fortitude Valley", city: "Brisbane", state: "QLD", lat: -27.4569, lng: 153.0331 },
  // ── Sunshine Coast ───────────────────────────────────────────────────────
  { name: "Solbar", suburb: "Maroochydore", city: "Sunshine Coast", state: "QLD", lat: -26.6524, lng: 153.0908 },
  { name: "The Station SC", suburb: "Birtinya", city: "Sunshine Coast", state: "QLD", lat: -26.7450, lng: 153.1220 },
  { name: "Norton Music Factory", suburb: "Caloundra", city: "Sunshine Coast", state: "QLD", lat: -26.8038, lng: 153.1287 },
  { name: "Noosa Surf Club Stage", suburb: "Noosa Heads", city: "Sunshine Coast", state: "QLD", lat: -26.3937, lng: 153.0923 },
  { name: "The Imperial Hotel Eumundi", suburb: "Eumundi", city: "Sunshine Coast", state: "QLD", lat: -26.4786, lng: 152.9519 },
  { name: "Buderim Tavern", suburb: "Buderim", city: "Sunshine Coast", state: "QLD", lat: -26.6798, lng: 153.0563 },
  { name: "Mooloolaba Surf Club", suburb: "Mooloolaba", city: "Sunshine Coast", state: "QLD", lat: -26.6827, lng: 153.1184 },
  { name: "The Hinterland Hotel", suburb: "Maleny", city: "Sunshine Coast", state: "QLD", lat: -26.7568, lng: 152.8522 },
  { name: "Kings Beach Surf Club", suburb: "Caloundra", city: "Sunshine Coast", state: "QLD", lat: -26.7980, lng: 153.1364 },
  { name: "The Spotted Chook", suburb: "Nambour", city: "Sunshine Coast", state: "QLD", lat: -26.6262, lng: 152.9594 },
  { name: "Secrets on the Lake", suburb: "Montville", city: "Sunshine Coast", state: "QLD", lat: -26.7195, lng: 152.8927 },
  { name: "Caloundra Music Festival Site", suburb: "Caloundra", city: "Sunshine Coast", state: "QLD", lat: -26.8001, lng: 153.1288 },
  { name: "The Alex Headland Surf Club", suburb: "Alexandra Headland", city: "Sunshine Coast", state: "QLD", lat: -26.6711, lng: 153.1095 },
  { name: "Doonan Hotel", suburb: "Doonan", city: "Sunshine Coast", state: "QLD", lat: -26.4608, lng: 152.9950 },
  { name: "The Majestic Cinemas Nambour", suburb: "Nambour", city: "Sunshine Coast", state: "QLD", lat: -26.6278, lng: 152.9590 },
  { name: "Bokarina Beach Bar", suburb: "Bokarina", city: "Sunshine Coast", state: "QLD", lat: -26.7298, lng: 153.1296 },
  { name: "Sunshine Coast Stadium Forecourt", suburb: "Bokarina", city: "Sunshine Coast", state: "QLD", lat: -26.7314, lng: 153.1283 },
  { name: "Noosa Surf Club", suburb: "Noosa Heads", city: "Sunshine Coast", state: "QLD", lat: -26.3964, lng: 153.0921 },
  { name: "The Palms at Noosa", suburb: "Noosa Heads", city: "Sunshine Coast", state: "QLD", lat: -26.3912, lng: 153.0898 },
  { name: "Lake Baroon Hotel", suburb: "Palmwoods", city: "Sunshine Coast", state: "QLD", lat: -26.6892, lng: 152.9636 },
  // ── Gold Coast ───────────────────────────────────────────────────────────
  { name: "Miami Marketta", suburb: "Miami", city: "Gold Coast", state: "QLD", lat: -28.0709, lng: 153.4418 },
  { name: "NightQuarter", suburb: "Helensvale", city: "Gold Coast", state: "QLD", lat: -27.9212, lng: 153.3316 },
  { name: "The Cambus Wallace", suburb: "Broadbeach", city: "Gold Coast", state: "QLD", lat: -28.0298, lng: 153.4294 },
  { name: "The Burleigh Brewing Co", suburb: "Burleigh Heads", city: "Gold Coast", state: "QLD", lat: -28.0922, lng: 153.4512 },
  { name: "Imperial Hotel Easts", suburb: "Surfers Paradise", city: "Gold Coast", state: "QLD", lat: -28.0023, lng: 153.4309 },
  { name: "Elsewhere Bar", suburb: "Broadbeach", city: "Gold Coast", state: "QLD", lat: -28.0268, lng: 153.4281 },
  { name: "Surfers Paradise Beer Garden", suburb: "Surfers Paradise", city: "Gold Coast", state: "QLD", lat: -28.0026, lng: 153.4275 },
  { name: "The Strand Hotel", suburb: "Coolangatta", city: "Gold Coast", state: "QLD", lat: -28.1686, lng: 153.5417 },
  { name: "Currumbin RSL", suburb: "Currumbin", city: "Gold Coast", state: "QLD", lat: -28.1213, lng: 153.4879 },
  { name: "The Pink Hotel", suburb: "Coolangatta", city: "Gold Coast", state: "QLD", lat: -28.1677, lng: 153.5422 },
  { name: "Broadbeach Hotel", suburb: "Broadbeach", city: "Gold Coast", state: "QLD", lat: -28.0283, lng: 153.4277 },
  { name: "Gold Coast City Hall", suburb: "Southport", city: "Gold Coast", state: "QLD", lat: -27.9731, lng: 153.4011 },
  { name: "The Southport Surf Club", suburb: "Southport", city: "Gold Coast", state: "QLD", lat: -27.9728, lng: 153.4154 },
  { name: "Bleach* Festival Site", suburb: "Broadbeach", city: "Gold Coast", state: "QLD", lat: -28.0310, lng: 153.4311 },
  { name: "Village Markets Stage", suburb: "Burleigh Heads", city: "Gold Coast", state: "QLD", lat: -28.0921, lng: 153.4494 },
  { name: "The Outpost Bar", suburb: "Mermaid Beach", city: "Gold Coast", state: "QLD", lat: -28.0498, lng: 153.4438 },
  { name: "Rabbit Hole Bar", suburb: "Surfers Paradise", city: "Gold Coast", state: "QLD", lat: -28.0032, lng: 153.4281 },
  { name: "Currumbin Valley Country Club", suburb: "Currumbin Valley", city: "Gold Coast", state: "QLD", lat: -28.2148, lng: 153.4301 },
  { name: "The Gig Room GC", suburb: "Nerang", city: "Gold Coast", state: "QLD", lat: -27.9943, lng: 153.3454 },
  { name: "Kurrawa Surf Club", suburb: "Broadbeach", city: "Gold Coast", state: "QLD", lat: -28.0311, lng: 153.4342 },
  // ── Moreton Bay / North Brisbane ─────────────────────────────────────────
  { name: "The Prince of Wales Hotel", suburb: "Nundah", city: "Brisbane", state: "QLD", lat: -27.3977, lng: 153.0632 },
  { name: "The Norths Rugby Club", suburb: "Nundah", city: "Brisbane", state: "QLD", lat: -27.4013, lng: 153.0591 },
  { name: "Sandstone Point Hotel", suburb: "Sandstone Point", city: "Moreton Bay", state: "QLD", lat: -27.0803, lng: 153.1327 },
  { name: "Redcliffe Showground Stage", suburb: "Redcliffe", city: "Moreton Bay", state: "QLD", lat: -27.2321, lng: 153.1010 },
  { name: "The Landmark Hotel", suburb: "Caboolture", city: "Moreton Bay", state: "QLD", lat: -27.0779, lng: 152.9541 },
  { name: "Pine Rivers Hotel", suburb: "Strathpine", city: "Moreton Bay", state: "QLD", lat: -27.3115, lng: 152.9914 },
  { name: "Bribie Island RSL", suburb: "Bongaree", city: "Moreton Bay", state: "QLD", lat: -27.0703, lng: 153.1582 },
  { name: "Morayfield Hotel", suburb: "Morayfield", city: "Moreton Bay", state: "QLD", lat: -27.1056, lng: 152.9686 },
  // ── Ipswich / Logan ──────────────────────────────────────────────────────
  { name: "The Basement Ipswich", suburb: "Ipswich", city: "Ipswich", state: "QLD", lat: -27.6128, lng: 152.7592 },
  { name: "The Junction Hotel Ipswich", suburb: "Booval", city: "Ipswich", state: "QLD", lat: -27.6201, lng: 152.7829 },
  { name: "Racehorse Hotel Ipswich", suburb: "Ipswich", city: "Ipswich", state: "QLD", lat: -27.6141, lng: 152.7611 },
  { name: "Logan Entertainment Centre", suburb: "Underwood", city: "Logan", state: "QLD", lat: -27.5963, lng: 153.1178 },
  { name: "The Springwood Hotel", suburb: "Springwood", city: "Logan", state: "QLD", lat: -27.6136, lng: 153.1141 },
];

const GIG_IMAGES = [
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-d220c6a6fce7?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1540039155732-6761b54cb6da?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1549213783-8284d0336c4f?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1446941303983-2b5b5e39ea09?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1528495612343-9ca9f4a4de28?w=1200&h=630&fit=crop",
];

const DEMO_EVENTS: Array<{
  name: string;
  days: number;
  hour: number;
  minute: number;
  venue: string;
  artists: string[];
  imageUrl: string;
}> = [
  // ── existing 10 ─────────────────────────────────────────────────────────
  { name: "Indie Night: Local Showcase", days: 4, hour: 20, minute: 0, venue: "The Triffid", artists: ["Ball Park Music", "Teenage Dads"], imageUrl: GIG_IMAGES[0] },
  { name: "Heavy Friday", days: 7, hour: 21, minute: 0, venue: "Crowbar Brisbane", artists: ["Polaris", "Thornhill"], imageUrl: GIG_IMAGES[1] },
  { name: "Sunshine Coast Sunday Session", days: 10, hour: 14, minute: 0, venue: "Solbar", artists: ["Ocean Alley", "Lime Cordiale"], imageUrl: GIG_IMAGES[2] },
  { name: "Electronic Club Night", days: 14, hour: 22, minute: 0, venue: "Fortitude Music Hall", artists: ["Flume", "RÜFÜS DU SOL"], imageUrl: GIG_IMAGES[3] },
  { name: "Acoustic & Beer Garden", days: 18, hour: 17, minute: 0, venue: "The Station SC", artists: ["Vance Joy", "Angus & Julia Stone"], imageUrl: GIG_IMAGES[4] },
  { name: "Aussie Punk Tour Stop", days: 22, hour: 20, minute: 30, venue: "The Tivoli", artists: ["The Chats", "Dune Rats"], imageUrl: GIG_IMAGES[5] },
  { name: "Gold Coast Warehouse Party", days: 26, hour: 22, minute: 0, venue: "Miami Marketta", artists: ["Fisher", "Dom Dolla"], imageUrl: GIG_IMAGES[6] },
  { name: "Rock the Waterfront", days: 3, hour: 19, minute: 0, venue: "NightQuarter", artists: ["Gang of Youths", "Middle Kids"], imageUrl: GIG_IMAGES[7] },
  { name: "Late Night Jazz & Blues", days: 5, hour: 20, minute: 0, venue: "The Princess Theatre", artists: ["James Morrison", "Vika & Linda"], imageUrl: GIG_IMAGES[8] },
  { name: "Summer Beats Festival", days: 30, hour: 16, minute: 0, venue: "Norton Music Factory", artists: ["Vera Blue", "G Flip", "Spacey Jane"], imageUrl: GIG_IMAGES[9] },

  // ── new 90 ──────────────────────────────────────────────────────────────
  { name: "Valley Disco Revival", days: 1, hour: 22, minute: 0, venue: "Black Bear Lodge", artists: ["Nina Las Vegas", "Ninajirachi"], imageUrl: GIG_IMAGES[10] },
  { name: "Thursday Tunes", days: 2, hour: 19, minute: 30, venue: "The Zoo", artists: ["Tired Lion", "Luca Brasi"], imageUrl: GIG_IMAGES[11] },
  { name: "Country Night at The End", days: 2, hour: 20, minute: 0, venue: "The End", artists: ["Beccy Cole", "Adam Harvey"], imageUrl: GIG_IMAGES[12] },
  { name: "Reggae Sundowner", days: 3, hour: 17, minute: 0, venue: "Bearded Lady", artists: ["The Last Kinection", "Matiu"], imageUrl: GIG_IMAGES[13] },
  { name: "Synth & Smoke", days: 3, hour: 21, minute: 0, venue: "Woolly Mammoth", artists: ["Ceres", "Holiday Sidewinder"], imageUrl: GIG_IMAGES[14] },
  { name: "Noosa Jazz Evening", days: 4, hour: 19, minute: 0, venue: "Noosa Surf Club Stage", artists: ["Paul Grabowsky", "Andrea Keller"], imageUrl: GIG_IMAGES[15] },
  { name: "Thursday Night Blues", days: 4, hour: 21, minute: 0, venue: "The Brightside", artists: ["Geoff Achison", "Shannon Bourne"], imageUrl: GIG_IMAGES[16] },
  { name: "Aloha Friday Sessions", days: 5, hour: 17, minute: 30, venue: "Mooloolaba Surf Club", artists: ["Tia Gostelow", "Sahara Beck"], imageUrl: GIG_IMAGES[17] },
  { name: "Brisbane Hip Hop Night", days: 5, hour: 22, minute: 0, venue: "Greaser Bar", artists: ["Remi", "Sampa the Great"], imageUrl: GIG_IMAGES[18] },
  { name: "Eumundi Roots Session", days: 6, hour: 15, minute: 0, venue: "The Imperial Hotel Eumundi", artists: ["John Butler", "Xavier Rudd"], imageUrl: GIG_IMAGES[19] },
  { name: "Metalcore Madness", days: 6, hour: 20, minute: 30, venue: "Crowbar Brisbane", artists: ["Parkway Drive", "Thy Art Is Murder"], imageUrl: GIG_IMAGES[0] },
  { name: "Craft Beer & Bluegrass", days: 6, hour: 14, minute: 0, venue: "The Green Beacon Brewing", artists: ["The Waifs", "Busby Marou"], imageUrl: GIG_IMAGES[1] },
  { name: "Sunday Jazz Brunch", days: 7, hour: 11, minute: 0, venue: "Brisbane Jazz Club", artists: ["Dale Barlow Quartet", "Katie Noonan"], imageUrl: GIG_IMAGES[2] },
  { name: "Spring Hill Soul Night", days: 7, hour: 21, minute: 0, venue: "The Soapbox Public House", artists: ["Laura Imbruglia", "Clare Bowditch"], imageUrl: GIG_IMAGES[3] },
  { name: "Sandstone Sessions", days: 8, hour: 16, minute: 0, venue: "Sandstone Point Hotel", artists: ["Bernard Fanning", "John Farnham"], imageUrl: GIG_IMAGES[4] },
  { name: "West End Open Mic Night", days: 8, hour: 19, minute: 0, venue: "West End Markets Stage", artists: ["Various Artists"], imageUrl: GIG_IMAGES[5] },
  { name: "Punk in the Valley", days: 8, hour: 20, minute: 0, venue: "The Foundry", artists: ["Bad//Dreems", "Camp Cope"], imageUrl: GIG_IMAGES[6] },
  { name: "Electronica Underground", days: 9, hour: 23, minute: 0, venue: "Cloudland", artists: ["Alison Wonderland", "Skrillex"], imageUrl: GIG_IMAGES[7] },
  { name: "Hinterland Folk Festival", days: 9, hour: 12, minute: 0, venue: "The Hinterland Hotel", artists: ["Paul Kelly", "Sarah Blasko"], imageUrl: GIG_IMAGES[8] },
  { name: "Caxton Street Country Night", days: 9, hour: 20, minute: 0, venue: "Caxton Hotel", artists: ["Lee Kernaghan", "Amber Lawrence"], imageUrl: GIG_IMAGES[9] },
  { name: "GC Beats: House Edition", days: 9, hour: 22, minute: 30, venue: "The Cambus Wallace", artists: ["Dom Dolla", "Hayden James"], imageUrl: GIG_IMAGES[10] },
  { name: "Redcliffe Rock Festival", days: 10, hour: 13, minute: 0, venue: "Redcliffe Showground Stage", artists: ["Wolfmother", "Airbourne"], imageUrl: GIG_IMAGES[11] },
  { name: "Ipswich Blues Night", days: 10, hour: 20, minute: 0, venue: "The Basement Ipswich", artists: ["Steve Edmonds", "Ash Grunwald"], imageUrl: GIG_IMAGES[12] },
  { name: "Valley Pop Night", days: 11, hour: 20, minute: 30, venue: "The Zoo", artists: ["Amy Shark", "Tones and I"], imageUrl: GIG_IMAGES[13] },
  { name: "Noosa Heads Sunset Sessions", days: 11, hour: 16, minute: 0, venue: "Noosa Surf Club", artists: ["Jack Johnson", "Ben Harper"], imageUrl: GIG_IMAGES[14] },
  { name: "Logan Live Music Night", days: 11, hour: 20, minute: 0, venue: "The Springwood Hotel", artists: ["Jimmy Barnes", "Cold Chisel"], imageUrl: GIG_IMAGES[15] },
  { name: "Surf & Sounds", days: 12, hour: 14, minute: 0, venue: "Kings Beach Surf Club", artists: ["Matt Corby", "Emily Wurramara"], imageUrl: GIG_IMAGES[16] },
  { name: "Alt-Rock Friday", days: 12, hour: 20, minute: 0, venue: "The Brightside", artists: ["Methyl Ethel", "Stella Donnelly"], imageUrl: GIG_IMAGES[17] },
  { name: "DnB Night: Subwoofer", days: 12, hour: 22, minute: 30, venue: "Woolly Mammoth", artists: ["Pendulum", "Sub Focus"], imageUrl: GIG_IMAGES[18] },
  { name: "Surfers Sounds Weekend", days: 13, hour: 14, minute: 0, venue: "Surfers Paradise Beer Garden", artists: ["The Rubens", "Lime Cordiale"], imageUrl: GIG_IMAGES[19] },
  { name: "Heritage Folk Night", days: 13, hour: 19, minute: 0, venue: "The Imperial Hotel Eumundi", artists: ["William Crighton", "Jordie Lane"], imageUrl: GIG_IMAGES[0] },
  { name: "Bigsound Alumni Night", days: 13, hour: 21, minute: 0, venue: "Bigsound Stage", artists: ["Confidence Man", "Hockey Dad"], imageUrl: GIG_IMAGES[1] },
  { name: "Caloundra Beach Party", days: 13, hour: 15, minute: 0, venue: "Caloundra Music Festival Site", artists: ["Ziggy Alberts", "Tash Sultana"], imageUrl: GIG_IMAGES[2] },
  { name: "Indie-tronica Saturday", days: 14, hour: 21, minute: 0, venue: "Black Bear Lodge", artists: ["Flight Facilities", "Cut Copy"], imageUrl: GIG_IMAGES[3] },
  { name: "Jazz in the Garden", days: 14, hour: 12, minute: 0, venue: "The Palms at Noosa", artists: ["Vince Jones", "Kerri Simpson"], imageUrl: GIG_IMAGES[4] },
  { name: "Southport Sessions", days: 14, hour: 19, minute: 30, venue: "Gold Coast City Hall", artists: ["Busby Marou", "Xavier Rudd"], imageUrl: GIG_IMAGES[5] },
  { name: "Punk Matinee", days: 15, hour: 14, minute: 0, venue: "The Tivoli", artists: ["Amyl and the Sniffers", "The Chats"], imageUrl: GIG_IMAGES[6] },
  { name: "Nundah Neighbourhood Night", days: 15, hour: 19, minute: 0, venue: "The Prince of Wales Hotel", artists: ["The Medics", "Skegss"], imageUrl: GIG_IMAGES[7] },
  { name: "Outer Beats: Techno", days: 15, hour: 23, minute: 0, venue: "Altar", artists: ["Peggy Gou", "Solomun"], imageUrl: GIG_IMAGES[8] },
  { name: "Bribie Island Sunday Session", days: 16, hour: 13, minute: 0, venue: "Bribie Island RSL", artists: ["Troy Cassar-Daley", "Gina Jeffreys"], imageUrl: GIG_IMAGES[9] },
  { name: "New Farm Friday", days: 16, hour: 20, minute: 0, venue: "The Laneway", artists: ["Gordi", "Alex the Astronaut"], imageUrl: GIG_IMAGES[10] },
  { name: "Broadbeach Beats", days: 16, hour: 18, minute: 0, venue: "Broadbeach Hotel", artists: ["Set Mo", "Safia"], imageUrl: GIG_IMAGES[11] },
  { name: "Paddo Singalong Night", days: 17, hour: 20, minute: 0, venue: "The Paddo Tavern", artists: ["Josh Pyke", "Katie Noonan"], imageUrl: GIG_IMAGES[12] },
  { name: "Montville Music Retreat", days: 17, hour: 14, minute: 0, venue: "Secrets on the Lake", artists: ["Missy Higgins", "Sarah Blasko"], imageUrl: GIG_IMAGES[13] },
  { name: "Bleach Festival Warm-Up", days: 17, hour: 15, minute: 0, venue: "Bleach* Festival Site", artists: ["Harvey Sutherland", "Rüfüs Du Sol"], imageUrl: GIG_IMAGES[14] },
  { name: "Caboolture Country Classic", days: 18, hour: 13, minute: 0, venue: "The Landmark Hotel", artists: ["Adam Brand", "Travis Collins"], imageUrl: GIG_IMAGES[15] },
  { name: "Thursday Jazz Lounge", days: 18, hour: 19, minute: 0, venue: "Lefty's Old Time Music Hall", artists: ["Gian Slater", "Andrea Keller"], imageUrl: GIG_IMAGES[16] },
  { name: "Currumbin Rock Night", days: 18, hour: 20, minute: 30, venue: "Currumbin RSL", artists: ["Birds of Tokyo", "Boy & Bear"], imageUrl: GIG_IMAGES[17] },
  { name: "South Bank Soundscape", days: 19, hour: 18, minute: 0, venue: "The Courier-Mail Piazza", artists: ["Kate Miller-Heidke", "Tim Minchin"], imageUrl: GIG_IMAGES[18] },
  { name: "Maroochydore Mash Up", days: 19, hour: 21, minute: 0, venue: "Solbar", artists: ["Paces", "Wax Motif"], imageUrl: GIG_IMAGES[19] },
  { name: "Valley Rave: All Nighter", days: 19, hour: 23, minute: 0, venue: "Fortitude Music Hall", artists: ["Four Tet", "Caribou"], imageUrl: GIG_IMAGES[0] },
  { name: "Bokarina Beach Bash", days: 20, hour: 14, minute: 0, venue: "Bokarina Beach Bar", artists: ["Sticky Fingers", "Ocean Alley"], imageUrl: GIG_IMAGES[1] },
  { name: "Burleigh Beer & Bands", days: 20, hour: 15, minute: 0, venue: "The Burleigh Brewing Co", artists: ["Hockey Dad", "Teenage Joans"], imageUrl: GIG_IMAGES[2] },
  { name: "Strathpine Saturday Rock", days: 20, hour: 20, minute: 0, venue: "Pine Rivers Hotel", artists: ["Dead Letter Circus", "Cog"], imageUrl: GIG_IMAGES[3] },
  { name: "Maleny Mountain Sessions", days: 21, hour: 16, minute: 0, venue: "The Hinterland Hotel", artists: ["John Butler Trio", "Clare Bowditch"], imageUrl: GIG_IMAGES[4] },
  { name: "All Ages Show", days: 21, hour: 14, minute: 0, venue: "The Triffid", artists: ["Teenage Dads", "Skegss"], imageUrl: GIG_IMAGES[5] },
  { name: "Sunday Funk", days: 21, hour: 17, minute: 0, venue: "Ric's Bar", artists: ["Hiatus Kaiyote", "Mojo Juju"], imageUrl: GIG_IMAGES[6] },
  { name: "Jazz at the Junction", days: 22, hour: 19, minute: 30, venue: "The Junction Hotel Ipswich", artists: ["Barney McAll", "Tony Gould"], imageUrl: GIG_IMAGES[7] },
  { name: "Buderim Bar Nights", days: 22, hour: 20, minute: 0, venue: "Buderim Tavern", artists: ["Marlon Roudette", "Boy George"], imageUrl: GIG_IMAGES[8] },
  { name: "Village Market Vibes", days: 22, hour: 11, minute: 0, venue: "Village Markets Stage", artists: ["San Cisco", "Stella Donnelly"], imageUrl: GIG_IMAGES[9] },
  { name: "Geek & Gig Gaming Night", days: 23, hour: 19, minute: 0, venue: "Netherworld", artists: ["Perturbator", "Carpenter Brut"], imageUrl: GIG_IMAGES[10] },
  { name: "Americana Night", days: 23, hour: 19, minute: 30, venue: "The Wickham Hotel", artists: ["Kasey Chambers", "Shane Nicholson"], imageUrl: GIG_IMAGES[11] },
  { name: "Coolangatta Sunset Session", days: 23, hour: 16, minute: 0, venue: "The Strand Hotel", artists: ["Jack Johnson", "Donavon Frankenreiter"], imageUrl: GIG_IMAGES[12] },
  { name: "Woolloongabba Tripleheader", days: 24, hour: 18, minute: 0, venue: "Chalk Hotel", artists: ["Ball Park Music", "The Jungle Giants", "Middle Kids"], imageUrl: GIG_IMAGES[13] },
  { name: "Alex Heads Sunset Sesh", days: 24, hour: 17, minute: 0, venue: "The Alex Headland Surf Club", artists: ["Ziggy Alberts", "Matt Corby"], imageUrl: GIG_IMAGES[14] },
  { name: "Hangar Party: Techno", days: 24, hour: 22, minute: 0, venue: "Hangar 33", artists: ["Adam Beyer", "Ben Klock"], imageUrl: GIG_IMAGES[15] },
  { name: "Nerang Night Tunes", days: 25, hour: 20, minute: 0, venue: "The Gig Room GC", artists: ["Dune Rats", "Crocodylus"], imageUrl: GIG_IMAGES[16] },
  { name: "South Brisbane Blues Trail", days: 25, hour: 19, minute: 0, venue: "Archive Beer Boutique", artists: ["Ash Grunwald", "Dave Pereira"], imageUrl: GIG_IMAGES[17] },
  { name: "Nambour Legends Night", days: 25, hour: 20, minute: 30, venue: "The Spotted Chook", artists: ["Slim Dusty Tribute", "Charley Pride Tribute"], imageUrl: GIG_IMAGES[18] },
  { name: "Doonan Sessions", days: 26, hour: 14, minute: 0, venue: "Doonan Hotel", artists: ["Busby Marou", "Gordi"], imageUrl: GIG_IMAGES[19] },
  { name: "Morayfield Metal Night", days: 26, hour: 20, minute: 30, venue: "Morayfield Hotel", artists: ["Northlane", "Luca Brasi"], imageUrl: GIG_IMAGES[0] },
  { name: "X&Y Late Friday", days: 26, hour: 22, minute: 0, venue: "X&Y Bar", artists: ["Timmy Trumpet", "Valentino Khan"], imageUrl: GIG_IMAGES[1] },
  { name: "Pink Hotel Punk Night", days: 27, hour: 21, minute: 0, venue: "The Pink Hotel", artists: ["The Chats", "Frenzal Rhomb"], imageUrl: GIG_IMAGES[2] },
  { name: "Sunshine Coast Stadium Fiesta", days: 27, hour: 15, minute: 0, venue: "Sunshine Coast Stadium Forecourt", artists: ["Peking Duk", "Confidence Man"], imageUrl: GIG_IMAGES[3] },
  { name: "Kurrawa Beach DJ Session", days: 27, hour: 16, minute: 0, venue: "Kurrawa Surf Club", artists: ["Panama", "Lastlings"], imageUrl: GIG_IMAGES[4] },
  { name: "Plough Inn Sunday Roast", days: 28, hour: 13, minute: 0, venue: "The Plough Inn", artists: ["The Cat Empire", "George"], imageUrl: GIG_IMAGES[5] },
  { name: "Lake Baroon Acoustic", days: 28, hour: 15, minute: 0, venue: "Lake Baroon Hotel", artists: ["Passenger", "Ben Howard"], imageUrl: GIG_IMAGES[6] },
  { name: "Hamilton Hotel Hebdo", days: 28, hour: 19, minute: 0, venue: "The Hamilton Hotel", artists: ["The Medics", "Tiny Little Houses"], imageUrl: GIG_IMAGES[7] },
  { name: "Southport Surf & Sound", days: 29, hour: 16, minute: 0, venue: "The Southport Surf Club", artists: ["Tash Sultana", "Jack River"], imageUrl: GIG_IMAGES[8] },
  { name: "Logan Entertainment Gala", days: 29, hour: 18, minute: 0, venue: "Logan Entertainment Centre", artists: ["John Farnham", "Daryl Braithwaite"], imageUrl: GIG_IMAGES[9] },
  { name: "Rabbit Hole Late Session", days: 30, hour: 23, minute: 0, venue: "Rabbit Hole Bar", artists: ["CloZee", "Luttrell"], imageUrl: GIG_IMAGES[10] },
  { name: "Ipswich Rock Rodeo", days: 31, hour: 19, minute: 0, venue: "Racehorse Hotel Ipswich", artists: ["Jet", "Wolfmother"], imageUrl: GIG_IMAGES[11] },
  { name: "Palmwoods Twilight Music", days: 32, hour: 17, minute: 0, venue: "Lake Baroon Hotel", artists: ["Vance Joy", "Hollow Coves"], imageUrl: GIG_IMAGES[12] },
  { name: "Elsewhere Beach Club", days: 33, hour: 16, minute: 0, venue: "Elsewhere Bar", artists: ["Poolclvb", "Hayden James"], imageUrl: GIG_IMAGES[13] },
  { name: "Brisbane Alt-Country Night", days: 34, hour: 20, minute: 0, venue: "Lefty's Old Time Music Hall", artists: ["Kasey Chambers", "Courtney Marie Andrews"], imageUrl: GIG_IMAGES[14] },
  { name: "Dusk to Dawn Festival", days: 35, hour: 18, minute: 0, venue: "Sandstone Point Hotel", artists: ["Tame Impala", "RÜFÜS DU SOL", "Flight Facilities"], imageUrl: GIG_IMAGES[15] },
  { name: "Valley Fresh: New Artists Night", days: 36, hour: 20, minute: 0, venue: "The Brightside", artists: ["Teenage Joans", "Bugs"], imageUrl: GIG_IMAGES[16] },
  { name: "Mermaid Beach Night Market Beats", days: 37, hour: 18, minute: 30, venue: "The Outpost Bar", artists: ["Set Mo", "Crooked Colours"], imageUrl: GIG_IMAGES[17] },
  { name: "Alex Headland Sessions", days: 38, hour: 14, minute: 0, venue: "Bokarina Beach Bar", artists: ["Oh Wonder", "Hollow Coves"], imageUrl: GIG_IMAGES[18] },
  { name: "Currumbin Valley Hoedown", days: 39, hour: 16, minute: 0, venue: "Currumbin Valley Country Club", artists: ["Adam Brand", "Travis Collins"], imageUrl: GIG_IMAGES[19] },
  { name: "Valley Electronic Marathon", days: 40, hour: 22, minute: 0, venue: "Fortitude Music Hall", artists: ["Moderat", "Jon Hopkins"], imageUrl: GIG_IMAGES[0] },
  { name: "Imperial Hotel Saturday Sesh", days: 41, hour: 15, minute: 0, venue: "Imperial Hotel Easts", artists: ["Cold Chisel Tribute", "Australian Crawl Tribute"], imageUrl: GIG_IMAGES[1] },
  { name: "6 Weeks Out: Season Finale", days: 41, hour: 18, minute: 0, venue: "Caloundra Music Festival Site", artists: ["Paul Kelly", "Missy Higgins", "Kasey Chambers"], imageUrl: GIG_IMAGES[2] },
];

function eventTime(daysAhead: number, aestHour: number, aestMinute: number): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead,
    aestHour - 10, aestMinute, 0
  ));
}

export async function runDemoSeed(): Promise<{ venues: number; events: number }> {
  const venueMap = new Map<string, { id: string; lat: number | null; lng: number | null; city: string | null; state: string | null }>();

  for (const v of DEMO_VENUES) {
    const [existing] = await db.select().from(venues).where(eq(venues.name, v.name)).limit(1);
    if (existing) {
      venueMap.set(v.name, { id: existing.id, lat: existing.lat, lng: existing.lng, city: existing.city, state: existing.state });
    } else {
      const [inserted] = await db.insert(venues).values({
        name: v.name,
        suburb: v.suburb,
        city: v.city,
        state: v.state,
        lat: v.lat,
        lng: v.lng,
        source: "demo",
        isActive: true,
      }).returning();
      venueMap.set(v.name, { id: inserted.id, lat: inserted.lat, lng: inserted.lng, city: inserted.city, state: inserted.state });
    }
  }

  let eventCount = 0;
  for (const e of DEMO_EVENTS) {
    const v = venueMap.get(e.venue);
    const providerEventId = `demo-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`;
    const start = eventTime(e.days, e.hour, e.minute);

    await db.insert(events).values({
      provider: "community",
      providerEventId,
      name: e.name,
      startTime: start,
      venueName: e.venue,
      venueLat: v?.lat ?? null,
      venueLng: v?.lng ?? null,
      city: v?.city ?? null,
      state: v?.state ?? null,
      ticketUrl: null,
      imageUrl: e.imageUrl,
      status: "active",
      rawJson: { demo: true },
    }).onConflictDoUpdate({
      target: events.providerEventId,
      set: {
        startTime: start,
        imageUrl: e.imageUrl,
        venueLat: v?.lat ?? null,
        venueLng: v?.lng ?? null,
        status: "active",
      },
    });

    const artistRows = e.artists.map((a) => ({
      provider: "community" as const,
      providerEventId,
      artistName: a,
      providerArtistId: null,
      normalizedName: normalizeName(a),
    }));

    if (artistRows.length > 0) {
      await db.insert(eventArtists).values(artistRows).onConflictDoNothing();
    }

    eventCount++;
  }

  return { venues: venueMap.size, events: eventCount };
}
