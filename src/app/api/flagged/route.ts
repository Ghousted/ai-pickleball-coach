import { and, desc, eq } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { fmt } from "@/lib/game";
import { json, route } from "@/lib/http";

const { tips, videos } = schema;

export const GET = route(async () => {
  const { profile, db } = await requireProfile();
  const rows = await db
    .select({ id: tips.id, saw: tips.saw, timeSec: tips.timeSec, move: videos.move, createdAt: videos.createdAt })
    .from(tips)
    .innerJoin(videos, eq(tips.videoId, videos.id))
    .where(and(eq(videos.profileId, profile.id), eq(tips.flagged, true)))
    .orderBy(desc(videos.createdAt));
  return json({ tips: rows.map((r) => ({ id: r.id, saw: r.saw, time: fmt(r.timeSec), move: r.move, createdAt: r.createdAt })) });
});
