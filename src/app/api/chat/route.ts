import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { schema } from "@/lib/db";
import { fmt } from "@/lib/game";
import { json, route } from "@/lib/http";
import { chatAgent } from "@/lib/ai/agents";
import { award, currentProgram, type Notes } from "@/lib/services";

const { chatMessages, videos, tips } = schema;
type DBx = Awaited<ReturnType<typeof requireProfile>>["db"];

async function context(db: DBx, profileId: string, thread: string) {
  const [v] =
    thread !== "general"
      ? await db.select().from(videos).where(and(eq(videos.id, thread), eq(videos.profileId, profileId)))
      : await db.select().from(videos).where(and(eq(videos.profileId, profileId), eq(videos.kind, "clip"), eq(videos.status, "reviewed"))).orderBy(desc(videos.createdAt)).limit(1);
  const ts = v ? await db.select().from(tips).where(and(eq(tips.videoId, v.id), eq(tips.flagged, false))).orderBy(asc(tips.position)) : [];
  return { v, tips: ts.map((t) => ({ time: fmt(t.timeSec), saw: t.saw, try: t.try, cue: t.cue })) };
}

/** A thread is "general" or a video id. The first message is a greeting from the coach. */
export const GET = route(async (req: Request) => {
  const thread = new URL(req.url).searchParams.get("thread") || "general";
  const { profile, db } = await requireProfile();
  let msgs = await db.select().from(chatMessages).where(and(eq(chatMessages.profileId, profile.id), eq(chatMessages.thread, thread))).orderBy(asc(chatMessages.createdAt));
  const ctx = await context(db, profile.id, thread);
  if (!msgs.length) {
    const top = ctx.tips[0];
    const text =
      thread !== "general" && ctx.v && top
        ? `Nice work on that ${ctx.v.move.toLowerCase()}, ${profile.name}! The biggest thing I noticed was at ${top.time}: ${top.saw} What would you like to know?`
        : `Hey ${profile.name}! Ask me anything — technique, drills, your quest or how to film. What's on your mind?`;
    await db.insert(chatMessages).values({ profileId: profile.id, thread, role: "coach", text });
    msgs = await db.select().from(chatMessages).where(and(eq(chatMessages.profileId, profile.id), eq(chatMessages.thread, thread))).orderBy(asc(chatMessages.createdAt));
  }
  return json({
    tag: thread !== "general" && ctx.v ? ctx.v.move : "Ask anything",
    chips: thread !== "general" && ctx.v ? ["Why does this matter?", "Give me a drill", "What should I fix first?"] : ["What should I work on?", "Give me a drill", "How do I film?"],
    messages: msgs.map((m) => ({ id: m.id, role: m.role, text: m.text })),
  });
});

export const POST = route(async (req: Request) => {
  const { thread, text } = z.object({ thread: z.string().min(1), text: z.string().trim().min(1).max(500) }).parse(await req.json());
  const { profile, db } = await requireProfile();
  const notes: Notes = [];
  await db.insert(chatMessages).values({ profileId: profile.id, thread, role: "me", text });
  await award(db, profile.id, "ask", notes);
  const ctx = await context(db, profile.id, thread);
  const prog = await currentProgram(db, profile.id);
  const history = await db.select().from(chatMessages).where(and(eq(chatMessages.profileId, profile.id), eq(chatMessages.thread, thread))).orderBy(asc(chatMessages.createdAt));
  let reply: string;
  try {
    reply = await chatAgent({
      name: profile.name,
      level: profile.level,
      goal: profile.goal,
      move: ctx.v?.move ?? null,
      tips: ctx.tips,
      questName: prog?.name ?? null,
      nextDrill: prog?.drills.find((d) => !d.done)?.title ?? null,
      history: history.map((m) => ({ role: m.role, text: m.text })),
      question: text,
    });
  } catch (e) {
    console.error("chat failed", e);
    const top = ctx.tips[0];
    reply = top ? `Keep it simple: focus on "${top.cue}" for your next session. ${top.try}` : "I couldn't answer just now. Try again in a moment.";
  }
  await db.insert(chatMessages).values({ profileId: profile.id, thread, role: "coach", text: reply });
  return json({ ok: true, notes });
});
