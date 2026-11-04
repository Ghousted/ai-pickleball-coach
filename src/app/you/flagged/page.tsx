"use client";
import Link from "next/link";
import { ErrorState, Loading, TopBar } from "@/components/ui";
import { api, timeAgo, useApi } from "@/lib/client";

type F = {
  tips: { id: string; saw: string; time: string; move: string; createdAt: string }[];
  drills: { id: string; title: string; how: string; quest: string; num: number }[];
  comparisons: { id: string; createdAt: string; message: string }[];
};

/** 23 Flagged: every tip, drill and comparison marked "This looks wrong". */
export default function Flagged() {
  const { data, error, reload, setData } = useApi<F>("/api/flagged");
  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const undo = async (kind: "tips" | "drills" | "comparisons", id: string) => {
    setData({ ...data, [kind]: (data[kind] as { id: string }[]).filter((x) => x.id !== id) });
    const url = kind === "tips" ? `/api/tips/${id}` : kind === "drills" ? `/api/drills/${id}` : `/api/compare/${id}`;
    await api(url, { method: "PATCH", body: { flagged: false } }).catch(reload);
  };
  const empty = !data.tips.length && !data.drills.length && !data.comparisons.length;
  const Undo = ({ onClick }: { onClick: () => void }) => (
    <button className="link" style={{ padding: 0, alignSelf: "flex-start" }} onClick={onClick}>
      Undo flag
    </button>
  );

  return (
    <div className="screen">
      <TopBar title="Flagged" back={{ fallback: "/you" }} />
      <div className="pad g12">
        <div className="muted">Flagged tips are left out of your quests. Undo any time.</div>
        {data.tips.map((t) => (
          <div key={t.id} className="dashed" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pill pill-gray sm" style={{ background: "#e9e9eb", fontSize: 13 }}>
                Tip · {t.move}
              </span>
              <span className="muted">
                {timeAgo(t.createdAt)} · {t.time}
              </span>
            </div>
            <div style={{ fontSize: 15, color: "var(--ink-700)", lineHeight: 1.45 }}>{t.saw.charAt(0).toUpperCase() + t.saw.slice(1)}</div>
            <Undo onClick={() => undo("tips", t.id)} />
          </div>
        ))}
        {data.drills.map((d) => (
          <div key={d.id} className="dashed" style={{ padding: "14px 16px" }}>
            <span className="pill pill-gray sm" style={{ background: "#e9e9eb", fontSize: 13, alignSelf: "flex-start" }}>
              Drill {d.num} · {d.quest}
            </span>
            <Link href={`/drills/${d.id}`} className="row-title" style={{ textDecoration: "none" }}>
              {d.title}
            </Link>
            <div className="muted">{d.how}</div>
            <Undo onClick={() => undo("drills", d.id)} />
          </div>
        ))}
        {data.comparisons.map((c) => (
          <div key={c.id} className="dashed" style={{ padding: "14px 16px" }}>
            <span className="pill pill-gray sm" style={{ background: "#e9e9eb", fontSize: 13, alignSelf: "flex-start" }}>
              Comparison · {timeAgo(c.createdAt)}
            </span>
            <Link href={`/compare/${c.id}`} style={{ fontSize: 15, color: "var(--ink-700)", lineHeight: 1.45 }}>
              {c.message || "Before and after"}
            </Link>
            <Undo onClick={() => undo("comparisons", c.id)} />
          </div>
        ))}
        {empty && (
          <div style={{ background: "#fff", border: "2px solid var(--line)", borderRadius: 18, padding: 18, textAlign: "center", fontSize: 14, color: "var(--ink-600)" }}>
            Nothing flagged. Tap &quot;This looks wrong&quot; on any tip, drill or comparison.
          </div>
        )}
      </div>
    </div>
  );
}
