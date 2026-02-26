import { pgTable, text, varchar, serial, integer, boolean, timestamp, real, jsonb, primaryKey, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name"),
  username: text("username").unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isPrivate: boolean("is_private").default(false).notNull(),
  email: text("email"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  radiusKm: integer("radius_km").default(50),
  role: text("role").default("fan").notNull(), // fan | venue | admin
});

export const spotifyAccounts = pgTable("spotify_accounts", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  spotifyUserId: text("spotify_user_id").unique().notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope"),
  tokenType: text("token_type"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userArtists = pgTable("user_artists", {
  userId: varchar("user_id").references(() => users.id).notNull(),
  spotifyArtistId: text("spotify_artist_id").notNull(),
  artistName: text("artist_name").notNull(),
  affinityScore: real("affinity_score").notNull(),
  source: text("source"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.spotifyArtistId] })
  };
});

export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  suburb: text("suburb"),
  city: text("city"),
  state: text("state"),
  postcode: text("postcode"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  website: text("website"),
  instagram: text("instagram"),
  source: text("source"),
  externalPlaceId: text("external_place_id"),
  isActive: boolean("is_active").default(true),
  ownerId: varchar("owner_id").references(() => users.id),
  verificationStatus: text("verification_status").default("unverified").notNull(),
  // unverified | pending | approved | rejected
  contactEmail: text("contact_email"),
  bio: text("bio"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").unique().notNull(),
  name: text("name").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  venueName: text("venue_name"),
  venueLat: doublePrecision("venue_lat"),
  venueLng: doublePrecision("venue_lng"),
  city: text("city"),
  state: text("state"),
  ticketUrl: text("ticket_url"),
  imageUrl: text("image_url"),
  status: text("status"),
  rawJson: jsonb("raw_json"),
});

export const eventArtists = pgTable("event_artists", {
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  artistName: text("artist_name").notNull(),
  providerArtistId: text("provider_artist_id"),
  normalizedName: text("normalized_name").notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.provider, table.providerEventId, table.normalizedName] })
  };
});

export const gigSubmissions = pgTable("gig_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").default('pending').notNull(), // pending|approved|rejected
  venueId: varchar("venue_id").references(() => venues.id),
  venueName: text("venue_name"),
  eventName: text("event_name").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  ticketUrl: text("ticket_url"),
  posterUrl: text("poster_url"),
  artists: text("artists").notNull(),
  notes: text("notes"),
  submitterName: text("submitter_name"),
  submitterEmail: text("submitter_email"),
});

export const userSaves = pgTable("user_saves", {
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.eventId] })
}));

export const userLikes = pgTable("user_likes", {
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  likedAt: timestamp("liked_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.eventId] })
}));

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").references(() => users.id).notNull(),
  followingId: varchar("following_id").references(() => users.id).notNull(),
  status: text("status").default("pending").notNull(), // pending | accepted | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userShares = pgTable("user_shares", {
  userId: varchar("user_id").references(() => users.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sharedAt: timestamp("shared_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.eventId] })
}));

export const appleAccounts = pgTable("apple_accounts", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  musicUserToken: text("music_user_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertGigSubmissionSchema = createInsertSchema(gigSubmissions).omit({
  id: true,
  status: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SpotifyAccount = typeof spotifyAccounts.$inferSelect;
export type InsertSpotifyAccount = typeof spotifyAccounts.$inferInsert;
export type AppleAccount = typeof appleAccounts.$inferSelect;
export type InsertAppleAccount = typeof appleAccounts.$inferInsert;
export type UserArtist = typeof userArtists.$inferSelect;
export type InsertUserArtist = typeof userArtists.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = typeof venues.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type EventArtist = typeof eventArtists.$inferSelect;
export type InsertEventArtist = typeof eventArtists.$inferInsert;
export type GigSubmission = typeof gigSubmissions.$inferSelect;
export type InsertGigSubmission = typeof gigSubmissions.$inferInsert;
export type UserSave = typeof userSaves.$inferSelect;
export type UserLike = typeof userLikes.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = typeof follows.$inferInsert;
export type UserShare = typeof userShares.$inferSelect;
