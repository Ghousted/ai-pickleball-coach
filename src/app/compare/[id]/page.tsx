"use client";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Reviewing } from "@/components/reviewing";
import { CoachSays, ErrorState, Loading, Note, TopBar } from "@/components/ui";
import { api, timeAgo, useApi } from "@/lib/client";
import { fmt } from "@/lib/game";

type Item = { title: string; text: string };
type C = {
  id: string;
  status: "running" | "done" | "failed";
  result: { message: string; improved: Item[]; same: Item[]; next: Item[] } | null;
  xp: number;
  flagged: boolean;
  pair: { id: string; move: string; durationSec: number; createdAt: string; tipCount: number }[];
  statusAt: string;
};

/** 20 Before and after. */
export default function CompareResult() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload, setData } = useApi<C>(`/api/compare/${id}`, { pollMs: 2500, poll: (d) => d.status === "running" });

  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  if (data.status === "running") return <Reviewing since={data.statusAt} title="Comparing your clips" leaveLabel="Back to my videos" onLeave={() => router.push("/videos")} />;
  if (data.status === "failed" || !data.result)
    return (
      <div className="screen">
        <TopBar title="Before and after" back="/videos" />
        <ErrorState
          message="The comparison didn't finish. Your clips are safe."
          retry={async () => {
            await api(`/api/compare/${id}`, { method: "POST" });
            reload();
          }}
        />
      </div>
    );

  const r = data.result;
  const groups = [
    { label: "Looking better", icon: "check", cls: "pill-mint", items: r.improved },
    { label: "Still working on", icon: "target", cls: "pill-gold", items: r.same },
    { label: "Work on next", icon: "plus", cls: "pill-blue", items: r.next },
  ].filter((g) => g.items.length);
  const flag = async () => {
    setData({ ...data, flagged: !data.flagged });
    await api(`/api/compare/${id}`, { method: "PATCH", body: { flagged: !data.flagged } });
  };

  return (
    <div className="screen">
      <TopBar title="Before and after" back="/videos" right={data.xp ? <span className="xp-tag">+{data.xp} XP</span> : undefined} />
      <div className="pad g12">
        <div className="grid2">
          {data.pair.map((v, i) => (
            <button key={v.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6, textAlign: "left", cursor: "pointer", font: "inherit" }} onClick={() => router.push(`/videos/${v.id}`)}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink-600)" }}>{i ? "AFTER" : "BEFORE"}</div>
              <div className="thumb" style={{ width: "100%", height: 62, borderRadius: 12 }}>
                <video src={`/api/videos/${v.id}/file#t=0.5`} preload="metadata" muted playsInline />
                {v.durationSec > 0 && <span className="dur" style={{ left: 6, bottom: 6 }}>{fmt(v.durationSec)}</span>}
              </div>
              <div className="row-title">{v.move}</div>
              <div className="small">
                {timeAgo(v.createdAt)} · {v.tipCount} tips
              </div>
            </button>
          ))}
        </div>
        <CoachSays size={52}>{r.message}</CoachSays>
        {groups.map((g) => (
          <div key={g.label} style={{ display: "flex", flexDirection: "column" }}>
            <span className={`pill ${g.cls}`} style={{ alignSelf: "flex-start", marginTop: 4 }}>
              <Icon n={g.icon} size={14} sw={3} />
              {g.label}
            </span>
            {g.items.map((it, k) => (
              <div key={k} className="row col static" style={{ gap: 4 }}>
                <div className="row-title">{it.title}</div>
                <div style={{ fontSize: 14, color: "var(--ink-600)", lineHeight: 1.4 }}>{it.text}</div>
              </div>
            ))}
          </div>
        ))}
        <button onClick={flag} style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: data.flagged ? "var(--red)" : "var(--ink-700)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          <Icon n="flag" />
          {data.flagged ? "Flagged · undo" : "This looks wrong"}
        </button>
        <Note>Coaching comparison, not medical advice.</Note>
        <button className="btn btn-primary" style={{ marginBottom: 6 }} onClick={() => router.push("/quests")}>
          Back to your quest
        </button>
      </div>
    </div>
  );
}
