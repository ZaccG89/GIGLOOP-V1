import { z } from 'zod';
import { users, venues, events, gigSubmissions, insertGigSubmissionSchema } from './schema';

export const errorSchemas = {
  unauthorized: z.object({ message: z.string() }),
  forbidden: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    }
  },
  user: {
    settings: {
      method: 'PATCH' as const,
      path: '/api/user/settings' as const,
      input: z.object({
        locationLat: z.number().nullable().optional(),
        locationLng: z.number().nullable().optional(),
        radiusKm: z.number().min(5).max(500).optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  spotify: {
    syncTopArtists: {
      method: 'POST' as const,
      path: '/api/spotify/sync-top-artists' as const,
      responses: {
        200: z.object({ success: z.boolean(), synced: z.number() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  apple: {
    developerToken: {
      method: 'GET' as const,
      path: '/api/auth/apple/developer-token' as const,
      responses: {
        200: z.object({ token: z.string() }),
        500: errorSchemas.internal,
      }
    },
    saveToken: {
      method: 'POST' as const,
      path: '/api/auth/apple/save-token' as const,
      input: z.object({ musicUserToken: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
        500: errorSchemas.internal,
      }
    },
    sync: {
      method: 'POST' as const,
      path: '/api/apple/sync-library' as const,
      responses: {
        200: z.object({ success: z.boolean(), synced: z.number() }),
        401: errorSchemas.unauthorized,
        500: errorSchemas.internal,
      }
    }
  },
  feed: {
    get: {
      method: 'GET' as const,
      path: '/api/feed' as const,
      responses: {
        200: z.array(z.object({
          event: z.custom<typeof events.$inferSelect>(),
          matchScore: z.number(),
          distanceKm: z.number().optional(),
          matchedArtists: z.array(z.string())
        })),
        400: z.object({ message: z.string(), code: z.literal('no_location') }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  venues: {
    search: {
      method: 'GET' as const,
      path: '/api/venues' as const,
      input: z.object({ q: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof venues.$inferSelect>()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/venues/:id' as const,
      responses: {
        200: z.custom<typeof venues.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  gigs: {
    submit: {
      method: 'POST' as const,
      path: '/api/gigs/submit' as const,
      input: z.object({
        venueId: z.string().optional(),
        venueName: z.string().optional(),
        eventName: z.string(),
        startTime: z.string(), // ISO string
        ticketUrl: z.string().url().optional().or(z.literal('')),
        posterUrl: z.string().url().optional().or(z.literal('')),
        artists: z.string(),
        notes: z.string().optional(),
        submitterName: z.string().optional(),
        submitterEmail: z.string().email().optional().or(z.literal('')),
      }),
      responses: {
        201: z.custom<typeof gigSubmissions.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  ingest: {
    ticketmaster: {
      method: 'POST' as const,
      path: '/api/ingest/ticketmaster/seq' as const,
      responses: {
        200: z.object({ success: z.boolean(), eventsIngested: z.number() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  admin: {
    submissions: {
      method: 'GET' as const,
      path: '/api/admin/submissions' as const,
      responses: {
        200: z.array(z.custom<typeof gigSubmissions.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    approve: {
      method: 'POST' as const,
      path: '/api/admin/submissions/:id/approve' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    reject: {
      method: 'POST' as const,
      path: '/api/admin/submissions/:id/reject' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
