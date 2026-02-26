import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { requireAuth, createSession } from "./auth";
import { refreshSpotifyToken } from "./spotify";
import { generateAppleDeveloperToken, getAppleMusicLibraryArtists } from "./apple";
import { buildFeedForUser, normalizeName } from "./feedService";
import { runDemoSeed } from "./demoSeed";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());
  app.use("/uploads", express.static(path.resolve("uploads")));

  app.post("/api/user/avatar", requireAuth, avatarUpload.single("avatar"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/avatars/${req.file.filename}`;
    const user = await storage.updateUserProfile(req.userId, { avatarUrl: url });
    res.json({ url: user.avatarUrl });
  });

  // Demo seed — populates venues + gigs so the app works out of the box
  app.post("/api/demo/seed", async (req, res) => {
    try {
      const result = await runDemoSeed();
      res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("Demo seed error:", e);
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // Auth config — tells the frontend which providers are available
  app.get("/api/auth/config", (req, res) => {
    res.json({
      spotify: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_REDIRECT_URI),
      appleMusic: !!(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
    });
  });

  // Spotify Auth
  app.get("/api/auth/spotify/login", (req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      return res.redirect("/login?error=spotify_not_configured");
    }

    const state = Math.random().toString(36).substring(7);
    res.cookie("spotify_oauth_state", state, { httpOnly: true, maxAge: 60 * 1000 * 10 }); // 10 mins

    const scope = "user-top-read user-read-recently-played";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope,
      redirect_uri: redirectUri,
      state
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  });

  app.get("/api/auth/spotify/callback", async (req, res) => {
    const { code, state, error } = req.query;
    const storedState = req.cookies?.spotify_oauth_state;

    if (error || !state || state !== storedState) {
      return res.redirect("/login?error=auth_failed");
    }

    res.clearCookie("spotify_oauth_state");

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect("/login?error=spotify_not_configured");
    }

    try {
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64")
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get Spotify token");
      }

      const tokenData = await tokenResponse.json();

      const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` }
      });
      
      if (!profileResponse.ok) {
        throw new Error("Failed to get Spotify profile");
      }

      const profileData = await profileResponse.json();

      let user = await storage.getUserBySpotifyId(profileData.id);
      if (!user) {
        user = await storage.createUser({
          displayName: profileData.display_name,
          email: profileData.email,
        });
      }

      await storage.upsertSpotifyAccount({
        userId: user.id,
        spotifyUserId: profileData.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scope: tokenData.scope,
        tokenType: tokenData.token_type
      });

      const sessionToken = await createSession(user.id);
      res.cookie("giggity_session", sessionToken, { httpOnly: true, maxAge: 14 * 24 * 60 * 60 * 1000 });
      
      res.redirect("/");
    } catch (e) {
      console.error(e);
      res.redirect("/login?error=auth_failed");
    }
  });

  // Guest / demo login — creates an anonymous user for testing
  app.post("/api/auth/guest", async (req, res) => {
    try {
      const user = await storage.createUser({ displayName: "Guest User" });
      const sessionToken = await createSession(user.id);
      res.cookie("giggity_session", sessionToken, { httpOnly: true, maxAge: 14 * 24 * 60 * 60 * 1000 });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create guest session" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    res.clearCookie("giggity_session");
    res.json({ success: true });
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser((req as any).userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
  });

  // User artists — manual taste management
  app.get("/api/user/artists", requireAuth, async (req, res) => {
    const artists = await storage.getUserArtists((req as any).userId);
    res.json(artists);
  });

  app.post("/api/user/artists", requireAuth, async (req, res) => {
    const { artistName } = req.body;
    if (!artistName?.trim()) return res.status(400).json({ message: "artistName required" });
    const normalized = normalizeName(artistName.trim());
    await storage.upsertUserArtists([{
      userId: (req as any).userId,
      spotifyArtistId: `manual-${normalized}`,
      artistName: artistName.trim(),
      affinityScore: 0.8,
      source: "manual",
    }]);
    res.json({ ok: true });
  });

  app.delete("/api/user/artists/:artistId", requireAuth, async (req, res) => {
    await storage.removeUserArtist((req as any).userId, req.params.artistId);
    res.json({ ok: true });
  });

  app.patch(api.user.settings.path, requireAuth, async (req, res) => {
    try {
      const input = api.user.settings.input.parse(req.body);
      const user = await storage.updateUser((req as any).userId, input);
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.spotify.syncTopArtists.path, requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    try {
      const token = await refreshSpotifyToken(userId);
      const response = await fetch("https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!response.ok) {
        return res.status(500).json({ message: "Failed to fetch artists" });
      }

      const data = await response.json();
      const artistsToInsert = data.items.map((item: any, index: number) => ({
        userId,
        spotifyArtistId: item.id,
        artistName: item.name,
        affinityScore: Math.max(0, 1 - (index / 60)),
        source: 'top_artists'
      }));

      await storage.upsertUserArtists(artistsToInsert);
      res.json({ success: true, synced: artistsToInsert.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // Apple Music Auth
  app.get(api.apple.developerToken.path, async (req, res) => {
    try {
      const token = await generateAppleDeveloperToken();
      res.json({ token });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to generate developer token" });
    }
  });

  app.post(api.apple.saveToken.path, async (req, res) => {
    try {
      const { musicUserToken } = api.apple.saveToken.input.parse(req.body);

      // If user already has a session, link Apple Music to their account
      const sessionCookie = req.cookies?.giggity_session;
      let userId: string | null = null;
      if (sessionCookie) {
        const { verifySession } = await import("./auth");
        userId = await verifySession(sessionCookie);
      }

      if (!userId) {
        // Look for existing apple account by token
        const existingUser = await storage.getUserByAppleToken(musicUserToken);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create a new user
          const newUser = await storage.createUser({ displayName: "Apple Music User" });
          userId = newUser.id;
        }
      }

      await storage.upsertAppleAccount({ userId, musicUserToken });

      const sessionToken = await createSession(userId);
      res.cookie("giggity_session", sessionToken, { httpOnly: true, maxAge: 14 * 24 * 60 * 60 * 1000 });
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message || "Failed to save Apple Music token" });
    }
  });

  app.post(api.apple.sync.path, requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    try {
      const appleAccount = await storage.getAppleAccount(userId);
      if (!appleAccount) {
        return res.status(400).json({ message: "No Apple Music account linked" });
      }

      const developerToken = await generateAppleDeveloperToken();
      const data = await getAppleMusicLibraryArtists(appleAccount.musicUserToken, developerToken);

      const artists = (data.data || []) as any[];
      const artistsToInsert = artists.map((item: any, index: number) => ({
        userId,
        spotifyArtistId: item.id,
        artistName: item.attributes?.name || item.id,
        affinityScore: Math.max(0, 1 - index / (artists.length + 1)),
        source: "apple_music",
      }));

      await storage.upsertUserArtists(artistsToInsert);
      res.json({ success: true, synced: artistsToInsert.length });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message || "Apple Music sync failed" });
    }
  });

  app.post(api.ingest.ticketmaster.path, requireAuth, async (req, res) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Ticketmaster API key not configured" });
    }

    try {
      const endDateTime = new Date();
      endDateTime.setDate(endDateTime.getDate() + 90);
      const endDateTimeStr = endDateTime.toISOString().split('.')[0] + 'Z';

      const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=-27.4705,153.0260&radius=120&unit=km&classificationName=music&locale=*&endDateTime=${endDateTimeStr}&size=100`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch Ticketmaster events");
      }

      const data = await response.json();
      const events = data._embedded?.events || [];
      let ingested = 0;

      for (const event of events) {
        const venue = event._embedded?.venues?.[0];
        const insertedEvent = await storage.upsertEvent({
          provider: 'ticketmaster',
          providerEventId: event.id,
          name: event.name,
          startTime: new Date(event.dates.start.dateTime),
          venueName: venue?.name,
          venueLat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
          venueLng: venue?.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
          city: venue?.city?.name,
          state: venue?.state?.stateCode,
          ticketUrl: event.url,
          imageUrl: event.images?.find((img: any) => img.ratio === "16_9")?.url || event.images?.[0]?.url,
          status: event.dates.status.code,
          rawJson: event
        });

        const attractions = event._embedded?.attractions || [];
        const artistsToInsert = attractions.map((a: any) => ({
          provider: 'ticketmaster',
          providerEventId: event.id,
          artistName: a.name,
          providerArtistId: a.id,
          normalizedName: normalizeName(a.name)
        }));

        await storage.upsertEventArtists(artistsToInsert);
        ingested++;
      }

      res.json({ success: true, eventsIngested: ingested });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ingest failed" });
    }
  });

  app.get(api.feed.get.path, requireAuth, async (req, res) => {
    try {
      const feed = await buildFeedForUser((req as any).userId);
      res.json(feed);
    } catch (e: any) {
      if (e.message === 'no_location') {
        res.status(400).json({ message: "Location not set", code: "no_location" });
      } else {
        res.status(500).json({ message: "Failed to generate feed" });
      }
    }
  });

  app.get(api.venues.search.path, requireAuth, async (req, res) => {
    const q = req.query.q as string || '';
    const venues = await storage.searchVenues(q);
    res.json(venues);
  });

  app.get(api.venues.get.path, requireAuth, async (req, res) => {
    const venue = await storage.getVenue(req.params.id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    res.json(venue);
  });

  app.get("/api/venues/:id/events", requireAuth, async (req, res) => {
    const venue = await storage.getVenue(req.params.id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    const upcomingEvents = await storage.getEventsByVenueName(venue.name, 42);
    res.json(upcomingEvents);
  });

  // Venue account registration & profile
  app.get("/api/venue/my-profile", requireAuth, async (req, res) => {
    const venue = await storage.getVenueByOwnerId((req as any).userId);
    if (!venue) return res.status(404).json({ message: "No venue profile found" });
    res.json(venue);
  });

  app.post("/api/venue/register", requireAuth, async (req, res) => {
    try {
      const { name, address, suburb, city, state, postcode, website, instagram, contactEmail, bio } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Venue name is required" });
      const venue = await storage.registerVenueAccount((req as any).userId, {
        name: name.trim(), address, suburb, city, state, postcode, website, instagram, contactEmail, bio,
      });
      res.status(201).json(venue);
    } catch (e: any) {
      console.error("Venue register error:", e);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Gig submissions — verified venues only
  app.post(api.gigs.submit.path, requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      // Allow admins to bypass venue check
      if (user?.role !== "admin") {
        const venue = await storage.getVenueByOwnerId(userId);
        if (!venue || venue.verificationStatus !== "approved") {
          return res.status(403).json({
            message: "Only verified venues can submit gigs. Please register your venue and wait for approval.",
            code: "not_verified_venue",
          });
        }
      }
      const input = api.gigs.submit.input.parse(req.body);
      const submission = await storage.createGigSubmission(input as any);
      res.status(201).json(submission);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Admin routes
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers["x-admin-secret"];
    const expected = process.env.ADMIN_SECRET || "admin123";
    if (secret !== expected) {
      return res.status(401).json({ message: "Unauthorized admin access" });
    }
    next();
  };

  app.get(api.admin.submissions.path, requireAdmin, async (req, res) => {
    const submissions = await storage.getPendingGigSubmissions();
    res.json(submissions);
  });

  app.post(api.admin.approve.path, requireAdmin, async (req, res) => {
    const submission = await storage.getGigSubmission(req.params.id);
    if (!submission) return res.status(404).json({ message: "Not found" });

    // Convert to event
    let venue;
    if (submission.venueId) {
      venue = await storage.getVenue(submission.venueId);
    }

    const event = await storage.upsertEvent({
      provider: 'community',
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
      status: 'onsale',
    });

    const artistNames = submission.artists.split(',').map(a => a.trim()).filter(Boolean);
    const artistsToInsert = artistNames.map(name => ({
      provider: 'community',
      providerEventId: event.providerEventId,
      artistName: name,
      normalizedName: normalizeName(name)
    }));

    await storage.upsertEventArtists(artistsToInsert);
    await storage.updateGigSubmissionStatus(submission.id, 'approved');

    res.json({ success: true });
  });

  app.post(api.admin.reject.path, requireAdmin, async (req, res) => {
    const submission = await storage.getGigSubmission(req.params.id);
    if (!submission) return res.status(404).json({ message: "Not found" });

    await storage.updateGigSubmissionStatus(submission.id, 'rejected');
    res.json({ success: true });
  });

  // Admin — venue verification
  app.get("/api/admin/venues", requireAdmin, async (req, res) => {
    const pending = await storage.getPendingVenues();
    res.json(pending);
  });

  app.post("/api/admin/venues/:id/approve", requireAdmin, async (req, res) => {
    try {
      const venue = await storage.updateVenueVerificationStatus(req.params.id, "approved");
      res.json(venue);
    } catch {
      res.status(404).json({ message: "Venue not found" });
    }
  });

  app.post("/api/admin/venues/:id/reject", requireAdmin, async (req, res) => {
    try {
      const venue = await storage.updateVenueVerificationStatus(req.params.id, "rejected");
      res.json(venue);
    } catch {
      res.status(404).json({ message: "Venue not found" });
    }
  });

  app.post("/api/saves/:eventId", requireAuth, async (req: any, res) => {
    const result = await storage.toggleSave(req.userId, req.params.eventId);
    res.json(result);
  });

  app.get("/api/saves", requireAuth, async (req: any, res) => {
    const ids = await storage.getUserSaveIds(req.userId);
    res.json(ids);
  });

  app.get("/api/saves/events", requireAuth, async (req: any, res) => {
    const saved = await storage.getUserSavedEvents(req.userId);
    res.json(saved);
  });

  app.post("/api/likes/:eventId", requireAuth, async (req: any, res) => {
    const result = await storage.toggleLike(req.userId, req.params.eventId);
    res.json(result);
  });

  app.get("/api/likes", requireAuth, async (req: any, res) => {
    const ids = await storage.getUserLikeIds(req.userId);
    res.json(ids);
  });

  app.get("/api/likes/events", requireAuth, async (req: any, res) => {
    const liked = await storage.getUserLikedEvents(req.userId);
    res.json(liked);
  });

  app.patch("/api/user/profile", requireAuth, async (req: any, res) => {
    const { displayName, username, bio, avatarUrl, isPrivate } = req.body;
    try {
      const user = await storage.updateUserProfile(req.userId, { displayName, username, bio, avatarUrl, isPrivate });
      res.json(user);
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ message: "That username is already taken" });
      throw err;
    }
  });

  app.get("/api/users/:id", requireAuth, async (req: any, res) => {
    const profile = await storage.getUserPublicProfile(req.params.id);
    if (!profile) return res.status(404).json({ message: "User not found" });
    const followStatus = req.userId !== req.params.id
      ? await storage.getFollowStatus(req.userId, req.params.id)
      : null;
    const followers = await storage.getFollowers(req.params.id);
    const following = await storage.getFollowing(req.params.id);
    res.json({
      id: profile.id,
      displayName: profile.displayName,
      username: profile.username,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      isPrivate: profile.isPrivate,
      followerCount: followers.length,
      followingCount: following.length,
      followStatus: followStatus?.status ?? null,
      followId: followStatus?.id ?? null,
    });
  });

  app.get("/api/users/:id/liked-events", requireAuth, async (req: any, res) => {
    const profile = await storage.getUserPublicProfile(req.params.id);
    if (!profile) return res.status(404).json({ message: "User not found" });
    if (req.userId !== req.params.id) {
      const followStatus = await storage.getFollowStatus(req.userId, req.params.id);
      const canView = !profile.isPrivate || followStatus?.status === "accepted";
      if (!canView) return res.status(403).json({ message: "Follow this user to see their liked events" });
    }
    const liked = await storage.getUserLikedEvents(req.params.id);
    res.json(liked);
  });

  app.post("/api/users/:id/follow", requireAuth, async (req: any, res) => {
    if (req.userId === req.params.id) return res.status(400).json({ message: "Cannot follow yourself" });
    const follow = await storage.sendFollowRequest(req.userId, req.params.id);
    res.json(follow);
  });

  app.delete("/api/users/:id/follow", requireAuth, async (req: any, res) => {
    await storage.unfollowUser(req.userId, req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/follows/requests", requireAuth, async (req: any, res) => {
    const requests = await storage.getFollowRequests(req.userId);
    res.json(requests);
  });

  app.get("/api/follows/following", requireAuth, async (req: any, res) => {
    const following = await storage.getFollowing(req.userId);
    res.json(following);
  });

  app.patch("/api/follows/:followId", requireAuth, async (req: any, res) => {
    const { status } = req.body;
    if (status !== "accepted" && status !== "rejected") return res.status(400).json({ message: "Invalid status" });
    const follow = await storage.respondToFollow(req.params.followId, status);
    res.json(follow);
  });

  app.post("/api/shares/:eventId", requireAuth, async (req: any, res) => {
    const result = await storage.toggleShare(req.userId, req.params.eventId);
    res.json(result);
  });

  app.get("/api/shares", requireAuth, async (req: any, res) => {
    const ids = await storage.getUserShareIds(req.userId);
    res.json(ids);
  });

  app.get("/api/events/:eventId/counts", async (req, res) => {
    const counts = await storage.getEventCounts(req.params.eventId);
    res.json(counts);
  });

  return httpServer;
}