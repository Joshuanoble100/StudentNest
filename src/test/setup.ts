/**
 * Test environment defaults.
 *
 * `src/lib/env.ts` reads process.env once at import time, so anything the tests
 * exercise must be set here rather than stubbed inside a test file. These are
 * throwaway values for a process that never opens a socket to a database.
 */
process.env.DATABASE_URL ??=
  "postgresql://studentnest:studentnest@127.0.0.1:5433/studentnest?schema=public";
process.env.AUTH_SECRET ??= "test-only-auth-secret";
process.env.PAYMENT_PROVIDER ??= "paystack";
process.env.PAYSTACK_SECRET_KEY ??= "sk_test_local_only";
process.env.STORAGE_PROVIDER ??= "local";
process.env.EMAIL_PROVIDER ??= "mock";
process.env.MAP_PROVIDER ??= "mock";
