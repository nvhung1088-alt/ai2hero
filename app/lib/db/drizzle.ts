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

// Tự động chuyển đổi sang Transaction Pooler (port 6543) của Supabase để tránh lỗi (EMAXCONNSESSION) trên Vercel Serverless
let connectionString = process.env.POSTGRES_URL;
if (connectionString.includes('supabase.com:5432')) {
  connectionString = connectionString.replace(':5432', ':6543');
  if (!connectionString.includes('pgbouncer=true')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
}

export const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: isProd ? 10 : 5, // Tăng lên 5 connection ở dev mode để chống deadlock khi Next.js Fast Refresh gọi song song
    idle_timeout: isProd ? 20 : 1, // Giải phóng ngay sau 1s để không rò rỉ connection
    connect_timeout: 10,
    prepare: false, // Required for serverless environments (Vercel, Neon, Supabase Pooler)
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
