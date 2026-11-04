import { and, asc, desc, eq, ne } from "drizzle-orm";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { fmt, NOT_MEDICAL } from "@/lib/game";
import { json, route } from "@/lib/http";
import { deleteVideos, failIfStalled } from "@/lib/services";

const { videos, reviews, tips, grades } = schema;
type Ctx = { params: Promise<{ id: string }> };

async function own(id: string) {
  const { profile, db } = await requireProfile();
  const [v] = await db.select().from(videos).where(and(eq(videos.id, id), eq(videos.profileId, profile.id)));
  if (!v) throw new HttpError(404, "Video not found.");
  return { profile, db, v };
}

/** The Review screen. The page polls this while the status is "reviewing". */
export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { profile, db, v: raw } = await own(id);
  const v = await failIfStalled(db, raw);
  const [review] = await db.select().from(reviews).where(eq(reviews.videoId, v.id));
  const list = review ? await db.select().from(tips).where(eq(tips.reviewId, review.id)).orderBy(asc(tips.position)) : [];
  const [grade] = v.kind === "grade" ? await db.select().from(grades).where(eq(grades.videoId, v.id)) : [];
  const others = await db
    .select({ id: videos.id })
    .from(videos)
    .where(and(eq(videos.profileId, profile.id), eq(videos.kind, "clip"), eq(videos.status, "reviewed"), ne(videos.id, v.id)))
    .orderBy(desc(videos.createdAt));
  return json({
    video: {
      id: v.id,
      kind: v.kind,
      drillId: v.drillId,
      move: v.move,
      status: v.status,
      durationSec: v.durationSec,
      createdAt: v.createdAt,
      statusAt: v.statusAt,
      src: `/api/videos/${v.id}/file`,
    },
    review: review
      ? { usable: review.usable, unusableReason: review.unusableReason, subject: review.subject, observations: review.observations, reward: review.reward }
      : null,
    tips: list.map((t) => ({ id: t.id, timeSec: t.timeSec, time: fmt(t.timeSec), title: t.title, saw: t.saw, try: t.try, cue: t.cue, flagged: t.flagged })),
    grade: grade ? { drillId: grade.drillId } : null,
    otherReviewed: others.map((o) => o.id),
    notMedical: NOT_MEDICAL,
  });
});

/** Deleting a video also deletes the file (PRD 7.5). */
export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { db, v } = await own(id);
  await deleteVideos(db, [v]);
  return json({ ok: true, notes: ["Video deleted"] });
});
