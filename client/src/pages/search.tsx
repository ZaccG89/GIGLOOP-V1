import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Search, Music2, MapPin } from "lucide-react";
import { useFeed } from "@/hooks/use-feed";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const { data: feed = [], isLoading } = useFeed();

  const trimmedQuery = query.trim().toLowerCase();

  const artistResults = useMemo(() => {
    const artistMap = new Map<string, { name: string; count: number }>();

    feed.forEach((item) => {
      (item.matchedArtists || []).forEach((artist) => {
        const key = artist.toLowerCase();
        const existing = artistMap.get(key);

        if (existing) {
          existing.count += 1;
        } else {
          artistMap.set(key, { name: artist, count: 1 });
        }
      });
    });

    return Array.from(artistMap.values())
      .filter((artist) =>
        trimmedQuery ? artist.name.toLowerCase().includes(trimmedQuery) : false
      )
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [feed, trimmedQuery]);

  const venueResults = useMemo(() => {
    const venueMap = new Map<string, { id: string; name: string; count: number }>();

    feed.forEach((item) => {
      const venueId = String((item.event as any).venueId ?? item.event.id);
      const venueName = item.event.venueName ?? "";

      if (!venueId || !venueName) return;

      const key = venueName.toLowerCase();
      const existing = venueMap.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        venueMap.set(key, { id: venueId, name: venueName, count: 1 });
      }
    });

    return Array.from(venueMap.values())
      .filter((venue) =>
        trimmedQuery ? venue.name.toLowerCase().includes(trimmedQuery) : false
      )
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [feed, trimmedQuery]);

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--silver)" }}>
            Search
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-color)" }}>
            Find artists and venues
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
            placeholder="Search artists, venues..."
            className="w-full bg-transparent outline-none text-base"
            style={{ color: "var(--silver)" }}
          />
        </div>

        {!query && (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            Start typing to search...
          </p>
        )}

        {query && isLoading && (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            Searching...
          </p>
        )}

        {query && !isLoading && (
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
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-raw)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--purple), #7B3FD8)",
                          color: "white",
                        }}
                      >
                        <Music2 className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="font-semibold truncate"
                          style={{ color: "var(--silver)" }}
                        >
                          {artist.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--muted-color)" }}
                        >
                          {artist.count} matching gig{artist.count === 1 ? "" : "s"}
                        </p>
                      </div>
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
                    key={venue.id}
                    type="button"
                    onClick={() => setLocation(`/venues/${venue.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border-raw)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
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
                        <p
                          className="font-semibold truncate"
                          style={{ color: "var(--silver)" }}
                        >
                          {venue.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--muted-color)" }}
                        >
                          {venue.count} upcoming gig{venue.count === 1 ? "" : "s"}
                        </p>
                      </div>
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