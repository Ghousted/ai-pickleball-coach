import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * With BLOB_READ_WRITE_TOKEN set, clips go to a private Vercel Blob store, uploaded straight
 * from the phone. Without it, the phone sends the clip to this server and it is kept in
 * .data/uploads. Either way, playback goes through an authenticated route.
 */
export const storageMode = (): "blob" | "local" => (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");

const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");
const localPath = (key: string) => {
  const p = path.join(LOCAL_DIR, key);
  if (!p.startsWith(LOCAL_DIR)) throw new Error("Bad path");
  return p;
};

export const blobKey = (profileId: string, videoId: string, contentType: string) =>
  `videos/${profileId}/${videoId}.${extFor(contentType)}`;

function extFor(type: string) {
  if (type.includes("quicktime")) return "mov";
  if (type.includes("webm")) return "webm";
  if (type.includes("3gpp")) return "3gp";
  return "mp4";
}

export async function saveLocal(key: string, body: ReadableStream<Uint8Array>, maxBytes: number) {
  const file = localPath(key);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const out = fs.createWriteStream(file);
  let total = 0;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("too-large");
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
  } catch (e) {
    out.destroy();
    await fsp.rm(file, { force: true });
    throw e;
  }
  await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
  return total;
}

/** Reads the whole clip into memory. Used to send it to the AI provider. */
export async function readAll(key: string): Promise<Buffer> {
  if (storageMode() === "local") return fsp.readFile(localPath(key));
  const { get } = await import("@vercel/blob");
  const res = await get(key, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) throw new Error("Clip not found in storage");
  return Buffer.from(await new Response(res.stream).arrayBuffer());
}

export async function exists(key: string): Promise<boolean> {
  if (storageMode() === "local") return fs.existsSync(localPath(key));
  const { head } = await import("@vercel/blob");
  try {
    await head(key);
    return true;
  } catch {
    return false;
  }
}

export async function remove(keys: (string | null | undefined)[]) {
  const list = keys.filter((k): k is string => !!k);
  if (!list.length) return;
  if (storageMode() === "local") {
    await Promise.all(list.map((k) => fsp.rm(localPath(k), { force: true })));
    return;
  }
  const { del } = await import("@vercel/blob");
  await del(list);
}

/** Streams a clip with HTTP Range support, so phones can seek. */
export async function serve(key: string, contentType: string, range: string | null): Promise<Response> {
  if (storageMode() === "blob") {
    const { get } = await import("@vercel/blob");
    const res = await get(key, { access: "private", headers: range ? { range } : undefined });
    if (!res || res.statusCode !== 200) return new Response("Not found", { status: 404 });
    const h = new Headers();
    for (const k of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
      const v = res.headers.get(k);
      if (v) h.set(k, v);
    }
    h.set("cache-control", "private, max-age=3600");
    return new Response(res.stream, { status: res.headers.get("content-range") ? 206 : 200, headers: h });
  }

  const file = localPath(key);
  let size: number;
  try {
    size = (await fsp.stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const base = { "content-type": contentType, "accept-ranges": "bytes", "cache-control": "private, max-age=3600" };
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (m) {
    let start = m[1] ? Number(m[1]) : size - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...base, "content-length": String(end - start + 1), "content-range": `bytes ${start}-${end}/${size}` },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...base, "content-length": String(size) } });
}
