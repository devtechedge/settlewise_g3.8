import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { seedDatabase } from '../../services/seedData.ts';
import { isDemoMode } from '../../lib/environment.ts';

// Global connection caching to persist across hot reloads and serverless invocations.
declare global {
  var _postgresPool: Pool | undefined;
  var _pglite: PGlite | undefined;
  var _demoSeed: Promise<unknown> | undefined;
}

export { isDemoMode };

const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

function createDemoDb() {
  if (!global._pglite) {
    global._pglite = new PGlite();
  }
  const demoDb = drizzlePglite(global._pglite, { schema });
  if (!global._demoSeed) {
    global._demoSeed = seedDatabase(demoDb).catch((err) => {
      console.error('Demo database seeding failed:', err);
    });
  }
  return demoDb;
}

export const db = isDemoMode() ? createDemoDb() : drizzle(createPool(), { schema });

/**
 * Resolves once the demo database has finished seeding (no-op outside demo mode).
 * Call before queries that depend on seeded demo data.
 */
export function awaitSeed(): Promise<void> {
  if (!isDemoMode()) {
    return Promise.resolve();
  }
  return global._demoSeed ? global._demoSeed.then(() => undefined) : Promise.resolve();
}
