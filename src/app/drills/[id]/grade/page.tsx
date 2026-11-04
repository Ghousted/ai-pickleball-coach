"use client";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Avatar, ErrorState, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";

type D = {
  drill: { id: string; title: string; done: boolean };
  quest: { name: string; done: number };
  grade: { grade: string; score: number; metrics: { label: string; value: number }[]; good: string; next: string; cue: string; xp: number } | null;
  nextDrillId: string | null;
};

/** 14b Drill grade. */
export default function DrillGrade() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload } = useApi<D>(`/api/drills/${id}`);
  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const g = data.grade;
  if (!g) return <ErrorState message="No grade for this drill yet." retry={() => router.push(`/drills/${id}`)} />;
  const finished = !data.nextDrillId;

  return (
    <div className="screen">
      <div style={{ background: "linear-gradient(180deg,rgba(4,35,48,.78),rgba(4,35,48,.96)),var(--court) center 55%/cover", color: "#fff", padding: "16px var(--gutter) 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", borderBottom: "4px solid var(--green)" }}>
        <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="icon-btn round" onClick={() => router.push("/quests/path")} aria-label="Back to quest">
            <Icon n="back" />
          </button>
          <span className="xp-tag">+{g.xp} XP</span>
        </div>
        <span className="pill pill-green sm">Drill graded</span>
        <div style={{ width: 104, height: 104, borderRadius: "50%", background: "var(--gold)", border: "4px solid #fff", position: "relative", animation: "aiPop .5s ease-out", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--navy)", boxShadow: "0 6px 0 var(--gold-dark)" }}>
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "4px dotted rgba(4,35,48,.6)" }} />
          <span style={{ position: "relative", fontFamily: "var(--font-display)", fontSize: 40 }}>{g.grade}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", letterSpacing: "-.02em", lineHeight: 1 }}>{data.drill.title}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.75)" }}>
          Score {g.score}/100 · {data.quest.name}
        </div>
      </div>
      <div className="pad g12">
        <div className="row col static" style={{ gap: 12 }}>
          {g.metrics.map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>
                <span>{m.label}</span>
                <span style={{ color: "var(--ink-600)" }}>{m.value}%</span>
              </div>
              <div className="bar">
                <i style={{ width: `${m.value}%`, background: m.value >= 85 ? "var(--green)" : m.value >= 75 ? "var(--gold)" : "var(--orange)" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="coach">
          <Avatar size={48} />
          <div className="h-section" style={{ flex: 1 }}>
            Coach&apos;s notes
          </div>
        </div>
        <div className="row col static" style={{ gap: 8 }}>
          <span className="pill pill-mint" style={{ alignSelf: "flex-start" }}>
            <Icon n="check" size={16} sw={3} />
            What&apos;s working
          </span>
          <div style={{ fontSize: 15, color: "var(--ink-700)", lineHeight: 1.45 }}>{g.good}</div>
        </div>
        <div className="row col static" style={{ gap: 8 }}>
          <span className="pill pill-gold" style={{ alignSelf: "flex-start" }}>
            <Icon n="flag" />
            Next rep
          </span>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", lineHeight: 1.4 }}>{g.next}</div>
          <span className="pill pill-gray" style={{ alignSelf: "flex-start" }}>
            Cue: {g.cue}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          <button className="btn btn-primary" style={{ height: 52, fontSize: 15 }} onClick={() => router.push(finished ? "/quests/path" : `/drills/${data.nextDrillId}`)}>
            {finished ? "Finish quest" : "Next drill"}
          </button>
          <button className="btn btn-secondary" style={{ height: 52, fontSize: 15 }} onClick={() => router.push("/quests/path")}>
            Back to quest
          </button>
        </div>
      </div>
    </div>
  );
}
