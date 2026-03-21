import { Card } from "@/components/ui-elements";

export default function SpotifyConnect() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="p-8 max-w-md text-center">
        <h2 className="text-xl font-bold mb-4">Connect Spotify</h2>

        <p className="text-muted-foreground mb-6">
          Connect your Spotify account so GigLoop can recommend gigs based on
          the artists you actually listen to.
        </p>

        <a
          href="/api/auth/spotify/login"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(29,185,84,0.3)]"
        >
          Connect Spotify
        </a>
      </Card>
    </div>
  );
}