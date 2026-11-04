import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getAuth, requireUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { removeProfileFiles } from "@/lib/storage";

const { profiles, user } = schema;

/** Deletes the account, every profile, every row and every clip file. */
export const DELETE = route(async () => {
  const { session, db } = await requireUser();
  const ps = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, session.user.id));
  for (const p of ps) await removeProfileFiles(p.id);
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() }).catch(() => {});
  await db.delete(user).where(eq(user.id, session.user.id)); // cascades to profiles and everything below
  return json({ ok: true });
});
