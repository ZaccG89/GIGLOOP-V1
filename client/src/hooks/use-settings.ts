import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type SettingsInput = z.infer<typeof api.user.settings.input>;

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SettingsInput) => {
      const res = await fetch(api.user.settings.path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.feed.get.path] });
    },
  });
}
