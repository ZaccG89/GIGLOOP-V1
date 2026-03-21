CREATE TABLE "apple_accounts" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"music_user_token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_artists" (
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"artist_name" text NOT NULL,
	"provider_artist_id" text,
	"normalized_name" text NOT NULL,
	CONSTRAINT "event_artists_provider_provider_event_id_normalized_name_pk" PRIMARY KEY("provider","provider_event_id","normalized_name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"name" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"venue_name" text,
	"venue_lat" double precision,
	"venue_lng" double precision,
	"city" text,
	"state" text,
	"ticket_url" text,
	"image_url" text,
	"status" text,
	"raw_json" jsonb,
	CONSTRAINT "events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" varchar NOT NULL,
	"following_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gig_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"venue_id" varchar,
	"venue_name" text,
	"event_name" text NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"ticket_url" text,
	"poster_url" text,
	"artists" text NOT NULL,
	"notes" text,
	"submitter_name" text,
	"submitter_email" text
);
--> statement-breakpoint
CREATE TABLE "spotify_accounts" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"spotify_user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"token_type" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "spotify_accounts_spotify_user_id_unique" UNIQUE("spotify_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_artists" (
	"user_id" varchar NOT NULL,
	"spotify_artist_id" text NOT NULL,
	"artist_name" text NOT NULL,
	"affinity_score" real NOT NULL,
	"source" text,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_artists_user_id_spotify_artist_id_pk" PRIMARY KEY("user_id","spotify_artist_id")
);
--> statement-breakpoint
CREATE TABLE "user_likes" (
	"user_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"liked_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_likes_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "user_saves" (
	"user_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_saves_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "user_shares" (
	"user_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"shared_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_shares_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "user_soundchecks" (
	"user_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"soundchecked_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_soundchecks_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text,
	"username" text,
	"bio" text,
	"avatar_url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"email" text,
	"location_lat" double precision,
	"location_lng" double precision,
	"radius_km" integer DEFAULT 50,
	"role" text DEFAULT 'fan' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"suburb" text,
	"city" text,
	"state" text,
	"postcode" text,
	"lat" double precision,
	"lng" double precision,
	"website" text,
	"instagram" text,
	"source" text,
	"external_place_id" text,
	"is_active" boolean DEFAULT true,
	"owner_id" varchar,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"contact_email" text,
	"bio" text,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "apple_accounts" ADD CONSTRAINT "apple_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gig_submissions" ADD CONSTRAINT "gig_submissions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spotify_accounts" ADD CONSTRAINT "spotify_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_artists" ADD CONSTRAINT "user_artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saves" ADD CONSTRAINT "user_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saves" ADD CONSTRAINT "user_saves_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shares" ADD CONSTRAINT "user_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shares" ADD CONSTRAINT "user_shares_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_soundchecks" ADD CONSTRAINT "user_soundchecks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_soundchecks" ADD CONSTRAINT "user_soundchecks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;