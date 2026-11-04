import { desc, eq } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { streak } from "@/lib/services";

const { events } = schema;

export const GET = route(async () => {
  const { profile, db } = await requireProfile();
  const rows = await db.select().from(events).where(eq(events.profileId, profile.id)).orderBy(desc(events.createdAt)).limit(200);
  return json({
    events: rows.map((e) => ({ id: e.id, type: e.type, title: e.title, xp: e.xp, createdAt: e.createdAt })),
    streak: await streak(db, profile.id),
    playDays: profile.playDays,
  });
});
