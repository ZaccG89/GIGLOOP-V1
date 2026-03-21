import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card } from "@/components/ui-elements";

type SpotifyStatus = {
  connected: boolean;
};

export default function SpotifyConnectCard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SpotifyStatus>({
    queryKey: ["/api/auth/spotify/status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/spotify/status", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to check Spotify status");
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/spotify/sync-top-artists", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Sync failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/artists"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/spotify/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Disconnect failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/spotify/status"] });
    },
  });

  if (isLoading) return null;

  const connected = data?.connected;

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-bold mb-2">Spotify Integration</h3>

      {!connected ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Connect Spotify to personalise your gig feed.
          </p>

          <Button
            onClick={() => {
              window.location.href = "/api/auth/spotify/login";
            }}
          >
            Connect Spotify
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-green-400">
            Spotify connected
          </p>

          <div className="flex gap-3">
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? "Syncing..." : "Sync Spotify"}
            </Button>

            <Button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="g-btn-secondary"
            >
              Disconnect
            </Button>
          </div>

          {syncMutation.isSuccess && (
  <p className="text-sm text-green-400">
    Sync complete
    {syncMutation.data?.synced ? ` — ${syncMutation.data.synced} artists imported` : ""}
    {syncMutation.data?.source ? ` from ${syncMutation.data.source}` : ""}
  </p>
)}
        </div>
      )}
    </Card>
  );
}