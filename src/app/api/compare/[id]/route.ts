import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { after } from "next/server";
import { runCompareJob, STALL_MS } from "@/lib/services";

const { comparisons, videos, tips } = schema;
type Ctx = { params: Promise<{ id: string }> };

async function own(id: string) {
  const { profile, db } = await requireProfile();
  const [c] = await db.select().from(comparisons).where(and(eq(comparisons.id, id), eq(comparisons.profileId, profile.id)));
  if (!c) throw new HttpError(404, "Comparison not found.");
  return { db, c };
}

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { db, c: raw } = await own(id);
  let c = raw;
  if (c.status === "running" && Date.now() - c.statusAt.getTime() > STALL_MS) {
    await db.update(comparisons).set({ status: "failed" }).where(and(eq(comparisons.id, c.id), eq(comparisons.status, "running")));
    c = { ...c, status: "failed" };
  }
  const pair = await Promise.all(
    [c.videoA, c.videoB].map(async (vid) => {
      const [v] = await db.select().from(videos).where(eq(videos.id, vid));
      const ts = await db.select({ id: tips.id }).from(tips).where(eq(tips.videoId, vid));
      return { id: v.id, move: v.move, durationSec: v.durationSec, createdAt: v.createdAt, tipCount: ts.length };
    }),
  );
  return json({ id: c.id, status: c.status, result: c.result, xp: c.xpAwarded, flagged: c.flagged, pair, statusAt: c.statusAt });
});

/** "This looks wrong" on a comparison. */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { flagged } = z.object({ flagged: z.boolean() }).parse(await req.json());
  const { db, c } = await own(id);
  await db.update(comparisons).set({ flagged }).where(eq(comparisons.id, c.id));
  return json({ ok: true, notes: [flagged ? "Flagged. Thanks for telling us." : "Flag removed"] });
});

/** Try again after a failed comparison. */
export const POST = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { db, c } = await own(id);
  // Only one request can move it from "failed" to "running", so a double press starts one job.
  const [started] = await db
    .update(comparisons)
    .set({ status: "running", statusAt: new Date() })
    .where(and(eq(comparisons.id, c.id), eq(comparisons.status, "failed")))
    .returning({ id: comparisons.id });
  if (started) after(() => runCompareJob(db, c.id));
  return json({ ok: true });
});

export const maxDuration = 300;
