import { db } from "./db";
import { venues, events, eventArtists } from "@shared/schema";
import { normalizeName } from "./feedService";

async function seed() {
  const existingVenues = await db.select().from(venues).limit(1);
  if (existingVenues.length > 0) {
    console.log("Database already seeded.");
    return;
  }

  console.log("Seeding database...");

  const [venue1] = await db.insert(venues).values({
    name: "The Triffid",
    address: "7-9 Stratton St",
    suburb: "Newstead",
    city: "Brisbane",
    state: "QLD",
    postcode: "4006",
    lat: -27.4526,
    lng: 153.0416,
    website: "https://thetriffid.com.au",
  }).returning();

  const [venue2] = await db.insert(venues).values({
    name: "Fortitude Music Hall",
    address: "312-318 Brunswick St",
    suburb: "Fortitude Valley",
    city: "Brisbane",
    state: "QLD",
    postcode: "4006",
    lat: -27.4578,
    lng: 153.0336,
    website: "https://thefortitude.com.au",
  }).returning();

  const startTime1 = new Date();
  startTime1.setDate(startTime1.getDate() + 2);
  const startTime2 = new Date();
  startTime2.setDate(startTime2.getDate() + 5);

  const [event1] = await db.insert(events).values({
    provider: "seed",
    providerEventId: "seed-1",
    name: "Local Indie Night",
    startTime: startTime1,
    venueName: venue1.name,
    venueLat: venue1.lat,
    venueLng: venue1.lng,
    city: venue1.city,
    state: venue1.state,
    ticketUrl: "https://example.com/tickets1",
    imageUrl: "https://images.unsplash.com/photo-1540039155732-6761b54cb6da?w=800&q=80",
    status: "onsale",
  }).returning();

  const [event2] = await db.insert(events).values({
    provider: "seed",
    providerEventId: "seed-2",
    name: "Valley Rock Fest",
    startTime: startTime2,
    venueName: venue2.name,
    venueLat: venue2.lat,
    venueLng: venue2.lng,
    city: venue2.city,
    state: venue2.state,
    ticketUrl: "https://example.com/tickets2",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
    status: "onsale",
  }).returning();

  await db.insert(eventArtists).values([
    { provider: "seed", providerEventId: "seed-1", artistName: "The Jungle Giants", normalizedName: normalizeName("The Jungle Giants") },
    { provider: "seed", providerEventId: "seed-1", artistName: "Spacey Jane", normalizedName: normalizeName("Spacey Jane") },
    { provider: "seed", providerEventId: "seed-2", artistName: "Violent Soho", normalizedName: normalizeName("Violent Soho") },
    { provider: "seed", providerEventId: "seed-2", artistName: "Ball Park Music", normalizedName: normalizeName("Ball Park Music") }
  ]);

  console.log("Seeding complete.");
}

seed().catch(console.error).finally(() => process.exit(0));