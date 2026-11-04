"use client";
import { useRouter } from "next/navigation";
import { ErrorState, Loading, TopBar } from "@/components/ui";
import { api, timeAgo, useApi } from "@/lib/client";

type F = { tips: { id: string; saw: string; time: string; move: string; createdAt: string }[] };

/** 23 Flagged tips. */
export default function Flagged() {
  const router = useRouter();
  const { data, error, reload, setData } = useApi<F>("/api/flagged");
  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const undo = async (id: string) => {
    setData({ tips: data.tips.filter((t) => t.id !== id) });
    await api(`/api/tips/${id}`, { method: "PATCH", body: { flagged: false } }).catch(reload);
  };
  return (
    <div className="screen">
      <TopBar title="Flagged tips" back={() => router.back()} />
      <div className="pad g12">
        <div className="muted">These tips are left out of your quests. Undo any time.</div>
        {data.tips.map((t) => (
          <div key={t.id} className="dashed" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pill pill-gray sm" style={{ background: "#e9e9eb", fontSize: 13 }}>
                {t.move}
              </span>
              <span className="muted">
                {timeAgo(t.createdAt)} · {t.time}
              </span>
            </div>
            <div style={{ fontSize: 15, color: "var(--ink-700)", lineHeight: 1.45 }}>{t.saw.charAt(0).toUpperCase() + t.saw.slice(1)}</div>
            <button className="link" style={{ padding: 0, alignSelf: "flex-start" }} onClick={() => undo(t.id)}>
              Undo flag
            </button>
          </div>
        ))}
        {!data.tips.length && (
          <div style={{ background: "#fff", border: "2px solid var(--line)", borderRadius: 18, padding: 18, textAlign: "center", fontSize: 14, color: "var(--ink-600)" }}>Nothing flagged. Tap &quot;This looks wrong&quot; on any tip to leave it out.</div>
        )}
      </div>
    </div>
  );
}
