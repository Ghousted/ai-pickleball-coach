"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";
import { useMe } from "@/components/shell";
import { CoachSays, ErrorState, Loading, Thumb } from "@/components/ui";
import { notify, timeAgo, useApi } from "@/lib/client";

type V = { id: string; move: string; status: string; durationSec: number; createdAt: string; tipCount: number };

const CHIP: Record<string, [string, string]> = {
  reviewed: ["", "pill-mint"],
  reviewing: ["Reviewing…", "pill-grey2"],
  uploaded: ["Reviewing…", "pill-grey2"],
  unusable: ["Can't review", "pill-red"],
  failed: ["Try again", "pill-red"],
  uploading: ["Finish upload", "pill-gold"],
};

/** 04 Videos. */
export default function Videos() {
  const router = useRouter();
  const { me, reload: reloadMe } = useMe();
  const { data, error, reload } = useApi<{ videos: V[]; max: number }>("/api/videos", {
    pollMs: 4000,
    poll: (d) => d.videos.some((v) => v.status === "reviewing" || v.status === "uploaded"),
  });
  // When a review finishes while the player waits here: say so, and refresh the XP in the header.
  const waiting = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const now = new Set(data.videos.filter((v) => v.status === "reviewing" || v.status === "uploaded").map((v) => v.id));
    const finished = waiting.current ? data.videos.filter((v) => waiting.current!.has(v.id) && !now.has(v.id)) : [];
    if (finished.length) {
      reloadMe();
      for (const v of finished) notify(v.status === "reviewed" ? `Your review is ready: ${v.move}` : v.status === "unusable" ? `Your coach couldn't review that ${v.move.toLowerCase()} clip` : "A review didn't finish");
    }
    waiting.current = now;
  }, [data, reloadMe]);
  const name = me?.profile?.name ?? "there";

  const toUpload = () => {
    if (data && data.videos.length >= data.max) return notify("Delete a video to upload another");
    router.push(me?.profile?.hideWizard ? "/videos/upload" : "/film/wizard?next=upload");
  };

  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const vids = data.videos;

  return (
    <div className="screen tabbed">
      <div className="pad">
        {!vids.length ? (
          <>
            <CoachSays>Hi {name}! Send me a clip of you playing and I&apos;ll coach it.</CoachSays>
            <div style={{ background: "#fff", border: "3px solid var(--green)", borderRadius: 22, padding: "0 18px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", overflow: "hidden" }}>
              <div style={{ alignSelf: "stretch", margin: "0 -18px 6px", height: 150, background: "linear-gradient(180deg,rgba(4,35,48,0) 55%,#fff),var(--court) center 55%/cover", position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: 14, background: "var(--navy)", color: "var(--green)", fontWeight: 800, fontStyle: "italic", fontSize: 12, letterSpacing: ".06em", padding: "5px 10px", borderRadius: 6, transform: "skewX(-10deg)", textTransform: "uppercase" }}>
                  Rally 1
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", color: "var(--navy)" }}>No videos yet</div>
              <div className="muted" style={{ textWrap: "pretty" }}>
                Upload one clip, about 30 seconds. Your first review earns you XP.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                <span className="xp-tag">+10 XP upload</span>
                <span className="xp-tag">+50 XP review</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={toUpload}>
              <Icon n="upload" />
              Upload your first video
            </button>
            <Link href="/film" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              How to film
            </Link>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="h-display">Your videos</h2>
              <span className="pill pill-grey2">
                {vids.length} of {data.max}
              </span>
            </div>
            <button className="btn btn-primary" onClick={toUpload}>
              <Icon n="plus" />
              Upload a video
            </button>
            {vids.length === 1 && vids[0].status === "reviewed" && <div className="small center">Upload a second video to compare.</div>}
            {vids.map((v) => {
              const [label, cls] = CHIP[v.status] ?? ["", "pill-gray"];
              const href = v.status === "uploading" ? `/videos/upload?resume=${v.id}` : `/videos/${v.id}`;
              return (
                <Link key={v.id} href={href} className="row" style={{ textDecoration: "none" }}>
                  <Thumb src={v.status === "uploading" ? undefined : `/api/videos/${v.id}/file`} dur={v.durationSec} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-title">{v.move}</div>
                    <div className="row-sub">{timeAgo(v.createdAt)}</div>
                  </div>
                  <span className={`pill ${cls}`}>{label || `${v.tipCount} tips`}</span>
                </Link>
              );
            })}
            <Link href="/film" className="link ink">
              How to film a great clip
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
