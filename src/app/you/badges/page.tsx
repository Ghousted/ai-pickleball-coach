"use client";
import { Icon } from "@/components/icons";
import { useMe } from "@/components/shell";
import { ErrorState, Loading, TopBar } from "@/components/ui";
import { BADGES } from "@/lib/game";

/** 25 Badges. */
export default function Badges() {
  const { me, meError, reload } = useMe();
  if (meError && !me) return <ErrorState message={meError} retry={reload} />;
  if (!me?.profile) return <Loading />;
  const qp = me.questProgress ?? {};
  const prog: Record<string, number> = {
    streak: (me.streak ?? 0) / 3,
    sergeant: (me.stats?.drills ?? 0) / 5,
    lvl5: me.profile.xp / 600,
    q_dinks: (qp.dinks ?? 0) / 10,
    q_popups: (qp.popups ?? 0) / 10,
    q_control: (qp.control ?? 0) / 10,
  };
  const count = Object.keys(me.badges ?? {}).length;

  return (
    <div className="screen">
      <TopBar title="Badges" back={{ fallback: "/you" }} right={<span className="pill pill-gold">{count} of {BADGES.length}</span>} />
      <div className="col" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        {BADGES.map((b) => {
          const at = me.badges?.[b.id];
          const p = prog[b.id];
          return (
            <div key={b.id} style={{ padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: "50%",
                  background: at ? "var(--gold)" : "#f4f4f5",
                  border: at ? "4px solid var(--navy)" : "3px dashed #a1a1aa",
                  boxShadow: at ? "0 4px 0 var(--gold-dark)" : "none",
                  color: at ? "var(--navy)" : "#8a8a93",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 4,
                }}
              >
                <Icon n={at ? b.icon : "lock"} size={at ? 28 : 24} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--navy)", lineHeight: 1.2 }}>{b.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-600)", lineHeight: 1.3 }}>
                {at ? `Unlocked ${new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : b.hint}
              </div>
              {!at && p !== undefined && (
                <div style={{ width: "80%", height: 6, borderRadius: 99, background: "var(--line)", overflow: "hidden", marginTop: 2 }}>
                  <div style={{ height: "100%", background: "var(--orange)", borderRadius: 99, width: `${Math.min(1, p) * 100}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
