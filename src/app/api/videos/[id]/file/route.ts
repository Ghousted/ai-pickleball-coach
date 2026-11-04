import { and, eq } from "drizzle-orm";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { MAX_BYTES } from "@/lib/game";
import { json, route } from "@/lib/http";
import { saveLocal, serve, storageMode } from "@/lib/storage";

const { videos } = schema;
type Ctx = { params: Promise<{ id: string }> };

/** Playback. Videos are private, so they only play through this signed-in route. */
export const GET = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { profile, db } = await requireProfile();
  const [v] = await db.select().from(videos).where(and(eq(videos.id, id), eq(videos.profileId, profile.id)));
  if (!v?.blobPath || v.status === "uploading") throw new HttpError(404, "Video not found.");
  return serve(v.blobPath, v.contentType, req.headers.get("range"));
});

/** Local mode only: the phone sends the clip to this server (no Blob token set). */
export const PUT = route(async (req: Request, { params }: Ctx) => {
  if (storageMode() !== "local") throw new HttpError(400, "Uploads go straight to storage.");
  const { id } = await params;
  const { profile, db } = await requireProfile();
  const [v] = await db.select().from(videos).where(and(eq(videos.id, id), eq(videos.profileId, profile.id), eq(videos.status, "uploading")));
  if (!v?.blobPath || !req.body) throw new HttpError(404, "Upload not found.");
  try {
    await saveLocal(v.blobPath, req.body, MAX_BYTES);
  } catch (e) {
    if (String(e).includes("too-large")) throw new HttpError(413, "That clip is over 100 MB. Trim it and try again.");
    throw e;
  }
  return json({ ok: true });
});
