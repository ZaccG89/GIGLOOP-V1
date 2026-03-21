import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export function useGuestLock() {
  const { data: user } = useAuth();
  const [guestLockOpen, setGuestLockOpen] = useState(false);

  const isGuest =
    !user || (user as any)?.role === "guest" || !(user as any)?.email;

  function requireAuth() {
    if (isGuest) {
      setGuestLockOpen(true);
      return false;
    }

    return true;
  }

  return {
    guestLockOpen,
    setGuestLockOpen,
    requireAuth,
    isGuest,
  };
}