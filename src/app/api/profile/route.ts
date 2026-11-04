import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireProfile, requireUser, HttpError } from "@/lib/auth";
import { schema } from "@/lib/db";
import { DAYS, LEVELS, XP } from "@/lib/game";
import { json, route } from "@/lib/http";
import { award, currentProgram, gainXp, reassignDays, type Notes } from "@/lib/services";

const { profiles, programs } = schema;

const Fields = z.object({
  name: z.string().trim().min(1, "Add your first name.").max(40),
  level: z.enum(LEVELS.map((l) => l.id) as [string, ...string[]], { message: "Pick your level." }),
  playDays: z.array(z.enum(DAYS)).min(1, "Pick the days you regularly play."),
  goal: z.string().trim().max(80).optional().default(""),
});

/** Setup: creates the profile ("Game on"). */
export const POST = route(async (req: Request) => {
  const { session, db } = await requireUser();
  const body = Fields.parse(await req.json());
  const [exists] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1);
  if (exists) throw new HttpError(409, "You already have a profile.");
  const [p] = await db
    .insert(profiles)
    .values({ userId: session.user.id, name: body.name, level: body.level, playDays: body.playDays, goal: body.goal || null, sport: "pickleball" })
    .returning();
  const notes: Notes = [];
  await gainXp(db, p.id, XP.join, "Joined AI Coach", "join");
  if (body.goal) await award(db, p.id, "goal");
  return json({ ok: true, notes });
});

/** Edit profile, or change a setting such as "Don't show this again". */
export const PATCH = route(async (req: Request) => {
  const { profile: p, db } = await requireProfile();
  const raw = await req.json();
  if (typeof raw.hideWizard === "boolean" && Object.keys(raw).length === 1) {
    await db.update(profiles).set({ hideWizard: raw.hideWizard }).where(eq(profiles.id, p.id));
    return json({ ok: true });
  }
  const body = Fields.parse(raw);
  const notes: Notes = [];
  const goal = body.goal || null;
  const [updated] = await db
    .update(profiles)
    .set({ name: body.name, level: body.level, playDays: body.playDays, goal })
    .where(eq(profiles.id, p.id))
    .returning();
  if (goal) await award(db, p.id, "goal", notes);

  // PRD: if the goal changes, the program is rebuilt and the old one stays in history.
  // The player picks the quest again. If only the play days change, the drills move.
  const goalChanged = (p.goal ?? "") !== (goal ?? "");
  const cur = await currentProgram(db, p.id);
  if (cur && goalChanged && goal && goal !== cur.goal) {
    await db.update(programs).set({ status: "archived" }).where(eq(programs.id, cur.id));
    notes.push("Goal changed. Pick a quest to rebuild your plan.");
  } else if (p.playDays.join() !== body.playDays.join()) {
    await reassignDays(db, updated);
  }
  notes.push("Profile saved");
  return json({ ok: true, notes });
});
