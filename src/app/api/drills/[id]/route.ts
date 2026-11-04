import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { fmt } from "@/lib/game";
import { json, route } from "@/lib/http";
import { completeDrill, type Notes } from "@/lib/services";

const { drills, programs, tips, grades } = schema;
type Ctx = { params: Promise<{ id: string }> };

async function own(id: string) {
  const { profile, db } = await requireProfile();
  const [row] = await db
    .select({ d: drills, p: programs })
    .from(drills)
    .innerJoin(programs, eq(drills.programId, programs.id))
    .where(and(eq(drills.id, id), eq(programs.profileId, profile.id)));
  if (!row) throw new HttpError(404, "Drill not found.");
  return { profile, db, d: row.d, p: row.p };
}

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { db, d, p } = await own(id);
  const [tip] = d.tipId ? await db.select().from(tips).where(eq(tips.id, d.tipId)) : [];
  const [grade] = await db.select().from(grades).where(eq(grades.drillId, d.id)).orderBy(desc(grades.createdAt)).limit(1);
  const done = (await db.select({ id: drills.id }).from(drills).where(and(eq(drills.programId, p.id), eq(drills.done, true)))).length;
  const [next] = await db.select().from(drills).where(and(eq(drills.programId, p.id), eq(drills.done, false))).orderBy(drills.position).limit(1);
  return json({
    drill: { id: d.id, position: d.position, title: d.title, how: d.how, minutes: d.minutes, cue: d.cue, day: d.day, done: d.done },
    quest: { name: p.name, badge: p.badge, done, current: p.status === "current" },
    fixes: tip ? { title: tip.title, time: fmt(tip.timeSec), videoId: tip.videoId, flagged: tip.flagged } : null,
    grade: grade ? { grade: grade.grade, score: grade.score, metrics: grade.metrics, good: grade.good, next: grade.next, cue: grade.cue, xp: grade.xp } : null,
    nextDrillId: next?.id ?? null,
  });
});

/** "I did this drill". */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  z.object({ done: z.literal(true) }).parse(await req.json());
  const { profile, db, d } = await own(id);
  const notes: Notes = [];
  const r = await completeDrill(db, profile, d, notes);
  const [next] = await db.select().from(drills).where(and(eq(drills.programId, d.programId), eq(drills.done, false))).orderBy(drills.position).limit(1);
  return json({ ok: true, reward: r, nextDrillId: next?.id ?? null, notes: notes.filter((n) => !n.startsWith("Badge")) });
});
