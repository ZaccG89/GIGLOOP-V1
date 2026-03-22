import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Search, Music2 } from "lucide-react";
import { useFeed } from "@/hooks/use-feed";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const { data: feed = [], isLoading } = useFeed();

  const trimmedQuery = query.trim().toLowerCase();

  const artistResults = useMemo(() => {
    const artistMap = new Map<string, { name: string; count: number }>();

    (feed || []).forEach((item: any) => {
      const matchedArtists = Array.isArray(item?.matchedArtists)
        ? item.matchedArtists
        : [];

      matchedArtists.forEach((artist: string) => {
        if (!artist) return;

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
      .slice(0, 12);
  }, [feed, trimmedQuery]);

  return (
    <Layout>
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--silver)" }}>
            Search
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-color)" }}>
            Find artists
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
            placeholder="Search artists..."
            className="w-full bg-transparent outline-none text-base"
            style={{ color: "var(--silver)" }}
          />
        </div>

        {!query && (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            Start typing to search artists...
          </p>
        )}

        {query && isLoading && (
          <p className="text-sm" style={{ color: "var(--muted-color)" }}>
            Searching...
          </p>
        )}

        {query && !isLoading && (
          <div className="space-y-3 pb-6">
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
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}