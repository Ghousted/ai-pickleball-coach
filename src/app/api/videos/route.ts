import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { DAILY, MAX_BYTES, MAX_SECONDS, MAX_VIDEOS } from "@/lib/game";
import { json, route } from "@/lib/http";
import { failIfStalled, startOfToday } from "@/lib/services";
import { blobKey, remove, storageMode } from "@/lib/storage";

const { videos, tips, drills, programs } = schema;

/** The Videos tab. Drill clips filmed for a grade are not listed here. */
export const GET = route(async () => {
  const { profile, db } = await requireProfile();
  const rows = await db.select().from(videos).where(and(eq(videos.profileId, profile.id), eq(videos.kind, "clip"))).orderBy(desc(videos.createdAt));
  const list = await Promise.all(rows.map((v) => failIfStalled(db, v)));
  const counts = list.length
    ? await db
        .select({ videoId: tips.videoId, n: sql<number>`count(*) filter (where not ${tips.flagged})::int` })
        .from(tips)
        .where(inArray(tips.videoId, list.map((v) => v.id)))
        .groupBy(tips.videoId)
    : [];
  const byId = Object.fromEntries(counts.map((c) => [c.videoId, c.n]));
  return json({
    videos: list.map((v) => ({
      id: v.id,
      move: v.move,
      status: v.status,
      durationSec: v.durationSec,
      createdAt: v.createdAt,
      tipCount: byId[v.id] ?? 0,
    })),
    max: MAX_VIDEOS,
  });
});

const Create = z.object({
  move: z.string().trim().min(1, "Type the move, for example Dink.").max(40),
  contentType: z.string().regex(/^video\//, "That file is not a video."),
  sizeBytes: z.number().int().positive().max(MAX_BYTES, "That clip is over 100 MB. Trim it and try again."),
  // null when the browser cannot read the length (some iPhone clips in Chrome). Stored as 0, meaning unknown.
  durationSec: z.number().positive().max(MAX_SECONDS + 0.5, `That clip is over ${MAX_SECONDS} seconds. Trim it and try again.`).nullable(),
  kind: z.enum(["clip", "grade"]).default("clip"),
  drillId: z.string().optional(),
  resumeId: z.string().optional(),
});

/** Step 1 of an upload: checks the limits and saves a row as "uploading". */
export const POST = route(async (req: Request) => {
  const { profile, db } = await requireProfile();
  const body = Create.parse(await req.json());

  if (body.kind === "grade") {
    const [dr] = await db
      .select({ id: drills.id })
      .from(drills)
      .innerJoin(programs, eq(drills.programId, programs.id))
      .where(and(eq(drills.id, body.drillId ?? ""), eq(programs.profileId, profile.id), eq(programs.status, "current")));
    if (!dr) throw new HttpError(404, "This drill is not in your current quest.");
  }
  const durationSec = body.durationSec ?? 0;

  // "Picking up where you left off": a pending row is reused when the player picks the file again.
  if (body.resumeId) {
    const [old] = await db.select().from(videos).where(and(eq(videos.id, body.resumeId), eq(videos.profileId, profile.id), eq(videos.status, "uploading")));
    if (old) {
      const key = blobKey(profile.id, old.id, body.contentType);
      if (old.blobPath && old.blobPath !== key) await remove([old.blobPath]).catch(() => {}); // a different file type left an old file
      await db.update(videos).set({ move: body.move, contentType: body.contentType, sizeBytes: body.sizeBytes, durationSec, blobPath: key, statusAt: new Date() }).where(eq(videos.id, old.id));
      return json({ id: old.id, key, mode: storageMode() });
    }
  }

  if (body.kind === "clip") {
    const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(videos).where(and(eq(videos.profileId, profile.id), eq(videos.kind, "clip")));
    if (c.n >= MAX_VIDEOS) throw new HttpError(409, "Delete a video to add a new one.");
  }
  const [today] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(videos)
    .where(and(eq(videos.profileId, profile.id), eq(videos.kind, body.kind), gte(videos.createdAt, startOfToday())));
  const cap = body.kind === "clip" ? DAILY.clips : DAILY.grades;
  if (today.n >= cap) throw new HttpError(429, `You've reached today's limit of ${cap} ${body.kind === "clip" ? "uploads" : "drill grades"}. Try again tomorrow.`);
  const id = crypto.randomUUID();
  const key = blobKey(profile.id, id, body.contentType);
  await db.insert(videos).values({
    id,
    profileId: profile.id,
    kind: body.kind,
    drillId: body.kind === "grade" ? body.drillId : null,
    move: body.move,
    contentType: body.contentType,
    sizeBytes: body.sizeBytes,
    durationSec,
    blobPath: key,
    status: "uploading",
  });
  return json({ id, key, mode: storageMode() });
});

