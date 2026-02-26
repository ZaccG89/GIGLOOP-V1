import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Venue } from "@shared/schema";

export function useVenues(searchQuery?: string) {
  return useQuery<Venue[]>({
    queryKey: [api.venues.search.path, searchQuery],
    queryFn: async () => {
      const url = new URL(api.venues.search.path, window.location.origin);
      if (searchQuery) url.searchParams.set("q", searchQuery);
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch venues");
      return res.json();
    },
  });
}

export function useVenue(id: string) {
  return useQuery<Venue>({
    queryKey: [api.venues.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.venues.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Venue not found");
        throw new Error("Failed to fetch venue");
      }
      return res.json();
    },
    enabled: !!id,
  });
}
