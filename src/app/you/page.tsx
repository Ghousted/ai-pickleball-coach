"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useMe } from "@/components/shell";
import { BadgeCoin, ErrorState, Loading } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { BADGES } from "@/lib/game";

/** 24 You. */
export default function You() {
  const router = useRouter();
  const { me, meError, reload } = useMe();
  if (meError && !me) return <ErrorState message={meError} retry={reload} />;
  if (!me?.profile || !me.level) return <Loading />;
  const p = me.profile;
  const L = me.level;
  const stats = [
    { n: me.stats?.videos ?? 0, l: "Videos" },
    { n: me.stats?.drills ?? 0, l: "Drills" },
    { n: me.stats?.badges ?? 0, l: "Badges" },
  ];
  const logout = async () => {
    await authClient.signOut();
    reload();
    router.replace("/");
  };

  return (
    <div className="screen tabbed">
      <div className="pad">
        <div style={{ background: "linear-gradient(110deg,rgba(4,35,48,.96) 40%,rgba(4,35,48,.65)),var(--court) center 45%/cover", borderRadius: 24, padding: 18, color: "#fff", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 10px 24px rgba(4,35,48,.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "var(--gold)", border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", inset: 5, borderRadius: "50%", border: "3px dotted rgba(4,35,48,.7)" }} />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--navy)", position: "relative" }}>{L.n}</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{p.name}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)", marginTop: 2 }}>
                {L.name} · {p.level} player
              </div>
            </div>
          </div>
          <div className="bar dark" style={{ height: 12 }}>
            <i style={{ width: `${L.pct}%` }} />
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)" }}>
            {p.xp} / {L.hi} XP to {L.nextName}
          </div>
          <div className="grid3">
            {stats.map((s) => (
              <div key={s.l} style={{ background: "var(--navy-700)", borderRadius: 16, padding: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontStyle: "italic" }}>{s.n}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <Link href="/you/badges" className="row col" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>Badges</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--ink-600)" }}>
              {me.stats?.badges ?? 0} of {BADGES.length}
              <Icon n="chev" />
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BADGES.slice(0, 6).map((b) => (
              <BadgeCoin key={b.id} size={40} icon={b.icon} on={!!me.badges?.[b.id]} />
            ))}
          </div>
        </Link>
        <div className="row col static">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>Your profile</span>
            <Link href="/you/edit" className="link" style={{ padding: 0 }}>
              Edit
            </Link>
          </div>
          <div className="muted">
            Sport: <b style={{ color: "var(--ink-700)" }}>Pickleball</b> · Level: <b style={{ color: "var(--ink-700)" }}>{p.level}</b>
          </div>
          <div className="muted">
            Play days: <b style={{ color: "var(--ink-700)" }}>{p.playDays.join(", ") || "Not set"}</b>
          </div>
          <div className="muted">
            Goal: <b style={{ color: "var(--ink-700)" }}>{p.goal || "Not set"}</b>
          </div>
          <div className="muted">{me.user?.email}</div>
        </div>
        <Link href="/you/flagged" className="row" style={{ textDecoration: "none" }}>
          <div className="dot-icon" style={{ width: 42, height: 42, background: "#f1f1f3", color: "var(--navy)" }}>
            <Icon n="flag" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="row-title">Flagged</div>
            <div className="row-sub">{me.stats?.flagged ?? 0} flagged tips left out of your quests</div>
          </div>
          <Icon n="chev" color="var(--navy)" />
        </Link>
        <button className="btn btn-secondary" onClick={logout}>
          Log out
        </button>
        {me.ai === "mock" && (
          <div className="small center" style={{ lineHeight: 1.45 }}>
            Demo mode: the coach uses sample answers. Add a Gemini or OpenRouter key to get real reviews.
          </div>
        )}
      </div>
    </div>
  );
}
