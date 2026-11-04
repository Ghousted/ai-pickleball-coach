import { after } from "next/server";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { DAILY, XP } from "@/lib/game";
import { json, route } from "@/lib/http";
import { award, gainXp, runCompareJob, startOfToday, type Notes } from "@/lib/services";

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

  const [today] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(comparisons)
    .where(and(eq(comparisons.profileId, profile.id), gte(comparisons.createdAt, startOfToday())));
  if (today.n >= DAILY.compares) throw new HttpError(429, `You've reached today's limit of ${DAILY.compares} comparisons. Try again tomorrow.`);

  const notes: Notes = [];
  // The badge row is unique, so only one request can unlock it. That request alone gets the first-compare XP.
  const firstTime = await award(db, profile.id, "compare", notes);
  const xp = firstTime ? XP.compareFirst : 0;
  if (xp) await gainXp(db, profile.id, xp, "Compared two videos", "compare", notes);
  const [c] = await db.insert(comparisons).values({ profileId: profile.id, videoA: vs[0].id, videoB: vs[1].id, xpAwarded: xp }).returning();
  after(() => runCompareJob(db, c.id));
  return json({ id: c.id, notes });
});
