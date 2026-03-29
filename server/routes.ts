import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { requireAuth, createSession, verifySession } from "./auth";
import { refreshSpotifyToken } from "./spotify";
import {
  generateAppleDeveloperToken,
  getAppleMusicLibraryArtists,
} from "./apple";
import { buildFeedForUser, normalizeName } from "./feedService";
import { runDemoSeed } from "./demoSeed";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { spotifyAccounts, eventAttendance } from "@shared/schema";
import type { InsertUserArtist } from "@shared/schema";
import {
  userSaves,
  userShares,
  userSoundchecks,
} from "@shared/schema";


const COOKIE_NAME = "gigloop_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve("uploads/avatars");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Images only"));
  },
});

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function clearAllSessionCookies(res: Response) {
  res.clearCookie("gigloop_session", cookieOptions);
  res.clearCookie("giggity_session", cookieOptions);
}

function setSessionCookie(res: Response, sessionToken: string) {
  clearAllSessionCookies(res);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });
}

export async function registerRoutes(
  app: Express,
  httpServer: Server
): Promise<Server> {
  app.use(cookieParser());
  app.use("/uploads", express.static(path.resolve("uploads")));

  const getOptionalUserId = async (req: Request): Promise<string | null> => {
    const sessionCookie =
      (req as any).cookies?.gigloop_session ??
      (req as any).cookies?.giggity_session;

    if (!sessionCookie) return null;

    const userId = await verifySession(sessionCookie);
    return userId ?? null;
  };
  app.post("/api/ingest/ticketmaster", async (req, res) => {
  try {
    const API_KEY = process.env.TICKETMASTER_API_KEY;

    const lat = req.body?.lat || -27.4698;
    const lng = req.body?.lng || 153.0251;
    const radius = req.body?.radius || 100;

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&latlong=${lat},${lng}&radius=${radius}&unit=km&size=50&classificationName=music&sort=date,asc`;

    const response = await fetch(url);
    const data: any = await response.json();

    const rawEvents = data._embedded?.events || [];

    const mappedEvents = rawEvents.map((e: any) => {
      const venue = e._embedded?.venues?.[0];

      return {
  provider: "ticketmaster",
  providerEventId: e.id,

  name: e.name,

  startTime: e.dates?.start?.dateTime
    ? new Date(e.dates.start.dateTime)
    : null,

  venueName: venue?.name || "Unknown Venue",

  venueLat: venue?.location?.latitude
    ? parseFloat(venue.location.latitude)
    : null,

  venueLng: venue?.location?.longitude
    ? parseFloat(venue.location.longitude)
    : null,

  city: venue?.city?.name || null,
  state: venue?.state?.name || null,

  ticketUrl: e.url,
  imageUrl: e.images?.[0]?.url || null,

  status: e.dates?.status?.code || null,

  rawJson: e,
};

    });

    let inserted = 0;

    for (const event of mappedEvents) {
      const exists = await storage.getEventByExternalId?.(
       event.providerEventId,
       "ticketmaster"
      );

      if (!exists) {
        await storage.createEvent(event);
        inserted++;
      }
    }

    res.json({
      success: true,
      fetched: rawEvents.length,
      inserted,
    });
  } catch (err) {
    console.error("INGEST ERROR:", err);
    res.status(500).json({ error: "Failed to ingest events" });
  }
});

  app.post(
    "/api/user/avatar",
    requireAuth,
    avatarUpload.single("avatar"),
    async (req: any, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const url = `/uploads/avatars/${req.file.filename}`;
      const user = await storage.updateUserProfile(req.userId, {
        avatarUrl: url,
      });

      return res.json({ url: user.avatarUrl });
    }
  );

  app.post("/api/demo/seed", async (_req: Request, res: Response) => {
    try {
      const result = await runDemoSeed();
      return res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("Demo seed error:", e);
      return res.status(500).json({ ok: false, message: e.message });
    }
  });

  app.get("/api/auth/config", (_req: Request, res: Response) => {
    return res.json({
      spotify: !!(
        process.env.SPOTIFY_CLIENT_ID &&
        process.env.SPOTIFY_CLIENT_SECRET &&
        process.env.SPOTIFY_REDIRECT_URI
      ),
      appleMusic: !!(
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_PRIVATE_KEY
      ),
    });
  });

  app.post("/api/auth/guest", async (_req: Request, res: Response) => {
    try {
      const guestUser = await storage.createUser({
        displayName: "Guest User",
        role: "fan",
        radiusKm: 150,
      } as any);

      const sessionToken = await createSession(guestUser.id);
      setSessionCookie(res, sessionToken);

      const { passwordHash: _passwordHash, ...safeUser } = guestUser as any;

      return res.status(201).json({
        success: true,
        user: safeUser,
        isGuest: true,
      });
    } catch (error) {
      console.error("Guest auth error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create guest session",
      });
    }
  });

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        displayName: z
          .string()
          .trim()
          .min(2, "Display name must be at least 2 characters")
          .max(80),
        username: z
          .string()
          .trim()
          .min(3, "Username must be at least 3 characters")
          .max(30)
          .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only use letters, numbers, and underscores"
          ),
        email: z.string().trim().email("Enter a valid email"),
        password: z
          .string()
          .min(6, "Password must be at least 6 characters")
          .max(100),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: parsed.error.issues[0]?.message || "Invalid signup details",
        });
      }

      const { displayName, username, email, password } = parsed.data;

      const existingEmail = await storage.getUserByEmail(email.toLowerCase());
      if (existingEmail) {
        return res
          .status(409)
          .json({ message: "That email is already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res
          .status(409)
          .json({ message: "That username is already taken" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user: any = await storage.createUser({
        displayName,
        username,
        email: email.toLowerCase(),
        passwordHash,
        role: "fan",
        radiusKm: 150,
      } as any);

     
      const token = await createSession((user as any).id);
      setSessionCookie(res, token);
      
      return res.status(201).json(user);
    } catch (e: any) {
      console.error("Signup error:", e);
      return res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      });

      const { email, password } = schema.parse(req.body);

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !(user as any).passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(
        password,
        (user as any).passwordHash
      );

      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const sessionToken = await createSession(user.id);
      setSessionCookie(res, sessionToken);

      const { passwordHash: _passwordHash, ...safeUser } = user as any;
      return res.json(safeUser);
    } catch (e: any) {
      if (e?.name === "ZodError") {
        return res.status(400).json({ message: "Invalid login details" });
      }
      console.error("Login error:", e);
      return res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post(api.auth.logout.path, (_req: Request, res: Response) => {
    clearAllSessionCookies(res);
    return res.json({ success: true });
  });

  app.get(api.auth.me.path, async (req: Request, res: Response) => {
    try {
      const userId = await getOptionalUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      return res.json(user);
    } catch (error) {
      console.error("GET /api/auth/me error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    "/api/spotify/sync-top-artists",
    requireAuth,
    async (req: any, res: Response) => {
      try {
        console.log("SPOTIFY SYNC ROUTE HIT");

        const account = await storage.getSpotifyAccount(req.userId);
        console.log("SPOTIFY ACCOUNT FOUND:", !!account, "USER:", req.userId);
        console.log("SPOTIFY ACCOUNT SCOPE:", account?.scope);

        if (!account) {
          return res.status(400).json({ message: "Spotify not connected" });
        }

        const accessToken = await refreshSpotifyToken(req.userId);
        console.log("SPOTIFY TOKEN REFRESHED");

        const topArtistsResponse = await fetch(
          "https://api.spotify.com/v1/me/top/artists?limit=20",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log("SPOTIFY TOP ARTISTS STATUS:", topArtistsResponse.status);

        if (!topArtistsResponse.ok) {
          const body = await topArtistsResponse.text();
          console.error("Spotify top artists fetch failed:", body);
          return res
            .status(500)
            .json({ message: "Failed to fetch top artists" });
        }

        const topArtistsData: any = await topArtistsResponse.json();
        let items = topArtistsData?.items || [];

        console.log("SPOTIFY TOP ARTISTS COUNT:", items.length);

        if (!items.length) {
          const followedArtistsResponse = await fetch(
            "https://api.spotify.com/v1/me/following?type=artist&limit=20",
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          console.log(
            "SPOTIFY FOLLOWED ARTISTS STATUS:",
            followedArtistsResponse.status
          );

          if (followedArtistsResponse.ok) {
            const followedArtistsData: any =
              await followedArtistsResponse.json();
            items = followedArtistsData?.artists?.items || [];
          }

          console.log("SPOTIFY FOLLOWED ARTISTS COUNT:", items.length);
        }

        const artists: InsertUserArtist[] = items.map(
          (artist: any, index: number) => ({
            userId: req.userId,
            spotifyArtistId: artist.id,
            artistName: artist.name,
            artistImageUrl: artist.images?.[0]?.url ?? null,
            affinityScore: Math.max(0, 1 - index / ((items.length || 1) + 1)),
            source: topArtistsData?.items?.length
              ? "spotify_top_artists"
              : "spotify_followed_artists",
          })
        );

        console.log("MAPPED ARTISTS:", artists.length);
        console.log("FIRST ARTIST:", artists[0]);

        if (!artists.length) {
          return res.status(400).json({
            message:
              "Spotify returned no top or followed artists. Use this Spotify account a bit more, follow some artists, then try again.",
          });
        }

        await storage.upsertUserArtists(artists);
        console.log("UPSERT COMPLETE");

        const savedArtists = await storage.getUserArtists(req.userId);
        console.log("ARTISTS AFTER UPSERT:", savedArtists.length);
        console.log("FIRST SAVED ARTIST:", savedArtists[0]);

        return res.json({
          synced: savedArtists.length,
          source: topArtistsData?.items?.length
            ? "top-artists"
            : "followed-artists",
        });
      } catch (err) {
        console.error("Spotify sync error:", err);
        return res.status(500).json({ message: "Spotify sync failed" });
      }
    }
  );

  app.get("/api/auth/spotify/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    return res.redirect("/?error=spotify_auth_failed");
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = "https://gigloop-v1.onrender.com/api/auth/spotify/callback";

  try {
    // 🔹 TOKEN EXCHANGE
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData: any = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Spotify token failed:", tokenData);
      return res.redirect("/?error=spotify_token_failed");
    }

    // 🔹 PROFILE
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileRes.json();

    if (!profile?.id) {
    return res.redirect("/?error=spotify_profile_failed");    }

    // 🔹 USER RESOLUTION
    const currentUserId = await getOptionalUserId(req);
    let user;

    if (currentUserId) {
      user = await storage.getUser(currentUserId);
    } else {
      user = await storage.getUserBySpotifyId(profile.id);

      if (!user && profile.email) {
        user = await storage.getUserByEmail(profile.email.toLowerCase());
      }

      if (!user) {
        user = await storage.createUser({
          displayName: profile.display_name || "Spotify User",
          email: profile.email?.toLowerCase?.(),
          role: "fan",
          radiusKm: 150,
        } as any);
      }
    }

    if (!user) {
      return res.redirect("/login?error=user_not_found");
    }

    // 🔹 SAVE ACCOUNT
    await storage.upsertSpotifyAccount({
      userId: user.id,
      spotifyUserId: profile.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      scope: tokenData.scope,
      tokenType: tokenData.token_type,
    });

    // 🔹 SESSION
    const sessionToken = await createSession(user.id);
    setSessionCookie(res, sessionToken);

    return res.redirect("/");
  } catch (err) {
    console.error("Spotify callback crash:", err);
    return res.redirect("/?error=spotify_crash");
  }
});


app.get("/api/auth/spotify/login", async (req: Request, res: Response) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const redirectUri = "https://gigloop-v1.onrender.com/api/auth/spotify/callback";

  const scope = [
    "user-read-email",
    "user-top-read",
    "user-follow-read",
    "user-read-recently-played",
  ].join(" ");

  const authUrl =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope,
    }).toString();

  return res.redirect(authUrl);
});


app.get("/api/auth/spotify/status", requireAuth, async (req: any, res: Response) => {
  try {
    const account = await storage.getSpotifyAccount(req.userId);

    if (!account) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      spotifyUserId: account.spotifyUserId,
      expiresAt: account.expiresAt,
    });
  } catch (err) {
    console.error("Spotify status error:", err);
    return res.status(500).json({ message: "Failed to get Spotify status" });
  }
});

  app.post(
    "/api/auth/spotify/disconnect",
    requireAuth,
    async (req: any, res: Response) => {
      try {
        await db
          .delete(spotifyAccounts)
          .where(eq(spotifyAccounts.userId, req.userId));
        return res.json({ ok: true });
      } catch (err) {
        console.error("Spotify disconnect error:", err);
        return res.status(500).json({ message: "Failed to disconnect Spotify" });
      }
    }
  );

  app.get("/api/user/artists", requireAuth, async (req: any, res: Response) => {
    const artists = await storage.getUserArtists(req.userId);
    return res.json(artists);
  });

  app.post(
    "/api/user/artists",
    requireAuth,
    async (req: any, res: Response) => {
      const { artistName } = req.body;
      if (!artistName?.trim()) {
        return res.status(400).json({ message: "artistName required" });
      }

      const normalized = normalizeName(artistName.trim());

      await storage.upsertUserArtists([
        {
          userId: req.userId,
          spotifyArtistId: `manual-${normalized}`,
          artistName: artistName.trim(),
          affinityScore: 0.8,
          source: "manual",
        },
      ]);

      return res.json({ ok: true });
    }
  );

  app.delete(
    "/api/user/artists/:artistId",
    requireAuth,
    async (req: any, res: Response) => {
      await storage.removeUserArtist(
        req.userId,
        getParam((req.params as any).artistId)
      );
      return res.json({ ok: true });
    }
  );

  app.patch(
    api.user.settings.path,
    requireAuth,
    async (req: any, res: Response) => {
      try {
        const input = api.user.settings.input.parse(req.body);
        const user = await storage.updateUser(req.userId, input);
        return res.json(user);
      } catch {
        return res.status(400).json({ message: "Invalid input" });
      }
    }
  );

  app.get(api.apple.developerToken.path, async (_req: Request, res: Response) => {
    try {
      const token = await generateAppleDeveloperToken();
      return res.json({ token });
    } catch (e: any) {
      return res
        .status(500)
        .json({ message: e.message || "Failed to generate developer token" });
    }
  });

  app.post(api.apple.saveToken.path, async (req: Request, res: Response) => {
    try {
      const { musicUserToken } = api.apple.saveToken.input.parse(req.body);

      let userId: string | null = await getOptionalUserId(req);

      if (!userId) {
        const existingUser = await storage.getUserByAppleToken(musicUserToken);

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const newUser = await storage.createUser({
            displayName: "Apple Music User",
          } as any);
          userId = newUser.id;
        }
      }

      if (!userId) {
  return res.status(500).json({ message: "Failed to resolve user" });
}

await storage.upsertAppleAccount({ userId, musicUserToken });

const sessionToken = await createSession(userId);

      return res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      return res
        .status(500)
        .json({ message: e.message || "Failed to save Apple Music token" });
    }
  });

  app.post(api.apple.sync.path, requireAuth, async (req: any, res: Response) => {
    const userId = req.userId;

    try {
      const appleAccount = await storage.getAppleAccount(userId);
      if (!appleAccount) {
        return res
          .status(400)
          .json({ message: "No Apple Music account linked" });
      }

      const developerToken = await generateAppleDeveloperToken();
      const data = await getAppleMusicLibraryArtists(
        appleAccount.musicUserToken,
        developerToken
      );

      const artists = (data.data || []) as any[];
      const artistsToInsert = artists.map((item: any, index: number) => ({
        userId,
        spotifyArtistId: item.id,
        artistName: item.attributes?.name || item.id,
        affinityScore: Math.max(0, 1 - index / (artists.length + 1)),
        source: "apple_music",
      }));

      await storage.upsertUserArtists(artistsToInsert);
      return res.json({ success: true, synced: artistsToInsert.length });
    } catch (e: any) {
      console.error(e);
      return res
        .status(500)
        .json({ message: e.message || "Apple Music sync failed" });
    }
  });

  app.post(
    api.ingest.ticketmaster.path,
    requireAuth,
    async (_req: any, res: Response) => {
      const apiKey = process.env.TICKETMASTER_API_KEY;
      if (!apiKey) {
        return res
          .status(500)
          .json({ message: "Ticketmaster API key not configured" });
      }

      try {
        const endDateTime = new Date();
        endDateTime.setDate(endDateTime.getDate() + 90);
        const endDateTimeStr = endDateTime.toISOString().split(".")[0] + "Z";

        const response = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=-27.4705,153.0260&radius=120&unit=km&classificationName=music&locale=*&endDateTime=${endDateTimeStr}&size=100`
        );

        if (!response.ok) throw new Error("Failed to fetch Ticketmaster events");

        const data = await response.json();
        const events = data._embedded?.events || [];
        let ingested = 0;

        for (const event of events) {
          const venue = event._embedded?.venues?.[0];

          await storage.upsertEvent({
            provider: "ticketmaster",
            providerEventId: event.id,
            name: event.name,
            startTime: new Date(event.dates.start.dateTime),
            venueName: venue?.name,
            venueLat: venue?.location?.latitude
              ? parseFloat(venue.location.latitude)
              : undefined,
            venueLng: venue?.location?.longitude
              ? parseFloat(venue.location.longitude)
              : undefined,
            city: venue?.city?.name,
            state: venue?.state?.stateCode,
            ticketUrl: event.url,
            imageUrl:
              event.images?.find((img: any) => img.ratio === "16_9")?.url ||
              event.images?.[0]?.url,
            status: event.dates.status.code,
            rawJson: event,
          });

          const attractions = event._embedded?.attractions || [];
          const artistsToInsert = attractions.map((a: any) => ({
            provider: "ticketmaster",
            providerEventId: event.id,
            artistName: a.name,
            providerArtistId: a.id,
            normalizedName: normalizeName(a.name),
          }));

          await storage.upsertEventArtists(artistsToInsert);
          ingested++;
        }

        return res.json({ success: true, eventsIngested: ingested });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Ingest failed" });
      }
    }
  );

  app.get(api.feed.get.path, async (req: Request, res: Response) => {
  try {
    const userId = await getOptionalUserId(req);
    const feed = await buildFeedForUser(userId ?? null);
    return res.json(feed);
  } catch (e: any) {
    console.error("GET FEED ERROR:", e);

    try {
      const events = await storage.getUpcomingEvents(42);
      return res.json(
        events.map((event) => ({
          event,
          matchScore: 0,
          distanceKm: undefined,
          matchedArtists: [],
        }))
      );
    } catch {
      return res.status(500).json({ message: "Failed to generate feed" });
    }
  }
});

  app.get(api.venues.search.path, async (req: Request, res: Response) => {
    const q = (req.query.q as string) || "";
    const venues = await storage.searchVenues(q);
    return res.json(venues);
  });

  app.get(api.venues.get.path, async (req: Request, res: Response) => {
    const id = getParam((req.params as any).id);
    const venue = await storage.getVenue(id);

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    return res.json(venue);
  });

  app.get("/api/venues/:id/events", async (req: Request, res: Response) => {
    const id = getParam((req.params as any).id);
    const venue = await storage.getVenue(id);

    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const upcomingEvents = await storage.getEventsByVenueName(venue.name, 42);
    return res.json(upcomingEvents);
  });

    app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = getParam((req.params as any).id);
      const event = await storage.getEventById(id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const counts = await storage.getEventCounts(id);

      return res.json({
        event,
        counts,
      });
    } catch (error) {
      console.error("Error fetching event:", error);
      return res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.get("/api/events/:id/attendance", async (req: any, res: Response) => {
  try {
    const eventId = Number(req.params.id);

    const attendees = await db
      .select()
      .from(eventAttendance)
      .where(eq(eventAttendance.eventId, eventId));

    const userId = req.userId ? Number(req.userId) : null;

    const going = !!userId && attendees.some((a) => a.userId === userId);

    res.json({
      count: attendees.length,
      going,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

  app.get("/api/events/:id/counts", async (req: any, res) => {
  try {
    const eventId = req.params.id;

    const token =
      req.cookies?.gigloop_session ||
      req.cookies?.GigLoop_session ||
      req.cookies?.giggity_session ||
      req.cookies?.Giggity_session;

    const userId = token ? await verifySession(token) : null;

    const counts = await storage.getEventCounts(eventId);

    let saved = false;
    let shared = false;
    let soundchecked = false;

    if (userId) {
      const saves = await db
        .select()
        .from(userSaves)
        .where(and(eq(userSaves.userId, userId), eq(userSaves.eventId, eventId)));

      const shares = await db
        .select()
        .from(userShares)
        .where(and(eq(userShares.userId, userId), eq(userShares.eventId, eventId)));

      const soundchecks = await db
        .select()
        .from(userSoundchecks)
        .where(
          and(
            eq(userSoundchecks.userId, userId),
            eq(userSoundchecks.eventId, eventId)
          )
        );

      saved = saves.length > 0;
      shared = shares.length > 0;
      soundchecked = soundchecks.length > 0;
    }

    res.json({
    saveCount: counts.saves,
    shareCount: counts.shares,
    soundcheckCount: counts.soundchecks,
    saved,
    shared,
    soundchecked,
});
  } catch (error) {
    console.error("Error fetching event counts:", error);
    res.status(500).json({ message: "Failed to fetch counts" });
  }
});

  app.get("/api/venue/my-profile", requireAuth, async (req: any, res: Response) => {
    const venue = await storage.getVenueByOwnerId(req.userId);
    if (!venue) {
      return res.status(404).json({ message: "No venue profile found" });
    }
    return res.json(venue);
  });

  app.post("/api/venue/register", requireAuth, async (req: any, res: Response) => {
    try {
      const {
        name,
        address,
        suburb,
        city,
        state,
        postcode,
        website,
        instagram,
        contactEmail,
        bio,
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ message: "Venue name is required" });
      }

      const venue = await storage.registerVenueAccount(req.userId, {
        name: name.trim(),
        address,
        suburb,
        city,
        state,
        postcode,
        website,
        instagram,
        contactEmail,
        bio,
      });

      return res.status(201).json(venue);
    } catch (e: any) {
      console.error("Venue register error:", e);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post(api.gigs.submit.path, requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);

      if (
  (user as any)?.role !== "admin" &&
  !(user as any)?.email?.includes("admin") &&
  (user as any)?.username !== "Admin"
) {
  return res.status(403).json({ message: "Admin only" });
}

      const input = api.gigs.submit.input.parse(req.body);
      const submission = await storage.createGigSubmission(input as any);
      return res.status(201).json(submission);
    } catch {
      return res.status(400).json({ message: "Invalid input" });
    }
  });

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers["x-admin-secret"];
    const expected = process.env.ADMIN_SECRET || "admin123";
    if (secret !== expected) {
      return res.status(401).json({ message: "Unauthorized admin access" });
    }
    next();
  };

  app.post("/api/admin/events/create", requireAuth, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.userId);

    if (
      (user as any)?.role !== "admin" &&
      !(user as any)?.email?.includes("admin") &&
      (user as any)?.username !== "Admin"
    ) {
      return res.status(403).json({ message: "Admin only" });
    }

    const {
      name,
      startTime,
      venueName,
      ticketUrl,
      imageUrl,
      city,
      state,
    } = req.body;

    if (!name || !startTime || !venueName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const event = await storage.createEvent({
      provider: "manual",
      providerEventId: `manual-${Date.now()}`,
      name,
      startTime: new Date(startTime),
      venueName,
      ticketUrl,
      imageUrl,
      city,
      state,
    });

    return res.status(201).json(event);
  } catch (err) {
    console.error("ADMIN CREATE EVENT ERROR:", err);
    return res.status(500).json({ message: "Failed to create event" });
  }
});

app.post("/api/admin/venues/upsert", requireAdmin, async (req: Request, res: Response) => {
  try {
    

    const {
      id,
      name,
      address,
      suburb,
      city,
      state,
      postcode,
      website,
      instagram,
      contactEmail,
      bio,
      lat,
      lng,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Venue name is required" });
    }

    const venue = await storage.upsertVenue({
      id: id || undefined, // ← important (new vs update)
      name: name.trim(),
      address,
      suburb,
      city,
      state,
      postcode,
      website,
      instagram,
      contactEmail,
      bio,
      lat,
      lng,
    });

    return res.json(venue);
  } catch (err) {
    console.error("UPSERT VENUE ERROR:", err);
    return res.status(500).json({ message: "Failed to upsert venue" });
  }
});

   app.delete("/api/admin/events/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.userId);

    if (
      (user as any)?.role !== "admin" &&
      !(user as any)?.email?.includes("admin") &&
      (user as any)?.username !== "Admin"
    ) {
      return res.status(403).json({ message: "Admin only" });
    }

    const eventId = req.params.id;
    await storage.deleteEvent(eventId);

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE EVENT ERROR:", err);
    return res.status(500).json({ message: "Failed" });
  }
});

  app.get(api.admin.submissions.path, requireAdmin, async (_req: Request, res: Response) => {
    const submissions = await storage.getPendingGigSubmissions();
    return res.json(submissions);
  });

  app.post(api.admin.approve.path, requireAdmin, async (req: Request, res: Response) => {
    const id = getParam((req.params as any).id);
    const submission = await storage.getGigSubmission(id);

    if (!submission) {
      return res.status(404).json({ message: "Not found" });
    }

    let venue;
    const venueId = submission.venueId
      ? getParam(submission.venueId as any)
      : "";

    if (venueId) {
      venue = await storage.getVenue(venueId);
    }

    const event = await storage.upsertEvent({
      provider: "community",
      providerEventId: submission.id,
      name: submission.eventName,
      startTime: submission.startTime,
      venueName: venue?.name || submission.venueName,
      venueLat: venue?.lat,
      venueLng: venue?.lng,
      city: venue?.city,
      state: venue?.state,
      ticketUrl: submission.ticketUrl,
      imageUrl: submission.posterUrl,
      status: "onsale",
    } as any);

    const artistNames = submission.artists
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const artistsToInsert = artistNames.map((name) => ({
      provider: "community",
      providerEventId: event.providerEventId,
      artistName: name,
      normalizedName: normalizeName(name),
    }));

    await storage.upsertEventArtists(artistsToInsert);
    await storage.updateGigSubmissionStatus(submission.id, "approved");

    return res.json({ success: true });
  });

  app.post(api.admin.reject.path, requireAdmin, async (req: Request, res: Response) => {
    const id = getParam((req.params as any).id);
    const submission = await storage.getGigSubmission(id);

    if (!submission) {
      return res.status(404).json({ message: "Not found" });
    }

    await storage.updateGigSubmissionStatus(submission.id, "rejected");
    return res.json({ success: true });
  });

  app.get("/api/admin/venues", requireAdmin, async (_req: Request, res: Response) => {
    const pending = await storage.getPendingVenues();
    return res.json(pending);
  });

  app.post("/api/admin/venues/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const venueId = getParam((req.params as any).id);
      const venue = await storage.updateVenueVerificationStatus(
        venueId,
        "approved"
      );
      return res.json(venue);
    } catch {
      return res.status(404).json({ message: "Venue not found" });
    }
  });

  app.get("/api/admin/venues/all", requireAdmin, async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const venues = await storage.searchVenues(q);
    return res.json(venues);
  } catch (err) {
    console.error("GET ADMIN VENUES ALL ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch venues" });
  }
});

  app.post("/api/admin/venues/:id/reject", requireAdmin, async (req: Request, res: Response) => {
    try {
      const venueId = getParam((req.params as any).id);
      const venue = await storage.updateVenueVerificationStatus(
        venueId,
        "rejected"
      );
      return res.json(venue);
    } catch {
      return res.status(404).json({ message: "Venue not found" });
    }
  });

  app.post("/api/saves/:eventId", requireAuth, async (req: any, res: Response) => {
    const result = await storage.toggleSave(req.userId, getParam(req.params.eventId));
    return res.json(result);
  });

  app.get("/api/saves", requireAuth, async (req: any, res: Response) => {
    const ids = await storage.getUserSaveIds(req.userId);
    return res.json(ids);
  });

  app.get("/api/saves/events", requireAuth, async (req: any, res: Response) => {
    const saved = await storage.getUserSavedEvents(req.userId);
    return res.json(saved);
  });

  app.post("/api/likes/:eventId", requireAuth, async (req: any, res: Response) => {
    const result = await storage.toggleLike(req.userId, getParam(req.params.eventId));
    return res.json(result);
  });

  app.post("/api/soundchecks/:eventId", requireAuth, async (req: any, res: Response) => {
    const result = await storage.toggleSoundcheck(
      req.userId,
      getParam(req.params.eventId)
    );
    return res.json(result);
  });

  app.get("/api/likes", requireAuth, async (req: any, res: Response) => {
    const ids = await storage.getUserLikeIds(req.userId);
    return res.json(ids);
  });

  app.get("/api/likes/events", requireAuth, async (req: any, res: Response) => {
    const liked = await storage.getUserLikedEvents(req.userId);
    return res.json(liked);
  });

  app.patch("/api/user/profile", requireAuth, async (req: any, res: Response) => {
    const { displayName, username, bio, avatarUrl, isPrivate } = req.body;

    try {
      const user = await storage.updateUserProfile(req.userId, {
        displayName,
        username,
        bio,
        avatarUrl,
        isPrivate,
      });
      return res.json(user);
    } catch (err: any) {
      if (err?.code === "23505") {
        return res
          .status(409)
          .json({ message: "That username is already taken" });
      }
      throw err;
    }
  });
  
  app.get("/api/users/search", requireAuth, async (req: any, res: Response) => {
  const query = String(req.query.q ?? "").trim();

  if (!query) {
    return res.json([]);
  }

  const users = await storage.searchUsers(query);

  return res.json(
    users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      username: (user as any).username,
      avatarUrl: (user as any).avatarUrl,
    }))
  );
});

  app.get("/api/users/:id", requireAuth, async (req: any, res: Response) => {
    const profileId = getParam(req.params.id);
    const profile = await storage.getUserPublicProfile(profileId);

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    const followStatus =
      req.userId !== profileId
        ? await storage.getFollowStatus(req.userId, profileId)
        : null;

    const followers = await storage.getFollowers(profileId);
    const following = await storage.getFollowing(profileId);

    return res.json({
      id: profile.id,
      displayName: profile.displayName,
      username: (profile as any).username,
      bio: (profile as any).bio,
      avatarUrl: (profile as any).avatarUrl,
      isPrivate: (profile as any).isPrivate,
      followerCount: followers.length,
      followingCount: following.length,
      followStatus: followStatus?.status ?? null,
      followId: followStatus?.id ?? null,
    });
  });

  app.post("/api/users/:id/follow", requireAuth, async (req: any, res: Response) => {
    const profileId = getParam(req.params.id);
    if (req.userId === profileId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }
    const follow = await storage.sendFollowRequest(req.userId, profileId);
    return res.json(follow);
  });

  app.delete("/api/users/:id/follow", requireAuth, async (req: any, res: Response) => {
    const profileId = getParam(req.params.id);
    await storage.unfollowUser(req.userId, profileId);
    return res.json({ ok: true });
  });

  app.get("/api/follows/requests", requireAuth, async (req: any, res: Response) => {
    const requests = await storage.getFollowRequests(req.userId);
    return res.json(requests);
  });

  app.get("/api/follows/following", requireAuth, async (req: any, res: Response) => {
    const following = await storage.getFollowing(req.userId);
    return res.json(following);
  });

  app.patch("/api/follows/:followId", requireAuth, async (req: any, res: Response) => {
    const { status } = req.body;

    if (status !== "accepted" && status !== "rejected") {
      return res.status(400).json({ message: "Invalid status" });
    }

    const follow = await storage.respondToFollow(
      getParam(req.params.followId),
      status
    );
    return res.json(follow);
  });

  app.post("/api/shares/:eventId", requireAuth, async (req: any, res: Response) => {
    const result = await storage.toggleShare(req.userId, getParam(req.params.eventId));
    return res.json(result);
  });

  app.get("/api/shares", requireAuth, async (req: any, res: Response) => {
    const ids = await storage.getUserShareIds(req.userId);
    return res.json(ids);
  });


 return httpServer;
}