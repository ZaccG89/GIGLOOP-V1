import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Event } from "@shared/schema";

export type FeedItem = {
  event: Event;
  matchScore: number;
  distanceKm?: number;
  matchedArtists: string[];
};

export class FeedError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export function useFeed() {
  return useQuery<FeedItem[], FeedError>({
    queryKey: [api.feed.get.path],
    queryFn: async () => {
      const res = await fetch(api.feed.get.path, { credentials: "include" });
      
      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          throw new FeedError(errorData.message || "Bad Request", errorData.code || "unknown");
        }
        throw new Error("Failed to fetch feed");
      }
      
      return res.json();
    },
  });
}

export function useSyncSpotify() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.spotify.syncTopArtists.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to sync Spotify artists");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feed.get.path] });
    }
  });
}

export function useIngestSeq() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.ingest.ticketmaster.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to ingest gigs");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feed.get.path] });
    }
  });
}
