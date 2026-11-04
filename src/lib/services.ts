import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { DB } from "./db";
import { schema } from "./db";
import { BADGES, DAYS, DRILLS_PER_QUEST, fmt, levelFor, dayName, XP } from "./game";
import { questByKey, questForCues, QUESTS } from "./knowledge/pickleball";
import { coachAgent, compareAgent, gradeAgent, reviewAgent, toSec } from "./ai/agents";
import { readAll, remove } from "./storage";

const { profiles, videos, reviews, tips, events, badges, programs, drills, grades, comparisons } = schema;
type Profile = typeof profiles.$inferSelect;

/** Messages to show as toasts after a change. */
export type Notes = string[];

/* ---------------- XP, badges, streak ---------------- */

export async function gainXp(db: DB, profileId: string, xp: number, title: string, type: string, notes?: Notes) {
  const [before] = await db.select({ xp: profiles.xp }).from(profiles).where(eq(profiles.id, profileId));
  const [after] = await db
    .update(profiles)
    .set({ xp: sql`${profiles.xp} + ${xp}` })
    .where(eq(profiles.id, profileId))
    .returning({ xp: profiles.xp });
  await db.insert(events).values({ profileId, xp, title, type });
  const l0 = levelFor(before?.xp ?? 0);
  const l1 = levelFor(after.xp);
  let levelUp: string | null = null;
  if (l1.n > l0.n) {
    levelUp = l1.name;
    notes?.push(`Level up! You're a ${l1.name}`);
  }
  if (l1.n >= 5) await award(db, profileId, "lvl5", notes);
  return { xp: after.xp, levelUp };
}

/** Unlocks a badge once. Returns its name when it is new. */
export async function award(db: DB, profileId: string, badgeId: string, notes?: Notes): Promise<string | null> {
  const def = BADGES.find((b) => b.id === badgeId);
  if (!def) return null;
  const inserted = await db.insert(badges).values({ profileId, badgeId }).onConflictDoNothing().returning();
  if (!inserted.length) return null;
  await db.insert(events).values({ profileId, xp: 0, title: `Badge: ${def.name}`, type: "badge" });
  notes?.push(`Badge unlocked: ${def.name}`);
  return def.name;
}

const weekStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
};

/** Weeks in a row (ending this week or last week) with at least one activity. */
export async function streak(db: DB, profileId: string) {
  const rows = await db.select({ at: events.createdAt }).from(events).where(eq(events.profileId, profileId));
  const weeks = new Set(rows.map((r) => weekStart(r.at)));
  const WEEK = 7 * 864e5;
  let w = weekStart(new Date());
  if (!weeks.has(w)) w -= WEEK;
  let n = 0;
  while (weeks.has(w)) {
    n++;
    w -= WEEK;
  }
  return n;
}

export async function checkStreak(db: DB, profileId: string, notes?: Notes) {
  if ((await streak(db, profileId)) >= 3) await award(db, profileId, "streak", notes);
}

/** Start of today (server time). Used for the daily caps. */
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ---------------- Videos ---------------- */

export async function deleteVideos(db: DB, rows: { id: string; blobPath: string | null }[]) {
  if (!rows.length) return;
  await remove(rows.map((r) => r.blobPath));
  await db.delete(videos).where(inArray(videos.id, rows.map((r) => r.id)));
}

/** A review or comparison stuck for longer than this is marked failed (PRD 6: stalled agent). */
export const STALL_MS = 310_000;

export async function failIfStalled(db: DB, v: typeof videos.$inferSelect) {
  if (v.status === "reviewing" && Date.now() - v.statusAt.getTime() > STALL_MS) {
    await db.update(videos).set({ status: "failed", error: "timeout", statusAt: new Date() }).where(and(eq(videos.id, v.id), eq(videos.status, "reviewing")));
    return { ...v, status: "failed" as const };
  }
  return v;
}

/** Runs after the response. Reviews a clip, or grades a drill clip. */
export async function runReviewJob(db: DB, videoId: string) {
  const [v] = await db.select().from(videos).where(eq(videos.id, videoId));
  if (!v || v.status !== "reviewing" || !v.blobPath) return;
  const [p] = await db.select().from(profiles).where(eq(profiles.id, v.profileId));
  const video = async () => ({ data: await readAll(v.blobPath!), mime: v.contentType });
  try {
    if (v.kind === "grade") await gradeJob(db, v, p, video);
    else await reviewJob(db, v, p, video);
  } catch (err) {
    console.error("review job failed", err);
    await db.update(videos).set({ status: "failed", error: String(err).slice(0, 300), statusAt: new Date() }).where(eq(videos.id, videoId));
  }
}

/** Runs a side task (streak badge, drill refresh) so its failure cannot undo a finished review. */
const quietly = (label: string, p: Promise<unknown>) => p.catch((e) => console.error(label, e));

/**
 * Saves the result first, then moves the video from "reviewing" to done in one conditional update.
 * Only that update grants XP, so a retry or a deleted video never pays twice.
 */
async function reviewJob(db: DB, v: typeof videos.$inferSelect, p: Profile, video: () => Promise<{ data: Buffer; mime: string }>) {
  const out = await reviewAgent({ video, sport: p.sport, move: v.move, level: p.level, durationSec: v.durationSec });
  const usable = out.usable && out.tips.length > 0;
  await db.delete(reviews).where(eq(reviews.videoId, v.id)); // clears a partial result from an earlier attempt
  const [rev] = await db
    .insert(reviews)
    .values({
      videoId: v.id,
      usable,
      unusableReason: usable ? null : out.unusable_reason || (out.usable ? "Your coach could not tell what happened in this clip, so there are no tips. Try another clip." : "We could not see the move clearly."),
      subject: out.subject,
      observations: out.observations,
    })
    .returning();
  if (usable) {
    await db.insert(tips).values(
      out.tips.map((t, i) => ({ reviewId: rev.id, videoId: v.id, position: i, timeSec: toSec(t.time), title: t.title, saw: t.saw, try: t.try, cue: t.cue })),
    );
  }
  const [done] = await db
    .update(videos)
    .set({ status: usable ? "reviewed" : "unusable", statusAt: new Date(), error: null })
    .where(and(eq(videos.id, v.id), eq(videos.status, "reviewing")))
    .returning({ id: videos.id });
  if (!done) return; // deleted or already finished
  if (usable) {
    const r = await gainXp(db, p.id, XP.review, `Review ready: ${v.move}`, "review");
    const badge = await award(db, p.id, "review");
    await db.update(reviews).set({ reward: { xp: XP.review, badge, levelUp: r.levelUp } }).where(eq(reviews.id, rev.id));
    await quietly("program refresh failed", refreshProgram(db, p));
  }
  await quietly("streak check failed", checkStreak(db, p.id));
}

/**
 * A drill clip filmed for a grade. A clip that does not show the drill gets no grade, no XP and
 * does not complete the drill. Only the first grade of a drill gives grade XP.
 */
async function gradeJob(db: DB, v: typeof videos.$inferSelect, p: Profile, video: () => Promise<{ data: Buffer; mime: string }>) {
  const [dr] = v.drillId ? await db.select().from(drills).where(eq(drills.id, v.drillId)) : [];
  if (!dr) throw new Error("Drill not found");
  const out = await gradeAgent({ video, sport: p.sport, drill: dr, level: p.level });
  await db.delete(grades).where(eq(grades.videoId, v.id));
  await db.delete(reviews).where(eq(reviews.videoId, v.id));

  if (out.score === 0) {
    await db.insert(reviews).values({ videoId: v.id, usable: false, unusableReason: out.good || "We could not see the drill in this clip.", observations: [] });
    await db.update(videos).set({ status: "unusable", statusAt: new Date(), error: null }).where(and(eq(videos.id, v.id), eq(videos.status, "reviewing")));
    return;
  }

  const earlier = await db.select({ videoId: grades.videoId }).from(grades).where(eq(grades.drillId, dr.id));
  const gradeXp = earlier.length ? 0 : XP.grade;
  const xp = gradeXp + (dr.done ? 0 : XP.drill);
  await db.insert(grades).values({ drillId: dr.id, videoId: v.id, grade: out.grade, score: out.score, metrics: out.metrics, good: out.good, next: out.next, cue: dr.cue, xp });
  const [done] = await db
    .update(videos)
    .set({ status: "reviewed", statusAt: new Date(), error: null })
    .where(and(eq(videos.id, v.id), eq(videos.status, "reviewing")))
    .returning({ id: videos.id });
  if (!done) return;
  if (gradeXp) await gainXp(db, p.id, gradeXp, `Drill graded: ${dr.title} (${out.grade})`, "review");
  if (!dr.done) await completeDrill(db, p, dr);

  // Keep only the newest grade clip of a drill, so old drill clips do not fill the storage.
  if (earlier.length) {
    const old = await db.select({ id: videos.id, blobPath: videos.blobPath }).from(videos).where(inArray(videos.id, earlier.map((g) => g.videoId)));
    await quietly("old grade clip cleanup failed", deleteVideos(db, old));
  }
}

/* ---------------- Programs (quests) and drills ---------------- */

/** Plain code assigns drills to the player's play days, starting with the next play day. */
export function assignDays(playDays: string[], count: number, from = new Date()): string[] {
  const days = DAYS.filter((d) => playDays.includes(d));
  if (!days.length) return Array(count).fill("Any day");
  const today = DAYS.indexOf(dayName(from));
  const start = days.findIndex((d) => DAYS.indexOf(d) >= today);
  const s = start === -1 ? 0 : start;
  return Array.from({ length: count }, (_, i) => days[(s + i) % days.length]);
}

export async function activeTips(db: DB, profileId: string) {
  return db
    .select({ id: tips.id, cue: tips.cue, saw: tips.saw, try: tips.try, createdAt: videos.createdAt })
    .from(tips)
    .innerJoin(videos, eq(tips.videoId, videos.id))
    .where(and(eq(videos.profileId, profileId), eq(tips.flagged, false)))
    .orderBy(desc(videos.createdAt), asc(tips.position));
}

export async function currentProgram(db: DB, profileId: string) {
  const [prog] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.profileId, profileId), eq(programs.status, "current")))
    .orderBy(desc(programs.createdAt))
    .limit(1);
  if (!prog) return null;
  const list = await db.select().from(drills).where(eq(drills.programId, prog.id)).orderBy(asc(drills.position));
  return { ...prog, drills: list };
}

/** Starts a quest. The old program is archived and stays in history. */
export async function startQuest(db: DB, p: Profile, questKey: string, notes?: Notes) {
  const quest = questByKey(questKey);
  if (!quest) throw new Error("Unknown quest");
  const cur = await currentProgram(db, p.id);
  if (cur?.questKey === questKey) return cur;
  // Done drills from an earlier run of the same quest carry over, so progress is kept.
  const [old] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.profileId, p.id), eq(programs.questKey, questKey)))
    .orderBy(desc(programs.createdAt))
    .limit(1);
  const doneBefore = old ? (await db.select().from(drills).where(and(eq(drills.programId, old.id), eq(drills.done, true)))).length : 0;

  const goal = p.goal?.trim() || quest.name;
  if (!p.goal?.trim()) {
    await db.update(profiles).set({ goal }).where(eq(profiles.id, p.id));
    await award(db, p.id, "goal", notes);
  }
  const list = await coachAgent({ sport: p.sport, level: p.level, goal, quest, tips: await activeTips(db, p.id) });
  const days = assignDays(p.playDays, DRILLS_PER_QUEST);
  const [prog] = await db.insert(programs).values({ profileId: p.id, questKey, name: quest.name, goal, badge: quest.badge }).returning();
  await db.insert(drills).values(
    list.slice(0, DRILLS_PER_QUEST).map((d, i) => ({ programId: prog.id, position: i, tipId: d.tipId, title: d.title, how: d.how, minutes: d.minutes, cue: d.cue, day: days[i], done: i < doneBefore })),
  );
  // Archive the old program only now, so a failure above never leaves the player with no quest.
  await db.update(programs).set({ status: "archived" }).where(and(eq(programs.profileId, p.id), eq(programs.status, "current"), ne(programs.id, prog.id)));
  return currentProgram(db, p.id);
}

/** After a new review, or when a tip is flagged, the Coach rebuilds the drills not done yet. */
export async function refreshProgram(db: DB, p: Profile) {
  const cur = await currentProgram(db, p.id);
  if (!cur) return;
  const quest = questByKey(cur.questKey);
  if (!quest) return;
  const list = await coachAgent({ sport: p.sport, level: p.level, goal: cur.goal, quest, tips: await activeTips(db, p.id) });
  const todo = cur.drills.filter((d) => !d.done);
  const days = assignDays(p.playDays, todo.length);
  for (const [i, d] of todo.entries()) {
    const n = list[d.position];
    if (!n) continue;
    await db.update(drills).set({ title: n.title, how: n.how, minutes: n.minutes, cue: n.cue, tipId: n.tipId, day: days[i] }).where(eq(drills.id, d.id));
  }
}

/** When play days change, drills that are not done move to the new days. */
export async function reassignDays(db: DB, p: Profile) {
  const cur = await currentProgram(db, p.id);
  if (!cur) return;
  const todo = cur.drills.filter((d) => !d.done);
  const days = assignDays(p.playDays, todo.length);
  for (const [i, d] of todo.entries()) await db.update(drills).set({ day: days[i] }).where(eq(drills.id, d.id));
}

export async function completeDrill(db: DB, p: Profile, dr: typeof drills.$inferSelect, notes?: Notes) {
  const [updated] = await db
    .update(drills)
    .set({ done: true, doneAt: new Date() })
    .where(and(eq(drills.id, dr.id), eq(drills.done, false)))
    .returning();
  if (!updated) return { xp: 0, badge: null as string | null, levelUp: null as string | null };
  const r = await gainXp(db, p.id, 20, `Drill: ${dr.title}`, "drill", notes);
  let badge: string | null = null;
  const doneAll = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(drills)
    .innerJoin(programs, eq(drills.programId, programs.id))
    .where(and(eq(programs.profileId, p.id), eq(drills.done, true)));
  if ((doneAll[0]?.n ?? 0) >= 5) badge = (await award(db, p.id, "sergeant")) ?? badge;
  const [prog] = await db.select().from(programs).where(eq(programs.id, dr.programId));
  const inQuest = await db.select({ n: sql<number>`count(*)::int` }).from(drills).where(and(eq(drills.programId, dr.programId), eq(drills.done, true)));
  const qn = inQuest[0]?.n ?? 0;
  if (qn >= DRILLS_PER_QUEST) {
    const q = QUESTS.find((x) => x.key === prog.questKey);
    if (q) badge = (await award(db, p.id, q.badgeId)) ?? badge;
  }
  await checkStreak(db, p.id, notes);
  return { xp: 20, badge, levelUp: r.levelUp, qn, questName: prog.name };
}

/* ---------------- Compare ---------------- */

export async function runCompareJob(db: DB, compId: string) {
  const [c] = await db.select().from(comparisons).where(eq(comparisons.id, compId));
  if (!c || c.status !== "running") return;
  try {
    const [p] = await db.select().from(profiles).where(eq(profiles.id, c.profileId));
    const load = async (id: string) => {
      const [v] = await db.select().from(videos).where(eq(videos.id, id));
      const ts = await db.select().from(tips).where(and(eq(tips.videoId, id), eq(tips.flagged, false))).orderBy(asc(tips.position));
      return {
        v,
        date: v.createdAt.toDateString(),
        tips: ts.map((t) => ({ title: t.title, saw: t.saw, cue: t.cue, time: fmt(t.timeSec) })),
        video: async () => ({ data: await readAll(v.blobPath!), mime: v.contentType }),
      };
    };
    const before = await load(c.videoA);
    const after = await load(c.videoB);
    const out = await compareAgent({ sport: p.sport, move: after.v.move, before, after });
    await db.update(comparisons).set({ status: "done", result: out, statusAt: new Date() }).where(and(eq(comparisons.id, compId), eq(comparisons.status, "running")));
  } catch (err) {
    console.error("compare job failed", err);
    await db.update(comparisons).set({ status: "failed", statusAt: new Date() }).where(and(eq(comparisons.id, compId), eq(comparisons.status, "running")));
  }
}

export { questForCues };
