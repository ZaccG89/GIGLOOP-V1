import { useLocation } from "wouter";

export default function ArtistPage() {
  const [location] = useLocation();

  // extract artist id + name from URL
  const parts = location.split("?");
  const pathParts = parts[0].split("/");
  const artistId = pathParts[pathParts.length - 1];

  const params = new URLSearchParams(parts[1]);
  const artistName = params.get("name");

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        {artistName || "Artist"}
      </h1>

      <p style={{ color: "var(--muted-color)" }}>
        Upcoming gigs coming soon...
      </p>

      <p className="text-xs mt-4" style={{ color: "var(--muted-color)" }}>
        Artist ID: {artistId}
      </p>
    </div>
  );
}