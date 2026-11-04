"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, notify } from "@/lib/client";
import type { QuestsData } from "@/lib/quests-types";

export function chooseMessage(d: QuestsData) {
  if (d.latestVideo) return `Based on your ${d.latestVideo.move.toLowerCase()}, I'd start with a quest I've marked for you.`;
  return "Pick a quest to start training. Upload a clip anytime and I'll tailor your plan.";
}

/** Starts a quest. The Coach agent builds the 10 drills. */
export function useStartQuest() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const start = async (key: string, isCurrent: boolean) => {
    if (isCurrent) return router.push("/quests/path");
    setBusy(key);
    try {
      await api("/api/quests", { body: { questKey: key } });
      router.push("/quests/path");
    } catch (e) {
      notify((e as ApiError).message);
      setBusy(null);
    }
  };
  return { start, busy };
}

