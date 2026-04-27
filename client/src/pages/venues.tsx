import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, Input } from "@/components/ui-elements";
import { useVenues } from "@/hooks/use-venues";
import { Search, MapPin, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Venues() {
  const { data: user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  
  const { data: venues, isLoading } = useVenues(debouncedSearch);

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/login");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading) return null;
  if (!user) return null;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Venues</h1>
        <p className="text-muted-foreground">Find local venues and submit missing gigs.</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search venues by name or city..." 
          className="pl-12 py-4 text-base bg-card border-white/10 shadow-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!isLoading && venues && venues.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {venues.length} venue{venues.length !== 1 ? "s" : ""}{debouncedSearch ? " found" : " in South East Queensland"}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="h-32 animate-pulse bg-card">
              <span className="sr-only">Loading…</span>
            </Card>
          ))}
        </div>
      ) : venues?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No venues found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {venues?.map(venue => (
            <Link key={venue.id} href={`/venues/${venue.id}`} data-testid={`link-venue-${venue.id}`}>
              <Card className="p-5 hover-elevate cursor-pointer h-full flex flex-col justify-between group">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
                    {venue.name}
                  </h3>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary/60" />
                    <span>
                      {[venue.suburb, venue.city, venue.state].filter(Boolean).join(", ") || "South East QLD"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs font-medium text-primary/60 uppercase tracking-wider">
                    View venue
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
