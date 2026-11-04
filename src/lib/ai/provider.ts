import "server-only";
import { z } from "zod";

/**
 * One setting picks the AI provider (PRD 7.1):
 *   AI_PROVIDER=gemini      Google AI Studio key in GEMINI_API_KEY
 *   AI_PROVIDER=openrouter  key in OPENROUTER_API_KEY
 *   AI_PROVIDER=mock        no key; canned answers built from the design, for building and demos
 * When AI_PROVIDER is not set, the first key found wins, else mock.
 */
export type Provider = "gemini" | "openrouter" | "mock";

export function provider(): Provider {
  const p = process.env.AI_PROVIDER?.toLowerCase();
  if (p === "gemini" || p === "openrouter" || p === "mock") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return "mock";
}

/** The AI call stops before Vercel's 300 s route limit (PRD 7.5). */
export const AI_TIMEOUT_MS = 240_000;

export type VideoInput = { data: Buffer; mime: string };

const GEMINI_MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TEXT_MODEL = () => process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash-lite";
const OPENROUTER_MODEL = () => process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
const OPENROUTER_TEXT_MODEL = () => process.env.OPENROUTER_TEXT_MODEL || "google/gemini-2.5-flash-lite";

/** Sends a prompt (and optional videos) and returns JSON that passed the schema. */
export async function generateJson<T extends z.ZodType>(opts: {
  prompt: string;
  schema: T;
  videos?: VideoInput[];
  text?: boolean;
}): Promise<z.infer<T>> {
  const jsonSchema = z.toJSONSchema(opts.schema, { target: "draft-7" });
  const raw =
    provider() === "openrouter"
      ? await openrouter(opts.prompt, opts.videos ?? [], jsonSchema, opts.text)
      : await gemini(opts.prompt, opts.videos ?? [], jsonSchema, opts.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    throw new Error("The AI did not return JSON");
  }
  return opts.schema.parse(parsed);
}

export async function generateText(prompt: string): Promise<string> {
  const raw = provider() === "openrouter" ? await openrouter(prompt, [], null, true) : await gemini(prompt, [], null, true);
  return raw.trim();
}

const stripFences = (s: string) => s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

/* ---------------- Gemini (Google AI Studio) ---------------- */

async function gemini(prompt: string, videos: VideoInput[], jsonSchema: unknown, textOnly?: boolean): Promise<string> {
  const { GoogleGenAI, createPartFromUri } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const signal = AbortSignal.timeout(AI_TIMEOUT_MS);
  const fps = process.env.GEMINI_FPS ? Number(process.env.GEMINI_FPS) : undefined;
  const uploaded: string[] = [];
  try {
    const parts: object[] = [];
    for (const v of videos) {
      // Small clips go inline. Larger clips go through the Files API.
      if (v.data.byteLength < 18 * 1024 * 1024) {
        parts.push({ inlineData: { data: v.data.toString("base64"), mimeType: v.mime }, ...(fps ? { videoMetadata: { fps } } : {}) });
        continue;
      }
      let file = await ai.files.upload({ file: new Blob([new Uint8Array(v.data)], { type: v.mime }), config: { mimeType: v.mime, abortSignal: signal } });
      if (file.name) uploaded.push(file.name);
      while (file.state === "PROCESSING") {
        if (signal.aborted) throw new Error("AI timed out");
        await new Promise((r) => setTimeout(r, 2000));
        file = await ai.files.get({ name: file.name! });
      }
      if (file.state === "FAILED" || !file.uri) throw new Error("Gemini could not process the clip");
      parts.push({ ...createPartFromUri(file.uri, v.mime), ...(fps ? { videoMetadata: { fps } } : {}) });
    }
    parts.push({ text: prompt });
    const res = await ai.models.generateContent({
      model: videos.length || !textOnly ? GEMINI_MODEL() : GEMINI_TEXT_MODEL(),
      contents: [{ role: "user", parts }],
      config: {
        abortSignal: signal,
        temperature: 0.3,
        ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
      },
    });
    const text = res.text;
    if (!text) throw new Error("Gemini returned nothing");
    return text;
  } finally {
    for (const name of uploaded) ai.files.delete({ name }).catch(() => {});
  }
}

/* ---------------- OpenRouter ---------------- */
/* Gemini via OpenRouter accepts only YouTube links or base64 data URLs for video (PRD 7.6),
   so the server sends the stored clip as a base64 data URL. Not verified against a live key. */

async function openrouter(prompt: string, videos: VideoInput[], jsonSchema: unknown, textOnly?: boolean): Promise<string> {
  const content: object[] = videos.map((v) => ({
    type: "video_url",
    video_url: { url: `data:${v.mime};base64,${v.data.toString("base64")}` },
  }));
  content.push({ type: "text", text: prompt });
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "content-type": "application/json", "x-title": "AI Coach" },
    body: JSON.stringify({
      model: textOnly && !videos.length ? OPENROUTER_TEXT_MODEL() : OPENROUTER_MODEL(),
      temperature: 0.3,
      messages: [{ role: "user", content }],
      ...(jsonSchema ? { response_format: { type: "json_schema", json_schema: { name: "result", strict: true, schema: jsonSchema } } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned nothing");
  return text;
}
