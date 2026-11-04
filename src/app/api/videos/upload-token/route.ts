import { and, eq } from "drizzle-orm";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { HttpError, requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { MAX_BYTES } from "@/lib/game";
import { json, route } from "@/lib/http";

const { videos } = schema;

/** Blob mode: gives the phone a signed permission to upload one clip straight to the private store. */
export const POST = route(async (req: Request) => {
  const body = (await req.json()) as HandleUploadBody;
  const result = await handleUpload({
    request: req,
    body,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const { profile, db } = await requireProfile();
      const [v] = await db
        .select()
        .from(videos)
        .where(and(eq(videos.id, clientPayload ?? ""), eq(videos.profileId, profile.id), eq(videos.status, "uploading")));
      if (!v || v.blobPath !== pathname) throw new HttpError(403, "Upload not allowed.");
      return {
        allowedContentTypes: ["video/*"],
        maximumSizeInBytes: MAX_BYTES, // the server-side size cap (PRD 7.5)
        addRandomSuffix: false,
        allowOverwrite: true,
      };
    },
  });
  return json(result);
});
