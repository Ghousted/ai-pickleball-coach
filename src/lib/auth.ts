import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

async function createAuth() {
  const db = await getDb();
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me-in-production-please",
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
