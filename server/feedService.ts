import { storage } from "./storage";

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^\w\s&]/g, '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function buildFeedForUser(userId: string) {
  const user = await storage.getUser(userId);
  if (!user || user.locationLat == null || user.locationLng == null) {
    throw new Error('no_location');
  }

  const { locationLat, locationLng, radiusKm = 50 } = user;
  const radius = radiusKm ?? 50;

  const userArtists = await storage.getUserArtists(userId);
  const userMap = new Map<string, { name: string; score: number }>();
  for (const ua of userArtists) {
    userMap.set(normalizeName(ua.artistName), { name: ua.artistName, score: ua.affinityScore });
  }

  const allEvents = await storage.getUpcomingEvents(90);
  const matchedResults = [];
  const matchedIds = new Set<string>();

  for (const event of allEvents) {
    // Radius filter
    let distanceKm: number | undefined;
    if (event.venueLat != null && event.venueLng != null) {
      distanceKm = haversineKm(locationLat, locationLng, event.venueLat, event.venueLng);
      if (distanceKm > radius) continue;
    }

    const eArtists = await storage.getEventArtists(event.providerEventId);
    let bestMatchScore = 0;
    const matchedArtists: string[] = [];

    for (const ea of eArtists) {
      const match = userMap.get(ea.normalizedName);
      if (match) {
        matchedArtists.push(match.name);
        if (match.score > bestMatchScore) bestMatchScore = match.score;
      }
    }

    if (matchedArtists.length > 0) {
      const daysAway = (event.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      const timeBonus = Math.max(0, 1 - (daysAway / 60));
      const distBonus = distanceKm !== undefined ? Math.max(0, 1 - (distanceKm / radius)) : 0.5;
      const score = bestMatchScore * 2.0 + timeBonus * 0.6 + distBonus * 0.4;

      matchedResults.push({ event, matchScore: score, distanceKm, matchedArtists });
      matchedIds.add(event.providerEventId);
    }
  }

  matchedResults.sort((a, b) => b.matchScore - a.matchScore);
  const cards = matchedResults.slice(0, 80);

  // Fallback: if fewer than 12 matched, pad with nearby upcoming gigs
  if (cards.length < 12) {
    const fallback = allEvents
      .filter((event) => !matchedIds.has(event.providerEventId))
      .filter((event) => {
        if (event.venueLat == null || event.venueLng == null) return true;
        return haversineKm(locationLat, locationLng, event.venueLat, event.venueLng) <= radius;
      })
      .slice(0, 30 - cards.length)
      .map((event) => {
        const distanceKm =
          event.venueLat != null && event.venueLng != null
            ? haversineKm(locationLat, locationLng, event.venueLat, event.venueLng)
            : undefined;
        return { event, matchScore: 0, distanceKm, matchedArtists: [] };
      });

    cards.push(...fallback);
  }

  return cards;
}
