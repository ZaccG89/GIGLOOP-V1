import { SignJWT, importPKCS8 } from "jose";

export async function generateAppleDeveloperToken(): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    throw new Error("Apple Music credentials not configured");
  }

  const pemKey = privateKey.replace(/\\n/g, "\n");
  const privateKeyObj = await importPKCS8(pemKey, "ES256");

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(privateKeyObj);

  return token;
}

export async function getAppleMusicLibraryArtists(musicUserToken: string, developerToken: string) {
  const response = await fetch("https://api.music.apple.com/v1/me/library/artists?limit=100", {
    headers: {
      Authorization: `Bearer ${developerToken}`,
      "Music-User-Token": musicUserToken,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apple Music API error ${response.status}: ${body}`);
  }

  return response.json();
}
