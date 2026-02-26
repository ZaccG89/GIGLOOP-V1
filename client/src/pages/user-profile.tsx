import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { format } from "date-fns";
import { Heart, Lock, Music, Ticket, UserCheck, UserPlus, UserMinus, Clock, Globe } from "lucide-react";
import type { Event } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

type PublicProfile = {
  id: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
  followStatus: "pending" | "accepted" | "rejected" | null;
  followId: string | null;
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: authUser, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !authUser) setLocation("/login");
  }, [authUser, authLoading, setLocation]);

  const { data: profile, isLoading: profileLoading } = useQuery<PublicProfile>({
    queryKey: ["/api/users", id],
    queryFn: async () => {
      const r = await fetch(`/api/users/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("User not found");
      return r.json();
    },
    enabled: !!id && !!authUser,
  });

  const isOwnProfile = authUser?.id === id;

  const canView = !profile?.isPrivate || profile?.followStatus === "accepted" || isOwnProfile;

  const { data: likedEvents = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/users", id, "liked-events"],
    queryFn: async () => {
      const r = await fetch(`/api/users/${id}/liked-events`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!id && !!authUser && canView,
  });

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${id}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", id] });
      toast({ title: profile?.isPrivate ? "Follow request sent" : "Now following" });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/users/${id}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", id] });
      toast({ title: "Unfollowed" });
    },
  });

  if (authLoading || profileLoading) return (
    <Layout>
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-20 rounded-2xl" style={{ background: "var(--surface)" }} />)}
      </div>
    </Layout>
  );

  if (!profile) return (
    <Layout><div className="text-center py-20 text-white">User not found</div></Layout>
  );

  const initial = profile.displayName?.charAt(0).toUpperCase() || "?";

  const FollowButton = () => {
    if (isOwnProfile) return null;
    if (profile.followStatus === "accepted") return (
      <button onClick={() => unfollowMutation.mutate()} disabled={unfollowMutation.isPending}
        data-testid="button-unfollow"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: "rgba(255,255,255,0.07)", color: "var(--silver)", border: "1px solid var(--border-raw)" }}>
        <UserMinus className="w-4 h-4" /> Following
      </button>
    );
    if (profile.followStatus === "pending") return (
      <button onClick={() => unfollowMutation.mutate()} disabled={unfollowMutation.isPending}
        data-testid="button-cancel-request"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-color)", border: "1px solid var(--border-raw)" }}>
        <Clock className="w-4 h-4" /> Requested
      </button>
    );
    return (
      <button onClick={() => followMutation.mutate()} disabled={followMutation.isPending}
        data-testid="button-follow"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: "var(--purple)", color: "#05060A" }}>
        <UserPlus className="w-4 h-4" /> Follow
      </button>
    );
  };

  return (
    <Layout>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-start gap-5 mb-6">
          <div className="flex-shrink-0">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName ?? ""} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white"
                style={{ background: "linear-gradient(135deg, var(--purple), #7B3FD8)" }}>
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-white">{profile.displayName || "Unknown"}</h1>
              {profile.isPrivate
                ? <Lock className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-color)" }} />
                : <Globe className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-color)" }} />}
            </div>
            {profile.username && <p className="text-sm mt-0.5" style={{ color: "var(--purple)" }}>@{profile.username}</p>}
            {profile.bio && <p className="text-sm mt-2 line-clamp-3" style={{ color: "var(--muted-color)" }}>{profile.bio}</p>}
          </div>
        </div>

        {/* Counts + follow */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex gap-4">
            <span className="text-sm" style={{ color: "var(--muted-color)" }}>
              <span className="font-bold text-white">{profile.followerCount}</span> followers
            </span>
            <span className="text-sm" style={{ color: "var(--muted-color)" }}>
              <span className="font-bold text-white">{profile.followingCount}</span> following
            </span>
          </div>
          <FollowButton />
        </div>

        <div className="h-px w-full mb-6" style={{ background: "var(--border-raw)" }} />
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Heart className="w-4 h-4" style={{ color: "var(--purple)" }} />
          Liked Events
          {likedEvents.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(155,92,255,0.2)", color: "var(--purple)" }}>
              {likedEvents.length}
            </span>
          )}
        </h2>
      </div>

      {/* ── Content gate ─────────────────────────────────────────────── */}
      {!canView ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
          <Lock className="w-14 h-14 mx-auto mb-4 opacity-30" style={{ color: "var(--muted-color)" }} />
          <p className="text-xl font-bold text-white mb-2">Private Profile</p>
          <p className="text-sm mb-6" style={{ color: "var(--muted-color)" }}>
            {profile.followStatus === "pending"
              ? "Your follow request is pending approval."
              : "Follow this user to see their liked events."}
          </p>
          {!profile.followStatus && <FollowButton />}
        </div>
      ) : eventsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-24 rounded-2xl" style={{ background: "var(--surface)" }} />)}
        </div>
      ) : likedEvents.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--muted-color)" }}>
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-white mb-1">No liked events yet</p>
        </div>
      ) : (
        <div className="space-y-3 pb-6">
          {likedEvents.map(event => <LikedEventRow key={event.id} event={event} />)}
        </div>
      )}
    </Layout>
  );
}

function LikedEventRow({ event }: { event: Event }) {
  const formattedDate = (() => {
    try { return format(new Date(event.startTime), "EEE, MMM d • h:mma").replace(":00", ""); }
    catch { return ""; }
  })();
  return (
    <div data-testid={`row-liked-${event.id}`} className="flex items-center gap-4 p-4 rounded-2xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border-raw)" }}>
      <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden" style={{ background: "#0B0E16" }}>
        {event.imageUrl ? <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover opacity-85" />
          : <div className="w-full h-full flex items-center justify-center"><Music className="w-6 h-6" style={{ color: "var(--border-raw)" }} /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate" style={{ color: "var(--silver)" }}>{event.name}</p>
        <p className="text-sm truncate" style={{ color: "var(--muted-color)" }}>{event.venueName}</p>
        {formattedDate && <p className="text-xs mt-0.5" style={{ color: "var(--muted-color)" }}>{formattedDate}</p>}
      </div>
      {event.ticketUrl && (
        <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
          style={{ background: "var(--purple)", color: "#05060A" }}>
          <Ticket className="w-3 h-3" /> Tickets
        </a>
      )}
    </div>
  );
}
