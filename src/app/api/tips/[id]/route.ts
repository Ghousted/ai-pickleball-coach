import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { json, route } from "@/lib/http";
import { refreshProgram } from "@/lib/services";

const { tips, videos } = schema;
type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

/** "This looks wrong". A flagged tip is left out of the next program. */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { flagged } = z.object({ flagged: z.boolean() }).parse(await req.json());
  const { profile, db } = await requireProfile();
  const [t] = await db
    .select({ id: tips.id })
    .from(tips)
    .innerJoin(videos, eq(tips.videoId, videos.id))
    .where(and(eq(tips.id, id), eq(videos.profileId, profile.id)));
  if (!t) throw new HttpError(404, "Tip not found.");
  await db.update(tips).set({ flagged }).where(eq(tips.id, id));
  after(() => refreshProgram(db, profile).catch((e) => console.error(e)));
  return json({ ok: true, notes: [flagged ? "Flagged. Left out of your quests." : "Tip back in your quests"] });
});
