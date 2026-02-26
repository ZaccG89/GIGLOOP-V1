import { storage } from "./storage";

export async function refreshSpotifyToken(userId: string) {
  const account = await storage.getSpotifyAccount(userId);
  if (!account) throw new Error("No Spotify account found");

  const now = new Date();
  // Refresh if expiring within 60 seconds
  if (account.expiresAt.getTime() - now.getTime() < 60000) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return account.accessToken; // Can't refresh without credentials

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refreshToken
      })
    });

    if (response.ok) {
      const data = await response.json();
      const updated = await storage.upsertSpotifyAccount({
        userId,
        spotifyUserId: account.spotifyUserId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || account.refreshToken,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: account.scope,
        tokenType: data.token_type
      });
      return updated.accessToken;
    }
  }
  return account.accessToken;
}