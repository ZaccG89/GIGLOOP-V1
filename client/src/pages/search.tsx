import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Search, Music2, MapPin, User as UserIcon } from "lucide-react";
import { useFeed } from "@/hooks/use-feed";
import { useQuery } from "@tanstack/react-query";

type ArtistResult = {
  name: string;
  count: number;
};

type VenueResult = {
  id: string;
  name: string;
  count: number;
};

type UserResult = {
  id: string;
  username?: string;
  displayName?: string;
};


export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const { data: feed = [], isLoading: feedLoading } = useFeed();
  

  const { data: users = [], isLoading: usersLoading } = useQuery<UserResult[]>({
    queryKey: ["/api/users/search", trimmedQuery],
    queryFn: async () => {
      if (!trimmedQuery) return [];

      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(trimmedQuery)}`,
        { credentials: "include" }
      );

      if (!res.ok) return [];
      return (await res.json()) as UserResult[];
    },
    enabled: !!trimmedQuery,
    retry: false,
  });

  const artistResults = useMemo<ArtistResult[]>(() => {
  if (!trimmedQuery) return [];

  const artistMap = new Map<string, ArtistResult>();

  for (const rawItem of Array.isArray(feed) ? feed : []) {
    const item = rawItem as any;

    const artistName =
      typeof item?.name === "string" ? item.name.trim() : "";

    if (!artistName) continue;

    const key = artistName.toLowerCase();
    const existing = artistMap.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      artistMap.set(key, { name: artistName, count: 1 });
    }
  }

  return Array.from(artistMap.values())
    .filter((artist) =>
      artist.name.toLowerCase().includes(trimmedQuery.toLowerCase())
    )
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);
}, [feed, trimmedQuery]);

const venueResults = useMemo<VenueResult[]>(() => {
  if (!trimmedQuery) return [];

  const venueMap = new Map<string, VenueResult>();

  for (const rawItem of Array.isArray(feed) ? feed : []) {
    const item = rawItem as any;

    const venueName =
      typeof item?.venueName === "string" ? item.venueName.trim() : "";

    if (!venueName) continue;

    const venueId =
      item?.venueId != null ? String(item.venueId) : venueName;

    const key = venueName.toLowerCase();
    const existing = venueMap.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      venueMap.set(key, {
        id: venueId,
        name: venueName,
        count: 1,
      });
    }
  }

  return Array.from(venueMap.values())
    .filter((venue) =>
      venue.name.toLowerCase().includes(trimmedQuery.toLowerCase())
    )
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);
}, [feed, trimmedQuery]);

  const userResults = useMemo<UserResult[]>(() => {
    if (!trimmedQuery) return [];

    return (Array.isArray(users) ? users : [])
      .filter((user) => {
        const display = (user.displayName || "").toLowerCase();
        const username = (user.username || "").toLowerCase();
        return display.includes(trimmedQuery) || username.includes(trimmedQuery);
      })
      .slice(0, 8);
  }, [users, trimmedQuery]);

  const isLoading = feedLoading || usersLoading;

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--silver)" }}>
            Search
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-color)" }}>
            Find artists, venues, and people
          </p>
        </div>

        <div
          className="flex items-center gap-3 px-4 py-3 rounded-full backdrop-blur-md"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(139,92,246,0.12))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <Search className="w-5 h-5" style={{ color: "var(--muted-color)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, venues, people..."
            className="w-full bg-transparent outline-none text-base"
            style={{ color: "var(--silver)" }}
          />
        </div>

        {!trimmedQuery && (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            Start typing to search artists, venues, or people...
          </p>
        )}

        {trimmedQuery && isLoading && (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            Searching...
          </p>
        )}

        {trimmedQuery && !isLoading && (
          <div className="space-y-6 pb-6">
            <div className="space-y-3">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted-color)" }}
              >
                Artists
              </h2>

              {artistResults.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted-color)" }}>
                  No artists found
                </p>
              ) : (
                artistResults.map((artist) => (
                  <button
                    key={artist.name}
                    type="button"
                    onClick={() =>
                      setLocation(
                        `/artists/${encodeURIComponent(artist.name)}?name=${encodeURIComponent(artist.name)}`
                      )
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-raw)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "linear-gradient(135deg, var(--purple), #7B3FD8)",
                        color: "white",
                      }}
                    >
                      <Music2 className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--silver)" }}>
                        {artist.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-color)" }}>
                        {artist.count} matching gig{artist.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="space-y-3">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted-color)" }}
              >
                Venues
              </h2>

              {venueResults.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted-color)" }}>
                  No venues found
                </p>
              ) : (
                venueResults.map((venue) => (
                  <button
                    key={`${venue.id}-${venue.name}`}
                    type="button"
                    onClick={() => setLocation(`/venues/${encodeURIComponent(venue.id)}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-raw)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--silver)",
                      }}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--silver)" }}>
                        {venue.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-color)" }}>
                        {venue.count} upcoming gig{venue.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="space-y-3">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted-color)" }}
              >
                People
              </h2>

              {userResults.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted-color)" }}>
                  No people found
                </p>
              ) : (
                userResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setLocation(`/users/${encodeURIComponent(user.id)}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-raw)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--silver)",
                      }}
                    >
                      <UserIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--silver)" }}>
                        {user.displayName || user.username || "User"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-color)" }}>
                        @{user.username || "profile"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}