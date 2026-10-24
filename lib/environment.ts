/**
 * Demo mode runs with an in-memory PostgreSQL (PGLite) seeded with demo data,
 * so the app works with zero external services. It is active on Vercel, when
 * DEMO_MODE=true, or when no SQL_HOST is configured.
 */
export function isDemoMode(): boolean {
  return (
    process.env.VERCEL === '1' ||
    process.env.DEMO_MODE === 'true' ||
    !process.env.SQL_HOST
  );
}
