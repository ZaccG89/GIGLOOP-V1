# Giggity MVP

A local gig discovery app that syncs with Spotify and Apple Music to learn user's music taste, shows nearby concerts matching their favorite artists, ingests events from Ticketmaster, and allows community gig submissions with admin moderation.

## Architecture

- **Frontend**: React + Vite + Wouter + TanStack Query + shadcn/ui (dark premium aesthetic)
- **Backend**: Express.js + TypeScript
- **Database**: Replit PostgreSQL via Drizzle ORM
- **Auth**: JWT sessions via `jose`, stored as httpOnly cookies

## Required Secrets

### Spotify
| Secret | Description | Where to get it |
|---|---|---|
| `SPOTIFY_CLIENT_ID` | App client ID | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → Create app |
| `SPOTIFY_CLIENT_SECRET` | App client secret | Same app settings |
| `SPOTIFY_REDIRECT_URI` | OAuth callback URL | Set to `https://<YOUR_REPL_DOMAIN>/api/auth/spotify/callback` |

### Apple Music
| Secret | Description | Where to get it |
|---|---|---|
| `APPLE_TEAM_ID` | Apple Developer Team ID | [Apple Developer](https://developer.apple.com/account) → Membership details |
| `APPLE_KEY_ID` | MusicKit key ID | Apple Developer → Certificates, Identifiers & Profiles → Keys → Create key with MusicKit |
| `APPLE_PRIVATE_KEY` | ES256 private key contents | Paste full contents of downloaded .p8 file (including `-----BEGIN PRIVATE KEY-----` header) |

### Ticketmaster
| Secret | Description | Where to get it |
|---|---|---|
| `TICKETMASTER_API_KEY` | API key | [Ticketmaster Developer Portal](https://developer.ticketmaster.com) |

### Other
| Secret | Description |
|---|---|
| `ADMIN_SECRET` | Password for admin panel (defaults to `admin123` if not set) |
| `SESSION_SECRET` | JWT signing secret (set automatically via Replit) |

## Key Files

| File | Purpose |
|---|---|
| `shared/schema.ts` | Database schema (users, spotify/apple accounts, events, venues, gig_submissions, user_saves, user_likes, follows, user_shares) |
| `shared/routes.ts` | Typed API route definitions |
| `server/routes.ts` | Express route handlers |
| `server/storage.ts` | Database CRUD interface |
| `server/spotify.ts` | Spotify token refresh helper |
| `server/apple.ts` | Apple Music developer token generation + library API |
| `server/feedService.ts` | Feed algorithm: Haversine distance + artist affinity scoring |
| `server/auth.ts` | JWT session creation + verification |

## Features

- **Spotify Login**: Full multi-user OAuth → stores access/refresh tokens → syncs top 50 artists
- **Apple Music Login**: MusicKit JS browser auth → music user token → syncs library artists
- **Feed**: Matches events against user's artists, filtered by radius (Haversine formula), scored by affinity + time + distance
- **Ticketmaster Ingest**: Fetches music events within 120km of Brisbane CBD
- **Venue Directory**: Browse and search venues; submit gig proposals
- **Admin Panel**: Approve/reject community submissions; approved gigs appear in feed
- **Social Profiles**: Editable profiles (displayName, username, bio, avatarUrl, isPrivate toggle); privacy-first follow system (private = approval required, public = auto-accept); follow requests with accept/reject; public user profile pages at `/users/:id` gated by follow status; share tracking on GigCard
- **Demo Mode**: 93 venues + 103 events across SE Queensland seeded on startup when no external API keys are configured

## Running

The `Start application` workflow runs `npm run dev` which starts Express (port 5000) + Vite simultaneously.
