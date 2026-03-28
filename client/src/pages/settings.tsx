import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button, Card } from "@/components/ui-elements";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useUpdateSettings } from "@/hooks/use-settings";
import {
  MapPin,
  Navigation,
  Save,
  CheckCircle,
  Search,
  X,
  LogOut,
  User,
  Music2,
  Plus,
  Building2,
  Clock,
  XCircle,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserArtist, Venue } from "@shared/schema";

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function Settings() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const updateSettings = useUpdateSettings();
  const logout = useLogout();
  const { toast } = useToast();

  const [artistInput, setArtistInput] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState<number>(150);
  const [isLocating, setIsLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGuest = !user;

  const { data: spotifyStatus, isLoading: spotifyLoading } = useQuery({
  queryKey: ["/api/auth/spotify/status"],
  queryFn: async () => {
    const res = await fetch("/api/auth/spotify/status", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch Spotify status");
    return res.json();
  },
  enabled: !!user,
});

  const { data: myArtists = [] } = useQuery<UserArtist[]>({
    queryKey: ["/api/user/artists"],
    enabled: !!user, // don't fetch for guests
  });

  const addArtist = useMutation({
    mutationFn: (artistName: string) =>
      apiRequest("POST", "/api/user/artists", { artistName }),
    onSuccess: () => {
      setArtistInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/user/artists"] });
    },
    onError: () =>
      toast({
        title: "Could not add artist",
        variant: "destructive",
      }),
  });

  const removeArtist = useMutation({
    mutationFn: (spotifyArtistId: string) =>
      apiRequest(
        "DELETE",
        `/api/user/artists/${encodeURIComponent(spotifyArtistId)}`
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/user/artists"] }),
  });

  const handleAddArtist = () => {
    const name = artistInput.trim();
    if (!name || isGuest) return;
    addArtist.mutate(name);
  };

  useEffect(() => {
    if (user && !isLoading) {
      if (user.locationLat != null) setLat(user.locationLat);
      if (user.locationLng != null) setLng(user.locationLng);
      if (user.radiusKm != null) setRadius(user.radiusKm);

      if (
        user.locationLat != null &&
        user.locationLng != null &&
        !locationLabel
      ) {
        setLocationLabel("Location saved");
      }
    }
  }, [user, isLoading, locationLabel]);

  // Guest mode: do NOT redirect to login
  // If you want to force login later, restore this block:
  // useEffect(() => {
  //   if (!isLoading && !user) setLocation("/login");
  // }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery
          )}&format=json&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );

        const data: GeoResult[] = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const handleGetCurrentLocation = () => {
    if (isGuest) {
      toast({
        title: "Guest mode",
        description: "Sign in to save location preferences.",
      });
      return;
    }

    setIsLocating(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setLocationLabel("Current location detected");
          setSearchQuery("");
          setSearchResults([]);
          setIsLocating(false);
        },
        () => {
          toast({
            title: "Could not get location",
            description: "Check your browser's location permissions.",
            variant: "destructive",
          });
          setIsLocating(false);
        }
      );
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Try a different browser.",
        variant: "destructive",
      });
      setIsLocating(false);
    }
  };

  const handleSelectResult = (result: GeoResult) => {
    const nextLat = parseFloat(result.lat);
    const nextLng = parseFloat(result.lon);

    setLat(nextLat);
    setLng(nextLng);

    const shortLabel = result.display_name
      .split(",")
      .slice(0, 2)
      .join(",")
      .trim();

    setLocationLabel(shortLabel);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSave = () => {
    if (isGuest) {
      toast({
        title: "Guest mode",
        description: "Sign in to save your settings.",
      });
      return;
    }

    updateSettings.mutate({
      locationLat: lat,
      locationLng: lng,
      radiusKm: Number(radius),
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 text-white">Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Customize your gig discovery experience.
        </p>
      </div>

      {isGuest && (
        <Card className="p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-white font-bold">Guest Mode</h2>
              <p className="text-sm text-muted-foreground">
                You can browse, but saving settings and artists requires sign in.
              </p>
            </div>
            <Button onClick={() => setLocation("/sigup")}>Sign In</Button>
          </div>
        </Card>
      )}

      <Card className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white">Location Preferences</h2>
        </div>

        <div className="space-y-4 max-w-lg">
          <div className="relative">
            <div className="flex items-center gap-2 bg-secondary border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search city or area…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-location-search"
                className="flex-1 bg-transparent text-white placeholder:text-muted-foreground text-sm outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-white transition-colors" />
                </button>
              )}
              {isSearching && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                {searchResults.map((result, i) => {
                  const parts = result.display_name.split(",");
                  const primary = parts[0].trim();
                  const secondary = parts.slice(1, 3).join(",").trim();

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      data-testid={`result-location-${i}`}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-start gap-3"
                    >
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-white font-medium">
                          {primary}
                        </p>
                        {secondary && (
                          <p className="text-xs text-muted-foreground">
                            {secondary}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Button
            variant="outline"
            onClick={handleGetCurrentLocation}
            disabled={isLocating || isGuest}
            data-testid="button-get-location"
            className="w-full text-sm py-2"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? "animate-pulse" : ""}`} />
            {isLocating ? "Locating…" : "Use my current location"}
          </Button>

          {locationLabel && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{locationLabel}</span>
            </div>
          )}

          <div className="pt-2">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Discovery Radius ({radius} km)
            </label>
            <input
              type="range"
              min="5"
              max="500"
              step="5"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              data-testid="input-radius"
              className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>5 km</span>
              <span>500 km</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending || lat == null || lng == null || isGuest}
              data-testid="button-save-settings"
              className="w-full"
            >
              <Save className="w-4 h-4" />
              {updateSettings.isPending ? "Saving…" : "Save Settings"}
            </Button>

            {updateSettings.isSuccess && (
              <p className="text-primary text-sm text-center mt-3 font-medium">
                Settings saved!
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Artists I Like</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used to personalise your gig feed
            </p>
          </div>
        </div>

        <div className="max-w-lg space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-secondary border border-white/10 rounded-xl px-4 py-3 focus-within:border-primary/50 transition-colors">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Type an artist name and press Enter…"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddArtist()}
                data-testid="input-artist-name"
                className="flex-1 bg-transparent text-white placeholder:text-muted-foreground text-sm outline-none"
                disabled={isGuest}
              />
            </div>

            <button
              onClick={handleAddArtist}
              disabled={addArtist.isPending || !artistInput.trim() || isGuest}
              data-testid="button-add-artist"
              className="g-btn-primary px-4 py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {isGuest ? (
            <p className="text-sm text-muted-foreground">
              Sign in to save favourite artists and personalise your feed.
            </p>
          ) : myArtists.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {myArtists.map((a) => (
                <div
                  key={a.spotifyArtistId}
                  data-testid={`chip-artist-${a.spotifyArtistId}`}
                  className="flex items-center gap-2 g-pill px-3 py-1.5 text-sm"
                >
                  <Music2 className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-white/90">{a.artistName}</span>
                  {a.source === "manual" && (
                    <button
                      type="button"
                      onClick={() => removeArtist.mutate(a.spotifyArtistId)}
                      className="text-muted-foreground hover:text-red-400 transition-colors ml-1"
                      data-testid={`remove-artist-${a.spotifyArtistId}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No artists added yet. Add some to get personalised gig recommendations.
            </p>
          )}
        </div>
      </Card>

            <Card className="p-6 md:p-8 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Spotify</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect Spotify to sync your artists
            </p>
          </div>
        </div>

        <div className="max-w-lg">
          {spotifyLoading ? (
            <p className="text-sm text-muted-foreground">Checking Spotify connection...</p>
          ) : spotifyStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" />
                Connected to Spotify
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/spotify/sync-top-artists", {
                        method: "POST",
                        credentials: "include",
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        throw new Error(data?.message || "Sync failed");
                      }

                      toast({
                        title: "Spotify synced",
                        description: `${data.synced ?? 0} artists imported`,
                      });

                      queryClient.invalidateQueries({ queryKey: ["/api/user/artists"] });
                    } catch (err: any) {
                      toast({
                        title: "Spotify sync failed",
                        description: err.message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Sync Artists
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/auth/spotify/disconnect", {
                        method: "POST",
                        credentials: "include",
                      });

                      if (!res.ok) {
                        throw new Error("Disconnect failed");
                      }

                      toast({
                        title: "Spotify disconnected",
                      });

                      queryClient.invalidateQueries({ queryKey: ["/api/auth/spotify/status"] });
                    } catch {
                      toast({
                        title: "Could not disconnect Spotify",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => window.location.href = "/api/auth/spotify/login"}>
              Connect Spotify
            </Button>
          )}
        </div>
      </Card>

      <VenueAccountCard />

      <Card className="p-6 md:p-8 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white">Account</h2>
        </div>

        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white font-bold text-sm">
              {user?.displayName?.charAt(0) || "G"}
            </div>
            <span className="text-sm font-medium text-white">
              {user?.displayName || "Guest User"}
            </span>
          </div>

          {isGuest ? (
            <Button className="w-full" onClick={() => setLocation("/signup")}>
              Sign In
            </Button>
          ) : (
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              data-testid="button-logout"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-medium text-sm transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {logout.isPending ? "Logging out…" : "Log Out"}
            </button>
          )}
        </div>
      </Card>
    </Layout>
  );
}

function VenueAccountCard() {
  const { data: venue, isLoading, isError } = useQuery<Venue>({
    queryKey: ["/api/venue/my-profile"],
    retry: false,
  });

  const status = venue?.verificationStatus;

  const statusBadge = () => {
    if (status === "approved") {
      return (
        <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" /> Verified
        </span>
      );
    }

    if (status === "pending") {
      return (
        <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
          <Clock className="w-3 h-3" /> Pending Review
        </span>
      );
    }

    if (status === "rejected") {
      return (
        <span className="flex items-center gap-1 bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }

    return null;
  };

  return (
    <Card className="p-6 md:p-8 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Venue Account</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register your venue to submit gigs
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
      ) : !venue || isError ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm text-muted-foreground flex-1">
            Not registered as a venue. Register your venue to start posting gigs directly to GigLoop.
          </p>
          <Link href="/venue/register">
            <button className="g-btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap">
              Register Venue
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-white font-bold text-lg">{venue.name}</p>
            {statusBadge()}
          </div>

          {venue.suburb && (
            <p className="text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-primary" />
              {venue.suburb}, {venue.city} {venue.state}
            </p>
          )}

          <Link href="/venue/register">
            <button className="text-sm text-primary hover:underline mt-1">
              {status === "rejected" ? "Update & reapply →" : "View venue profile →"}
            </button>
          </Link>
        </div>
      )}
    </Card>
  );
}
