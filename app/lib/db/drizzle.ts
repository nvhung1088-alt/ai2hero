import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// Prevents creating multiple database connections during development hot-reloading and parallel page prerendering
const globalForDb = global as unknown as {
  client: postgres.Sql | undefined;
};

const isProd = process.env.NODE_ENV === 'production';

export const client =
  globalForDb.client ??
  postgres(process.env.POSTGRES_URL, {
    max: isProd ? 10 : 1, // Only 1 connection in dev mode to completely prevent connection leaks through hot-reloads
    idle_timeout: isProd ? 20 : 1, // Automatically terminate idle connections after 1s in dev mode to free socket resources
    connect_timeout: 10,
    prepare: false, // Required for serverless environments (Vercel, Neon)
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
