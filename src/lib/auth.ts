import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

const DEV_SECRET = "dev-only-secret-not-for-production";

/**
 * The key that signs session cookies. In production it must come from BETTER_AUTH_SECRET:
 * a missing or short secret stops the app instead of falling back to a key in the repo.
 */
function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret) {
    if (process.env.NODE_ENV === "production" && (secret.length < 32 || secret === DEV_SECRET)) {
      throw new Error("BETTER_AUTH_SECRET is too weak. Use at least 32 characters: openssl rand -base64 32");
    }
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is not set. Generate one with: openssl rand -base64 32");
  }
  return DEV_SECRET;
}

async function createAuth() {
  const secret = authSecret();
  const db = await getDb();
  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
    plugins: [nextCookies()],
  });
}

type Auth = Awaited<ReturnType<typeof createAuth>>;
const g = globalThis as unknown as { __auth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  g.__auth ??= createAuth().catch((err) => {
    g.__auth = undefined;
    throw err;
  });
  return g.__auth;
}

export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The signed-in user and their profile. Throws 401 or 409 (no profile yet). */
export async function requireProfile() {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Sign in first.");
  const db = await getDb();
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, session.user.id)).limit(1);
  if (!profile) throw new HttpError(409, "Set up your profile first.");
  return { session, profile, db };
}

export async function requireUser() {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Sign in first.");
  return { session, db: await getDb() };
}
