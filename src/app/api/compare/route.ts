import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { XP } from "@/lib/game";
import { json, route } from "@/lib/http";
import { award, gainXp, runCompareJob, type Notes } from "@/lib/services";

const { videos, comparisons } = schema;

export const maxDuration = 300;

/** Runs the Compare agent on two reviewed clips. The older one is "before". */
export const POST = route(async (req: Request) => {
  const { ids } = z.object({ ids: z.array(z.string()).length(2, "Pick two videos.") }).parse(await req.json());
  const { profile, db } = await requireProfile();
  const vs = await db
    .select()
    .from(videos)
    .where(and(inArray(videos.id, ids), eq(videos.profileId, profile.id), eq(videos.status, "reviewed"), eq(videos.kind, "clip")));
  if (vs.length !== 2) throw new HttpError(400, "Upload a second video to compare.");
  vs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const notes: Notes = [];
  const [first] = await db.select({ id: comparisons.id }).from(comparisons).where(eq(comparisons.profileId, profile.id)).limit(1);
  let xp = 0;
  if (!first) {
    xp = XP.compareFirst;
    await gainXp(db, profile.id, xp, "Compared two videos", "compare", notes);
    await award(db, profile.id, "compare", notes);
  }
  const [c] = await db.insert(comparisons).values({ profileId: profile.id, videoA: vs[0].id, videoB: vs[1].id, xpAwarded: xp }).returning();
  after(() => runCompareJob(db, c.id));
  return json({ id: c.id, notes });
});
