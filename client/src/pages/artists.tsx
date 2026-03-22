import { useLocation } from "wouter";
import { useFeed } from "@/hooks/use-feed";
import { Layout } from "@/components/layout";
import GigCard from "@/components/GigCard";

export default function ArtistsPage() {
  const [location] = useLocation();
  const { data: feed = [], isLoading } = useFeed();

  const parts = location.split("?");
  const pathParts = parts[0].split("/");
  const artistId = pathParts[pathParts.length - 1];

  const params = new URLSearchParams(parts[1] || "");
  const artistName = params.get("name") || "Artist";

  const artistGigs = feed.filter((item) =>
    item.matchedArtists?.some(
      (artist) => artist.toLowerCase() === artistName.toLowerCase()
    )
  );

  return (
    <Layout>
      <div className="px-4 py-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--silver)" }}>
            {artistName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-color)" }}>
            Upcoming gigs for this artist
          </p>
        </div>

        {isLoading ? (
          <p style={{ color: "var(--muted-color)" }}>Loading gigs...</p>
        ) : artistGigs.length === 0 ? (
          <div className="space-y-3">
            <p style={{ color: "var(--muted-color)" }}>
              No upcoming gigs found for {artistName} yet.
            </p>
            <p className="text-xs" style={{ color: "var(--muted-color)" }}>
              Artist ID: {artistId}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {artistGigs.map((item) => (
              <GigCard key={item.event.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}