import { db } from "./db";
import {
  users,
  spotifyAccounts,
  appleAccounts,
  userArtists,
  venues,
  events,
  eventArtists,
  gigSubmissions,
  userSaves,
  userLikes,
  follows,
  userShares,
  userSoundchecks,
  type User,
  type InsertUser,
  type SpotifyAccount,
  type InsertSpotifyAccount,
  type AppleAccount,
  type InsertAppleAccount,
  type UserArtist,
  type InsertUserArtist,
  type Venue,
  type InsertVenue,
  type Event,
  type InsertEvent,
  type EventArtist,
  type InsertEventArtist,
  type GigSubmission,
  type InsertGigSubmission,
  type Follow,
} from "@shared/schema";
import {
  eq,
  and,
  or,
  ilike,
  gte,
  lte,
  sql,
  inArray,
  count,
} from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserBySpotifyId(spotifyId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;

  // Spotify Accounts
  getSpotifyAccount(userId: string): Promise<SpotifyAccount | undefined>;
  upsertSpotifyAccount(account: InsertSpotifyAccount): Promise<SpotifyAccount>;

  // Apple Accounts
  getAppleAccount(userId: string): Promise<AppleAccount | undefined>;
  getUserByAppleToken(musicUserToken: string): Promise<User | undefined>;
  upsertAppleAccount(account: InsertAppleAccount): Promise<AppleAccount>;

  // User Artists
  getUserArtists(userId: string): Promise<UserArtist[]>;
  upsertUserArtists(artists: InsertUserArtist[]): Promise<void>;
  removeUserArtist(userId: string, spotifyArtistId: string): Promise<void>;

  // Venues
  searchVenues(query: string): Promise<Venue[]>;
  getVenue(id: string): Promise<Venue | undefined>;
  upsertVenue(venue: InsertVenue): Promise<Venue>;
  registerVenueAccount(
    userId: string,
    venueData: Partial<InsertVenue>
  ): Promise<Venue>;
  getVenueByOwnerId(userId: string): Promise<Venue | undefined>;
  getPendingVenues(): Promise<Venue[]>;
  updateVenueVerificationStatus(
    venueId: string,
    status: string
  ): Promise<Venue>;

  // Events
  getUpcomingEvents(days: number): Promise<Event[]>;
  getEventsByVenueName(venueName: string, days?: number): Promise<Event[]>;
  getEventById(eventId: string): Promise<Event | undefined>;
  getEventByExternalId(
    externalId: string,
    source: string
  ): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  upsertEvent(event: InsertEvent): Promise<Event>;
  getEventArtists(providerEventId: string): Promise<EventArtist[]>;
  upsertEventArtists(artists: InsertEventArtist[]): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;

  // Gig Submissions
  createGigSubmission(submission: InsertGigSubmission): Promise<GigSubmission>;
  getPendingGigSubmissions(): Promise<GigSubmission[]>;
  getGigSubmission(id: string): Promise<GigSubmission | undefined>;
  updateGigSubmissionStatus(id: string, status: string): Promise<GigSubmission>;

  // Saves / Likes / Shares / Soundchecks
  toggleSave(userId: string, eventId: string): Promise<{ saved: boolean }>;
  toggleLike(userId: string, eventId: string): Promise<{ liked: boolean }>;
  toggleShare(userId: string, eventId: string): Promise<{ shared: boolean }>;
  toggleSoundcheck(
    userId: string,
    eventId: string
  ): Promise<{ soundchecked: boolean }>;

  getUserSaveIds(userId: string): Promise<string[]>;
  getUserLikeIds(userId: string): Promise<string[]>;
  getUserShareIds(userId: string): Promise<string[]>;
  getUserSavedEvents(userId: string): Promise<Event[]>;
  getUserLikedEvents(userId: string): Promise<Event[]>;
  getEventCounts(
  eventId: string
  ): Promise<{ saves: number; shares: number; soundchecks: number }>;

  // Profile
  updateUserProfile(
    userId: string,
    fields: {
      displayName?: string;
      username?: string;
      bio?: string;
      avatarUrl?: string;
      isPrivate?: boolean;
    }
  ): Promise<User>;
  getUserPublicProfile(userId: string): Promise<User | undefined>;
  searchUsers(query: string): Promise<User[]>;

  // Follows
  sendFollowRequest(followerId: string, followingId: string): Promise<Follow>;
  respondToFollow(
    followId: string,
    status: "accepted" | "rejected"
  ): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  getFollowStatus(
    followerId: string,
    followingId: string
  ): Promise<Follow | undefined>;
  getFollowRequests(userId: string): Promise<(Follow & { follower: User })[]>;
  getFollowing(userId: string): Promise<(Follow & { following: User })[]>;
  getFollowers(userId: string): Promise<(Follow & { follower: User })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserBySpotifyId(spotifyId: string): Promise<User | undefined> {
    const [account] = await db
      .select()
      .from(spotifyAccounts)
      .where(eq(spotifyAccounts.spotifyUserId, spotifyId));

    if (!account) return undefined;
    return this.getUser(account.userId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getSpotifyAccount(userId: string): Promise<SpotifyAccount | undefined> {
    const [account] = await db
      .select()
      .from(spotifyAccounts)
      .where(eq(spotifyAccounts.userId, userId));
    return account;
  }

 async upsertSpotifyAccount(
  account: InsertSpotifyAccount
): Promise<SpotifyAccount> {
  const [existingBySpotifyUserId] = await db
    .select()
    .from(spotifyAccounts)
    .where(eq(spotifyAccounts.spotifyUserId, account.spotifyUserId));

  if (existingBySpotifyUserId) {
    const [updated] = await db
      .update(spotifyAccounts)
      .set({
        userId: account.userId,
        spotifyUserId: account.spotifyUserId,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        scope: account.scope,
        tokenType: account.tokenType,
        updatedAt: new Date(),
      })
      .where(eq(spotifyAccounts.spotifyUserId, account.spotifyUserId))
      .returning();

    return updated;
  }

  const [existingByUserId] = await db
    .select()
    .from(spotifyAccounts)
    .where(eq(spotifyAccounts.userId, account.userId));

  if (existingByUserId) {
    const [updated] = await db
      .update(spotifyAccounts)
      .set({
        spotifyUserId: account.spotifyUserId,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        scope: account.scope,
        tokenType: account.tokenType,
        updatedAt: new Date(),
      })
      .where(eq(spotifyAccounts.userId, account.userId))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(spotifyAccounts)
    .values(account)
    .returning();

  return created;

}
  async getAppleAccount(userId: string): Promise<AppleAccount | undefined> {
    const [account] = await db
      .select()
      .from(appleAccounts)
      .where(eq(appleAccounts.userId, userId));
    return account;
  }

  async getUserByAppleToken(
    musicUserToken: string
  ): Promise<User | undefined> {
    const [account] = await db
      .select()
      .from(appleAccounts)
      .where(eq(appleAccounts.musicUserToken, musicUserToken));

    if (!account) return undefined;
    return this.getUser(account.userId);
  }
  async upsertAppleAccount(account: InsertAppleAccount): Promise<AppleAccount> {
  const [upserted] = await db
    .insert(appleAccounts)
    .values(account)
    .onConflictDoUpdate({
      target: appleAccounts.userId,
      set: account,
    })
    .returning();

  return upserted;
}

  async getUserArtists(userId: string): Promise<UserArtist[]> {
    return await db
      .select()
      .from(userArtists)
      .where(eq(userArtists.userId, userId));
  }

  async upsertUserArtists(artists: InsertUserArtist[]): Promise<void> {
    if (artists.length === 0) return;

    await db
      .insert(userArtists)
      .values(artists)
      .onConflictDoUpdate({
        target: [userArtists.userId, userArtists.spotifyArtistId],
        set: {
          affinityScore: sql`EXCLUDED.affinity_score`,
          artistName: sql`EXCLUDED.artist_name`,
          artistImageUrl: sql`EXCLUDED.artist_image_url`,
          source: sql`EXCLUDED.source`,
          updatedAt: new Date(),
        },
      });
  }

  async removeUserArtist(
    userId: string,
    spotifyArtistId: string
  ): Promise<void> {
    await db
      .delete(userArtists)
      .where(
        and(
          eq(userArtists.userId, userId),
          eq(userArtists.spotifyArtistId, spotifyArtistId)
        )
      );
  }

  async searchVenues(query: string): Promise<Venue[]> {
    if (!query) {
      return await db.select().from(venues).orderBy(venues.name).limit(500);
    }

    return await db
      .select()
      .from(venues)
      .where(
        or(
          ilike(venues.name, `%${query}%`),
          ilike(venues.city, `%${query}%`),
          ilike(venues.suburb, `%${query}%`)
        )
      )
      .orderBy(venues.name)
      .limit(200);
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue;
  }

  async upsertVenue(venue: InsertVenue): Promise<Venue> {
    const [upserted] = await db
      .insert(venues)
      .values(venue)
      .onConflictDoUpdate({
        target: venues.id,
        set: venue,
      })
      .returning();

    return upserted;
  }

  async registerVenueAccount(
    userId: string,
    venueData: Partial<InsertVenue>
  ): Promise<Venue> {
    const existing = await this.getVenueByOwnerId(userId);

    if (existing) {
      const [updated] = await db
        .update(venues)
        .set({
          ...venueData,
          ownerId: userId,
          verificationStatus: "pending",
        })
        .where(eq(venues.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(venues)
      .values({
        name: venueData.name ?? "My Venue",
        ...venueData,
        ownerId: userId,
        source: "venue_account",
        verificationStatus: "pending",
        isActive: false,
      })
      .returning();

    await db.update(users).set({ role: "venue" }).where(eq(users.id, userId));

    return created;
  }

  async getVenueByOwnerId(userId: string): Promise<Venue | undefined> {
    const [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.ownerId, userId));
    return venue;
  }

  async getPendingVenues(): Promise<Venue[]> {
    return await db
      .select()
      .from(venues)
      .where(eq(venues.verificationStatus, "pending"))
      .orderBy(venues.name);
  }

  async updateVenueVerificationStatus(
    venueId: string,
    status: string
  ): Promise<Venue> {
    const set: Partial<typeof venues.$inferInsert> = {
      verificationStatus: status,
    };

    if (status === "approved") {
      set.isActive = true;
      set.verifiedAt = new Date();
    }

    const [updated] = await db
      .update(venues)
      .set(set)
      .where(eq(venues.id, venueId))
      .returning();

    return updated;
  }

  async getUpcomingEvents(days: number): Promise<Event[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await db
      .select()
      .from(events)
      .where(and(gte(events.startTime, now), lte(events.startTime, futureDate)))
      .orderBy(events.startTime)
      .limit(700);
  }

   async deleteVenue(id: string) {
  await db.delete(venues).where(eq(venues.id, id));
}

  async getEventsByVenueName(
    venueName: string,
    days = 42
  ): Promise<Event[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await db
      .select()
      .from(events)
      .where(
        and(
          ilike(events.venueName, venueName),
          gte(events.startTime, new Date()),
          lte(events.startTime, futureDate)
        )
      )
      .orderBy(events.startTime)
      .limit(50);
  }

  async getEventById(eventId: string): Promise<Event | undefined> {
    const result = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    return result[0];
  }

  async getEventByExternalId(
    externalId: string,
    source: string
  ): Promise<Event | undefined> {
    return await db.query.events.findFirst({
      where: (e, { and, eq }) =>
        and(eq(e.providerEventId, externalId), eq(e.provider, source)),
    });
  }

  async createEvent(event: InsertEvent): Promise<Event> {
  const [created] = await db.insert(events).values(event).returning();
  return created;
}

async deleteEvent(eventId: string): Promise<void> {
  await db.delete(events).where(eq(events.id, eventId));
}

  async upsertEvent(event: InsertEvent): Promise<Event> {
    const [upserted] = await db
      .insert(events)
      .values(event)
      .onConflictDoUpdate({
        target: events.providerEventId,
        set: {
          name: event.name,
          startTime: event.startTime,
          venueName: event.venueName,
          venueLat: event.venueLat,
          venueLng: event.venueLng,
          city: event.city,
          state: event.state,
          ticketUrl: event.ticketUrl,
          imageUrl: event.imageUrl,
          status: event.status,
          rawJson: event.rawJson,
        },
      })
      .returning();

    return upserted;
  }

  async getEventArtists(providerEventId: string): Promise<EventArtist[]> {
    return await db
      .select()
      .from(eventArtists)
      .where(eq(eventArtists.providerEventId, providerEventId));
  }

  async upsertEventArtists(artists: InsertEventArtist[]): Promise<void> {
    if (artists.length === 0) return;

    await db.insert(eventArtists).values(artists).onConflictDoNothing();
  }

  async createGigSubmission(
    submission: InsertGigSubmission
  ): Promise<GigSubmission> {
    const [created] = await db
      .insert(gigSubmissions)
      .values(submission)
      .returning();

    return created;
  }

  async getPendingGigSubmissions(): Promise<GigSubmission[]> {
    return await db
      .select()
      .from(gigSubmissions)
      .where(eq(gigSubmissions.status, "pending"));
  }

  async getGigSubmission(id: string): Promise<GigSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(gigSubmissions)
      .where(eq(gigSubmissions.id, id));

    return submission;
  }

  async updateGigSubmissionStatus(
    id: string,
    status: string
  ): Promise<GigSubmission> {
    const [updated] = await db
      .update(gigSubmissions)
      .set({ status })
      .where(eq(gigSubmissions.id, id))
      .returning();

    return updated;
  }

  async toggleSave(
    userId: string,
    eventId: string
  ): Promise<{ saved: boolean }> {
    const [existing] = await db
      .select()
      .from(userSaves)
      .where(and(eq(userSaves.userId, userId), eq(userSaves.eventId, eventId)));

    if (existing) {
      await db
        .delete(userSaves)
        .where(
          and(eq(userSaves.userId, userId), eq(userSaves.eventId, eventId))
        );
      return { saved: false };
    }

    await db.insert(userSaves).values({ userId, eventId });
    return { saved: true };
  }

  async toggleLike(
    userId: string,
    eventId: string
  ): Promise<{ liked: boolean }> {
    const [existing] = await db
      .select()
      .from(userLikes)
      .where(and(eq(userLikes.userId, userId), eq(userLikes.eventId, eventId)));

    if (existing) {
      await db
        .delete(userLikes)
        .where(
          and(eq(userLikes.userId, userId), eq(userLikes.eventId, eventId))
        );
      return { liked: false };
    }

    await db.insert(userLikes).values({ userId, eventId });
    return { liked: true };
  }

  async toggleShare(
    userId: string,
    eventId: string
  ): Promise<{ shared: boolean }> {
    const [existing] = await db
      .select()
      .from(userShares)
      .where(
        and(eq(userShares.userId, userId), eq(userShares.eventId, eventId))
      );

    if (existing) {
      await db
        .delete(userShares)
        .where(
          and(eq(userShares.userId, userId), eq(userShares.eventId, eventId))
        );
      return { shared: false };
    }

    await db.insert(userShares).values({ userId, eventId });
    return { shared: true };
  }

  async toggleSoundcheck(
    userId: string,
    eventId: string
  ): Promise<{ soundchecked: boolean }> {
    const [existing] = await db
      .select()
      .from(userSoundchecks)
      .where(
        and(
          eq(userSoundchecks.userId, userId),
          eq(userSoundchecks.eventId, eventId)
        )
      );

    if (existing) {
      await db
        .delete(userSoundchecks)
        .where(
          and(
            eq(userSoundchecks.userId, userId),
            eq(userSoundchecks.eventId, eventId)
          )
        );
      return { soundchecked: false };
    }

    await db.insert(userSoundchecks).values({ userId, eventId });
    return { soundchecked: true };
  }

  async getUserSaveIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ eventId: userSaves.eventId })
      .from(userSaves)
      .where(eq(userSaves.userId, userId));

    return rows.map((r) => r.eventId);
  }

  async getUserLikeIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ eventId: userLikes.eventId })
      .from(userLikes)
      .where(eq(userLikes.userId, userId));

    return rows.map((r) => r.eventId);
  }

  async getUserShareIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ eventId: userShares.eventId })
      .from(userShares)
      .where(eq(userShares.userId, userId));

    return rows.map((r) => r.eventId);
  }

  async getUserSavedEvents(userId: string): Promise<Event[]> {
    const saves = await db
      .select({ eventId: userSaves.eventId })
      .from(userSaves)
      .where(eq(userSaves.userId, userId));

    if (saves.length === 0) return [];

    return await db
      .select()
      .from(events)
      .where(inArray(events.id, saves.map((s) => s.eventId)));
  }

  async getUserLikedEvents(userId: string): Promise<Event[]> {
    const likes = await db
      .select({ eventId: userLikes.eventId })
      .from(userLikes)
      .where(eq(userLikes.userId, userId));

    if (likes.length === 0) return [];

    return await db
      .select()
      .from(events)
      .where(inArray(events.id, likes.map((l) => l.eventId)));
  }

  async updateUserProfile(
    userId: string,
    fields: {
      displayName?: string;
      username?: string;
      bio?: string;
      avatarUrl?: string;
      isPrivate?: boolean;
    }
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set(fields)
      .where(eq(users.id, userId))
      .returning();

    return user;
  }

  async getUserPublicProfile(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }
  
  async searchUsers(query: string): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(
      or(
        ilike(users.displayName, `%${query}%`),
        ilike(users.username, `%${query}%`)
      )
    )
    .limit(10);
}
  async sendFollowRequest(
    followerId: string,
    followingId: string
  ): Promise<Follow> {
    const target = await this.getUser(followingId);
    const status = target?.isPrivate === false ? "accepted" : "pending";

    const [existing] = await db
      .select()
      .from(follows)
      .where(
        and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
      );

    if (existing) {
      if (existing.status === "rejected") {
        const [updated] = await db
          .update(follows)
          .set({ status })
          .where(eq(follows.id, existing.id))
          .returning();

        return updated;
      }

      return existing;
    }

    const [created] = await db
      .insert(follows)
      .values({ followerId, followingId, status })
      .returning();

    return created;
  }

  async respondToFollow(
    followId: string,
    status: "accepted" | "rejected"
  ): Promise<Follow> {
    const [updated] = await db
      .update(follows)
      .set({ status })
      .where(eq(follows.id, followId))
      .returning();

    return updated;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db
      .delete(follows)
      .where(
        and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
      );
  }

  async getFollowStatus(
    followerId: string,
    followingId: string
  ): Promise<Follow | undefined> {
    const [row] = await db
      .select()
      .from(follows)
      .where(
        and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
      );

    return row;
  }

  async getFollowRequests(userId: string): Promise<(Follow & { follower: User })[]> {
    const rows = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followingId, userId), eq(follows.status, "pending")))
      .orderBy(follows.createdAt);

    const result: (Follow & { follower: User })[] = [];

    for (const row of rows) {
      const follower = await this.getUser(row.followerId);
      if (follower) result.push({ ...row, follower });

    }

    return result;
  }

  async getFollowing(userId: string): Promise<(Follow & { following: User })[]> {
    const rows = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));

    const result: (Follow & { following: User })[] = [];

    for (const row of rows) {
      const following = await this.getUser(row.followingId);
      if (following) result.push({ ...row, following });
    }

    return result;
  }

  async getFollowers(userId: string): Promise<(Follow & { follower: User })[]> {
    const rows = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followingId, userId), eq(follows.status, "accepted")));

    const result: (Follow & { follower: User })[] = [];

    for (const row of rows) {
      const follower = await this.getUser(row.followerId);
      if (follower) result.push({ ...row, follower });

    }

    return result;
  }

  async getEventCounts(
  eventId: string
): Promise<{ saves: number; shares: number; soundchecks: number }> {
  const [savesRow] = await db
    .select({ n: count() })
    .from(userSaves)
    .where(eq(userSaves.eventId, eventId));

  const [sharesRow] = await db
    .select({ n: count() })
    .from(userShares)
    .where(eq(userShares.eventId, eventId));

  const [soundRow] = await db
    .select({ n: count() })
    .from(userSoundchecks)
    .where(eq(userSoundchecks.eventId, eventId));

  return {
    saves: Number(savesRow?.n ?? 0),
    shares: Number(sharesRow?.n ?? 0),
    soundchecks: Number(soundRow?.n ?? 0),
  };

}
}
export const storage = new DatabaseStorage();