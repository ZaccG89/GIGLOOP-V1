import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

type Action = { label: string; endpoint: string; style: "primary" | "secondary" };

const ACTIONS: Action[] = [
  { label: "Seed Demo Data", endpoint: "/api/demo/seed", style: "secondary" },
  { label: "Fetch Gigs", endpoint: "/api/ingest/ticketmaster/seq", style: "primary" },
  { label: "Sync Spotify", endpoint: "/api/spotify/sync-top-artists", style: "secondary" },
];

export default function QuickActions() {
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState<string | null>(null);

  async function run(action: Action) {
    setRunning(action.label);
    setStatus(`${action.label}…`);
    try {
      const res = await fetch(action.endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "failed");
      setStatus(`${action.label} ✓`);
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      setTimeout(() => setStatus(""), 3000);
    } catch (e: any) {
      setStatus(`${action.label} failed — ${e.message || "unknown error"}`);
      setTimeout(() => setStatus(""), 5000);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          disabled={running !== null}
          data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => run(action)}
          className={
            action.style === "primary"
              ? "g-btn-primary px-5 py-3 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              : "g-btn-secondary px-5 py-3 font-semibold text-sm g-silver disabled:opacity-50 disabled:cursor-not-allowed"
          }
        >
          {running === action.label ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              {action.label}
            </span>
          ) : (
            action.label
          )}
        </button>
      ))}

      {status && (
        <p className="text-sm w-full" style={{ color: status.includes("failed") ? "#f87171" : "rgba(255,255,255,0.55)" }}>
          {status}
        </p>
      )}
    </div>
  );
}
