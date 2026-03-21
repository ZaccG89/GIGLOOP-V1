import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { User } from "@shared/schema";

export function useAuth() {
  return useQuery<User | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, {
        credentials: "include",
      });

      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");

      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
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
    onSuccess: async () => {
      queryClient.setQueryData([api.auth.me.path], null);
      await queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      window.location.href = "/login";
    },
  });
}