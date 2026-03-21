import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function QuickActions() {
  const { data: user } = useAuth();
  const isGuest = !!user && !user.email;

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");

  if (!user || isGuest) return null;

  async function syncSpotify() {
    setRunning(true);
    setStatus("Syncing Spotify…");

    try {
      const res = await fetch("/api/spotify/sync-top-artists", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Sync failed");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/spotify/status"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/artists"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/feed"] });

      setStatus(`Spotify sync ✓${data?.synced ? ` (${data.synced} artists)` : ""}`);
      setTimeout(() => setStatus(""), 3000);
    } catch (e: any) {
      setStatus(`Spotify sync failed — ${e?.message || "Unknown error"}`);
      setTimeout(() => setStatus(""), 5000);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={syncSpotify}
        disabled={running}
        className="g-btn-secondary px-5 py-3 font-semibold text-sm g-silver disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {running ? "Syncing Spotify..." : "Sync Spotify"}
      </button>

      {status && (
        <p
          className="text-sm mt-2"
          style={{
            color: status.includes("failed")
              ? "#f87171"
              : "rgba(255,255,255,0.55)",
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}