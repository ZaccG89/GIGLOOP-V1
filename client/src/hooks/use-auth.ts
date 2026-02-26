import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { User } from "@shared/schema";

export function useAuth() {
  return useQuery<User | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}
