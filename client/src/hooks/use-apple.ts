import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    MusicKit?: any;
  }
}

export function useSyncAppleMusic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/apple/sync-library");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: `Synced ${data.synced} artists from Apple Music` });
    },
    onError: () => {
      toast({ title: "Apple Music sync failed", variant: "destructive" });
    }
  });
}

export function useAppleMusicLogin() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // 1. Fetch developer token from backend
      const tokenRes = await fetch("/api/auth/apple/developer-token");
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err.message || "Apple Music not configured");
      }
      const { token: developerToken } = await tokenRes.json();

      // 2. Load MusicKit JS if not already loaded
      if (!window.MusicKit) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load MusicKit JS"));
          document.head.appendChild(script);
        });
      }

      // 3. Configure MusicKit
      await window.MusicKit.configure({
        developerToken,
        app: { name: "GigLoop", build: "1.0.0" },
      });

      // 4. Authorize — shows Apple Music permission dialog
      const music = window.MusicKit.getInstance();
      const musicUserToken = await music.authorize();

      if (!musicUserToken) {
        throw new Error("Authorization cancelled");
      }

      // 5. Send token to backend to create session
      const saveRes = await apiRequest("POST", "/api/auth/apple/save-token", { musicUserToken });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to connect Apple Music");
      }

      return musicUserToken;
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Apple Music login failed", variant: "destructive" });
    }
  });
}
