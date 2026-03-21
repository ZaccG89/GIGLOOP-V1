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
    this.name = "FeedError";
    this.code = code;
  }
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    ...init,
  });

  if (!res.ok) {
    if (res.status === 400) {
      const errorData = await res.json().catch(() => null);
      throw new FeedError(
        errorData?.message || "Bad Request",
        errorData?.code || "unknown"
      );
    }

    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json();
}

export function useFeed() {
  return useQuery<FeedItem[], FeedError>({
    queryKey: [api.feed.get.path],
    queryFn: () => fetchJson<FeedItem[]>(api.feed.get.path),
  });
}

export function useSyncSpotify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchJson(api.spotify.syncTopArtists.path, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.feed.get.path],
      });
    },
  });
}

export function useIngestSeq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchJson(api.ingest.ticketmaster.path, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [api.feed.get.path],
      });
    },
  });
}