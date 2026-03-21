import { storage } from "./storage";

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s&]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function buildFeedForUser(userId: string) {
  const user = await storage.getUser(userId);
  const allEvents = await storage.getUpcomingEvents(90);

  const locationLat = user?.locationLat;
  const locationLng = user?.locationLng;
  const radius = user?.radiusKm ?? 500;

  const cards = allEvents
    .filter((event) => {
      if (
        locationLat == null ||
        locationLng == null ||
        event.venueLat == null ||
        event.venueLng == null
      ) {
        return true;
      }

      const distanceKm = haversineKm(
        locationLat,
        locationLng,
        event.venueLat,
        event.venueLng
      );

      return distanceKm <= radius;
    })
    .slice(0, 80)
    .map((event) => ({
      ...event,
      matchScore: 0,
      distanceKm:
        locationLat != null &&
        locationLng != null &&
        event.venueLat != null &&
        event.venueLng != null
          ? haversineKm(
              locationLat,
              locationLng,
              event.venueLat,
              event.venueLng
            )
          : undefined,
      matchedArtists: [],
    }));

  return cards;
}