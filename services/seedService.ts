import { db } from '../src/db/index.ts';
import { seedDatabase } from './seedData.ts';

/**
 * Seeds demo ledger data if the database is empty. Idempotent.
 */
export async function ensureSeedData() {
  return seedDatabase(db);
}
