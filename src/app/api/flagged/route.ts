import { and, desc, eq } from "drizzle-orm";
import { requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { fmt } from "@/lib/game";
import { json, route } from "@/lib/http";

const { tips, videos, drills, programs, comparisons } = schema;

/** Everything the player marked "This looks wrong": tips, drills and comparisons. */
export const GET = route(async () => {
  const { profile, db } = await requireProfile();
  const tipRows = await db
    .select({ id: tips.id, saw: tips.saw, timeSec: tips.timeSec, move: videos.move, createdAt: videos.createdAt })
    .from(tips)
    .innerJoin(videos, eq(tips.videoId, videos.id))
    .where(and(eq(videos.profileId, profile.id), eq(tips.flagged, true)))
    .orderBy(desc(videos.createdAt));
  const drillRows = await db
    .select({ id: drills.id, title: drills.title, how: drills.how, quest: programs.name, position: drills.position })
    .from(drills)
    .innerJoin(programs, eq(drills.programId, programs.id))
    .where(and(eq(programs.profileId, profile.id), eq(drills.flagged, true)))
    .orderBy(desc(programs.createdAt), drills.position);
  const compareRows = await db
    .select({ id: comparisons.id, createdAt: comparisons.createdAt, result: comparisons.result })
    .from(comparisons)
    .where(and(eq(comparisons.profileId, profile.id), eq(comparisons.flagged, true)))
    .orderBy(desc(comparisons.createdAt));
  return json({
    tips: tipRows.map((r) => ({ id: r.id, saw: r.saw, time: fmt(r.timeSec), move: r.move, createdAt: r.createdAt })),
    drills: drillRows.map((r) => ({ id: r.id, title: r.title, how: r.how, quest: r.quest, num: r.position + 1 })),
    comparisons: compareRows.map((r) => ({ id: r.id, createdAt: r.createdAt, message: r.result?.message ?? "" })),
  });
});
