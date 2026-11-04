"use client";
import { api, ApiError } from "./client";
import { MAX_BYTES, MAX_SECONDS } from "./game";

export type PickedFile = { file: File; name: string; size: string; durationSec: number | null; error: string | null };

const sizeLabel = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** The browser checks type, size and length first (PRD 7.5). */
export async function inspect(file: File): Promise<PickedFile> {
  const base = { file, name: file.name, size: sizeLabel(file.size), durationSec: null as number | null, error: null as string | null };
  if (!file.type.startsWith("video/")) return { ...base, error: "That file is not a video. Pick a video from your camera roll." };
  if (file.size > MAX_BYTES) return { ...base, error: "That clip is over 100 MB. Trim it and try again." };
  const durationSec = await new Promise<number | null>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    const done = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 6000);
    v.src = url;
  });
  if (durationSec !== null && durationSec > MAX_SECONDS + 0.5) {
    return { ...base, durationSec, error: `That clip is over ${MAX_SECONDS} seconds. Trim it and try again.` };
  }
  return { ...base, durationSec };
}

/**
 * Uploads a clip, then starts the review.
 * Blob mode: straight from the phone to the private Vercel Blob store.
 * Local mode: to this server (no Blob token set).
 */
export async function uploadClip(
  picked: PickedFile,
  meta: { move: string; kind?: "clip" | "grade"; drillId?: string; resumeId?: string },
  onProgress: (pct: number) => void,
): Promise<string> {
  const { file } = picked;
  const created = await api<{ id: string; key: string; mode: "blob" | "local" }>("/api/videos", {
    body: {
      move: meta.move,
      contentType: file.type || "video/mp4",
      sizeBytes: file.size,
      // Some browsers cannot read the length of every format. The server still caps it.
      durationSec: picked.durationSec ?? 30,
      kind: meta.kind ?? "clip",
      drillId: meta.drillId,
      resumeId: meta.resumeId,
    },
  });
  try {
    sessionStorage.setItem("coach:pending-upload", JSON.stringify({ id: created.id, move: meta.move }));
  } catch {}

  if (created.mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    await upload(created.key, file, {
      access: "private",
      handleUploadUrl: "/api/videos/upload-token",
      clientPayload: created.id,
      contentType: file.type || "video/mp4",
      multipart: file.size > 20 * 1024 * 1024,
      onUploadProgress: (e) => onProgress(e.percentage),
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open("PUT", `/api/videos/${created.id}/file`);
      x.setRequestHeader("content-type", file.type || "video/mp4");
      x.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
      x.onload = () => {
        if (x.status < 300) return resolve();
        let msg = "The upload dropped. Try again.";
        try {
          msg = JSON.parse(x.responseText).error ?? msg;
        } catch {}
        reject(new ApiError(x.status, msg));
      };
      x.onerror = () => reject(new ApiError(0, "The upload dropped. Check your connection and try again."));
      x.send(file);
    });
  }
  onProgress(100);
  await api(`/api/videos/${created.id}/review`, { method: "POST" });
  try {
    sessionStorage.removeItem("coach:pending-upload");
  } catch {}
  return created.id;
}
