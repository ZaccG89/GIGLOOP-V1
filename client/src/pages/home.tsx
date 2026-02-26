import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useFeed } from "@/hooks/use-feed";
import { Layout } from "@/components/layout";
import { Button, Card } from "@/components/ui-elements";
import { AlertCircle, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";
import QuickActions from "@/components/QuickActions";
import GigCard from "@/components/GigCard";
import LogoWordmark from "@/components/LogoWordmark";

export default function Home() {
  const { data: user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: feed, isLoading: feedLoading, error } = useFeed();

  const { data: savedIds = [] } = useQuery<string[]>({
    queryKey: ["/api/saves"],
    queryFn: async () => {
      const res = await fetch("/api/saves", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: likedIds = [] } = useQuery<string[]>({
    queryKey: ["/api/likes"],
    queryFn: async () => {
      const res = await fetch("/api/likes", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const savedSet = new Set(savedIds);
  const likedSet = new Set(likedIds);

  useEffect(() => {
    if (!userLoading && !user) setLocation("/login");
  }, [user, userLoading, setLocation]);

  if (userLoading) return null;
  if (!user) return null;

  const isLocationError = error && (error as any).code === "no_location";

  return (
    <Layout>
      <div className="mb-8">
        <LogoWordmark height="h-14" className="mb-1" />
        <p className="text-muted-foreground">Live gigs tailored to your music taste.</p>
        <QuickActions />
      </div>

      {isLocationError ? (
        <Card className="p-8 text-center border-yellow-500/30 bg-yellow-500/5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-500 mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Set Your Location First</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">We need to know where you are to find nearby gigs.</p>
          <Link href="/settings"><Button>Set Location</Button></Link>
        </Card>

      ) : feedLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ borderRadius: 18, height: 380, background: "var(--surface)", border: "1px solid var(--border-raw)" }} className="animate-pulse" />
          ))}
        </div>

      ) : !feed?.length ? (
        <Card className="p-10 text-center">
          <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No gigs in your area yet</h3>
          <p className="text-muted-foreground mb-2">Tap <strong className="text-white">Seed Demo Data</strong> above to populate the feed, or expand your radius.</p>
          <Link href="/settings" className="text-sm text-primary hover:underline">Adjust discovery radius →</Link>
        </Card>

      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          {feed.map((item) => (
            <GigCard
              key={item.event.id}
              item={item}
              initialSaved={savedSet.has(item.event.id)}
              initialLiked={likedSet.has(item.event.id)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
