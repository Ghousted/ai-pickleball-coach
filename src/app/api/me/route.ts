import { and, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { levelFor } from "@/lib/game";
import { json, route } from "@/lib/http";
import { streak } from "@/lib/services";
import { provider } from "@/lib/ai/provider";
import { storageMode } from "@/lib/storage";

const { profiles, videos, badges, drills, programs, tips } = schema;

/** Everything the header, the You tab and the Badges screen need. */
export const GET = route(async () => {
  const session = await getSession();
  if (!session) return json({ signedIn: false });
  const db = await getDb();
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1);
  const base = { signedIn: true, user: { name: session.user.name, email: session.user.email }, ai: provider(), storage: storageMode() };
  if (!p) return json({ ...base, profile: null });

  const [vc] = await db.select({ n: sql<number>`count(*)::int` }).from(videos).where(and(eq(videos.profileId, p.id), eq(videos.kind, "clip")));
  const bl = await db.select().from(badges).where(eq(badges.profileId, p.id));
  const qp = await db
    .select({ quest: programs.questKey, n: sql<number>`count(*) filter (where ${drills.done})::int` })
    .from(drills)
    .innerJoin(programs, eq(drills.programId, programs.id))
    .where(eq(programs.profileId, p.id))
    .groupBy(programs.id, programs.questKey);
  const questProgress: Record<string, number> = {};
  for (const r of qp) questProgress[r.quest] = Math.max(questProgress[r.quest] ?? 0, r.n);
  const [fl] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tips)
    .innerJoin(videos, eq(tips.videoId, videos.id))
    .where(and(eq(videos.profileId, p.id), eq(tips.flagged, true)));
  const drillsDone = Object.values(questProgress).reduce((a, b) => a + b, 0);

  return json({
    ...base,
    profile: { id: p.id, name: p.name, sport: p.sport, level: p.level, playDays: p.playDays, goal: p.goal, xp: p.xp, hideWizard: p.hideWizard },
    level: levelFor(p.xp),
    streak: await streak(db, p.id),
    badges: Object.fromEntries(bl.map((b) => [b.badgeId, b.unlockedAt.toISOString()])),
    stats: { videos: vc.n, drills: drillsDone, badges: bl.length, flagged: fl.n },
    questProgress,
  });
});
