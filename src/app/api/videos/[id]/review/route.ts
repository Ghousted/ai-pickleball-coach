import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { XP } from "@/lib/game";
import { json, route } from "@/lib/http";
import { award, gainXp, runReviewJob, type Notes } from "@/lib/services";
import { exists } from "@/lib/storage";

const { videos } = schema;
type Ctx = { params: Promise<{ id: string }> };

// The AI call runs after the response, inside this route's time limit (Vercel Hobby max).
export const maxDuration = 300;

/**
 * "Upload and get my review", and "Try the review again".
 * Marks the upload done (once), then starts one review. A second press changes nothing.
 */
export const POST = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { profile, db } = await requireProfile();
  const [v] = await db.select().from(videos).where(and(eq(videos.id, id), eq(videos.profileId, profile.id)));
  if (!v) throw new HttpError(404, "Video not found.");
  const notes: Notes = [];

  if (v.status === "uploading") {
    if (!v.blobPath || !(await exists(v.blobPath))) throw new HttpError(409, "The upload did not finish. Try again.");
    const [done] = await db
      .update(videos)
      .set({ status: "uploaded", statusAt: new Date() })
      .where(and(eq(videos.id, v.id), eq(videos.status, "uploading")))
      .returning();
    if (done && v.kind === "clip") {
      await gainXp(db, profile.id, XP.upload, "Uploaded a video", "upload", notes);
      await award(db, profile.id, "upload");
      notes.unshift(`Uploaded! +${XP.upload} XP`);
    }
  }

  // One review at a time: only one request can move the row to "reviewing".
  const [started] = await db
    .update(videos)
    .set({ status: "reviewing", statusAt: new Date(), error: null })
    .where(and(eq(videos.id, v.id), inArray(videos.status, ["uploaded", "failed"])))
    .returning();
  if (started) after(() => runReviewJob(db, v.id));
  return json({ ok: true, status: started ? "reviewing" : v.status, notes });
});
