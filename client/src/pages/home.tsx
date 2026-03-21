import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useFeed } from "@/hooks/use-feed";
import { Layout } from "@/components/layout";
import { Button, Card } from "@/components/ui-elements";
import { AlertCircle, MapPin } from "lucide-react";
import { Link } from "wouter";
import GigCard from "@/components/GigCard";
import SpotifyConnectCard from "@/components/SpotifyConnectCard";

export default function Home() {
  const { data: user, isLoading: userLoading } = useAuth();
  const { data: feed, isLoading: feedLoading, error } = useFeed();

  const isGuest = !!user && !user.email;
  const showAuthButtons = !user || isGuest;

  const { data: savedIds = [] } = useQuery<string[]>({
    queryKey: ["/api/saves"],
    queryFn: async () => {
      const res = await fetch("/api/saves", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !isGuest,
  });

  const { data: soundcheckedIds = [] } = useQuery<string[]>({
    queryKey: ["/api/soundchecks"],
    queryFn: async () => {
      const res = await fetch("/api/soundchecks", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !isGuest,
  });

  const savedSet = new Set(savedIds);
  const soundcheckedSet = new Set(soundcheckedIds);

  if (userLoading) return null;

  const isLocationError = error && (error as any).code === "no_location";

  return (
    <Layout>
      <div className="mb-8 flex flex-col items-start">
       <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
  Gig
  <span className="bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]">
    Loop
  </span>
</h1>
  <p className="text-sm text-muted-foreground mt-2 mb-4">
    Live gigs tailored to your music taste.
  </p>

        {showAuthButtons && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Link href="/signup">
              <Button className="w-full sm:w-auto">
                Create Profile
              </Button>
            </Link>
          </div>
        )}

      
        {/* Spotify Connect Card */}
        {user && !isGuest && (
          <div className="mt-6">
            <SpotifyConnectCard />
          </div>
        )}
      </div>

      {isLocationError ? (
        <Card className="p-8 text-center border-yellow-500/30 bg-yellow-500/5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-500 mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Set Your Location First</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We need to know where you are to find nearby gigs.
          </p>
          <Link href="/settings">
            <Button>Set Location</Button>
          </Link>
        </Card>

      ) : feedLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: 18,
                height: 380,
                background: "var(--surface)",
                border: "1px solid var(--border-raw)",
              }}
              className="animate-pulse"
            />
          ))}
        </div>

      ) : !feed?.length ? (
        <Card className="p-10 text-center">
          <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No gigs in your area yet</h3>
          <p className="text-muted-foreground mb-2">
            Try expanding your radius or fetching live gig data.
          </p>
          <Link href="/settings" className="text-sm text-primary hover:underline">
            Adjust discovery radius →
          </Link>
        </Card>

      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          {feed.map((item: any) => (
            <Link key={item.id} href={`/events/${item.id}`}>
              <div className="cursor-pointer">
                <GigCard
                item={item}
                initialSaved={savedSet.has(item.id)}
                initialSoundchecked={soundcheckedSet.has(item.id)}
/>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}