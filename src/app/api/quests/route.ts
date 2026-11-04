import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { QUESTS } from "@/lib/knowledge/pickleball";
import { activeTips, currentProgram, questForCues, startQuest, type Notes } from "@/lib/services";

const { videos, programs, drills, grades } = schema;

export const maxDuration = 300;

/** Quest home, quest path and "Choose your quest". */
export const GET = route(async () => {
  const { profile, db } = await requireProfile();
  const cur = await currentProgram(db, profile.id);
  const tipsNow = await activeTips(db, profile.id);
  const [latest] = await db
    .select({ id: videos.id, move: videos.move })
    .from(videos)
    .where(and(eq(videos.profileId, profile.id), eq(videos.kind, "clip"), eq(videos.status, "reviewed")))
    .orderBy(desc(videos.createdAt))
    .limit(1);
  // "For you": plain code picks the quest that trains the cues in the player's latest tips.
  const forYou = questForCues(tipsNow.slice(0, 5).map((t) => t.cue));

  const all = await db
    .select({ quest: programs.questKey, done: drills.done, programId: programs.id, createdAt: programs.createdAt })
    .from(drills)
    .innerJoin(programs, eq(drills.programId, programs.id))
    .where(eq(programs.profileId, profile.id));
  const progress: Record<string, number> = {};
  const perProgram: Record<string, { quest: string; n: number }> = {};
  for (const r of all) {
    perProgram[r.programId] ??= { quest: r.quest, n: 0 };
    if (r.done) perProgram[r.programId].n++;
  }
  for (const p of Object.values(perProgram)) progress[p.quest] = Math.max(progress[p.quest] ?? 0, p.n);

  const [lastGrade] = await db
    .select({ grade: grades.grade, score: grades.score, drillId: grades.drillId, title: drills.title, videoId: grades.videoId })
    .from(grades)
    .innerJoin(drills, eq(grades.drillId, drills.id))
    .innerJoin(programs, eq(drills.programId, programs.id))
    .where(eq(programs.profileId, profile.id))
    .orderBy(desc(grades.createdAt))
    .limit(1);

  const gradesByDrill: Record<string, string> = {};
  if (cur) {
    const gs = await db
      .select({ drillId: grades.drillId, grade: grades.grade })
      .from(grades)
      .innerJoin(drills, eq(grades.drillId, drills.id))
      .where(eq(drills.programId, cur.id))
      .orderBy(grades.createdAt);
    for (const g of gs) gradesByDrill[g.drillId] = g.grade;
  }

  return json({
    current: cur
      ? {
          id: cur.id,
          questKey: cur.questKey,
          name: cur.name,
          goal: cur.goal,
          badge: cur.badge,
          drills: cur.drills.map((d) => ({ id: d.id, position: d.position, title: d.title, how: d.how, minutes: d.minutes, cue: d.cue, day: d.day, done: d.done, tipId: d.tipId, grade: gradesByDrill[d.id] ?? null })),
        }
      : null,
    quests: QUESTS.map((q) => ({ key: q.key, name: q.name, desc: q.desc, badge: q.badge, progress: progress[q.key] ?? 0 })),
    forYou,
    latestVideo: latest ?? null,
    hasReview: !!latest,
    lastGrade: lastGrade ?? null,
    goal: profile.goal,
  });
});

/** Picks a quest. The Coach agent builds the program from the player's unflagged tips. */
export const POST = route(async (req: Request) => {
  const { questKey } = z.object({ questKey: z.string() }).parse(await req.json());
  const { profile, db } = await requireProfile();
  const notes: Notes = [];
  const prog = await startQuest(db, profile, questKey, notes);
  return json({ ok: true, programId: prog?.id, notes });
});
