"use client";
import { useEffect, useState } from "react";
import { Bar, CourtLines } from "./ui";
import { Icon, Logo } from "./icons";
import { useMe } from "./shell";

/** 08 Reviewing: the wait. Progress is an estimate; the page polls the real status. */
export function Reviewing({ since, grade, title, leaveLabel, onLeave }: { since: string; grade?: boolean; title?: string; leaveLabel?: string; onLeave: () => void }) {
  const { me } = useMe();
  const expected = me?.ai === "mock" ? 6 : 75;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, (now - new Date(since).getTime()) / 1000);
  const pct = Math.min(95, (elapsed / expected) * 100);
  const slow = elapsed > Math.max(60, expected * 1.5);
  const msg = grade ? "Grading your reps…" : pct < 35 ? "Watching your footwork…" : pct < 70 ? "Checking your paddle face…" : "Writing your tips…";

  return (
    <div
      className="screen dark"
      style={{ background: "linear-gradient(180deg,rgba(4,35,48,.82),rgba(4,35,48,.95)),var(--court) center 55%/cover", position: "relative" }}
    >
      <CourtLines />
      <div className="col" style={{ position: "relative", height: 60, display: "flex", alignItems: "center", gap: 12, padding: "0 24px" }}>
        <button className="icon-btn" onClick={onLeave} aria-label="Back">
          <Icon n="back" />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Reviewing</div>
      </div>
      <div className="col" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 30px", gap: 14, textAlign: "center" }} aria-live="polite">
        <div style={{ width: 120, height: 120, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "5px solid #2c4651" }} />
          <div className="spinner" />
          <div style={{ width: 76, height: 76, borderRadius: "50%", border: "3px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Logo size={44} />
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginTop: 8 }}>{title ?? (grade ? "Grading your drill" : "Reviewing your video")}</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,.7)" }}>{slow ? "This is taking longer than usual." : msg}</div>
        <Bar pct={pct} tone="dark" h={12} style={{ width: "100%", maxWidth: 280, marginTop: 8 }} />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
          {slow ? "You can leave and come back. We'll keep working on it." : "You can leave this screen. We'll tell you when it's ready."}
        </div>
        <button className="btn btn-dark btn-md" style={{ marginTop: 4 }} onClick={onLeave}>
          {leaveLabel ?? (grade ? "Back to quest" : "Back to my videos")}
        </button>
      </div>
    </div>
  );
}

/** 09 Reward: "+50 XP", level bar, and a badge if one was unlocked. */
export function Reward(props: {
  tag: string;
  xp: number;
  title: string;
  badge?: string | null;
  badgeIcon?: string;
  levelUp?: string | null;
  quest?: { name: string; n: number } | null;
  cta: string;
  onNext: () => void;
  secondary?: { label: string; onClick: () => void };
}) {
  const { me } = useMe();
  const L = me?.level;
  return (
    <div className="screen dark" style={{ background: "linear-gradient(180deg,rgba(4,35,48,.75),rgba(4,35,48,.95)),var(--court) center 55%/cover", position: "relative" }}>
      <CourtLines />
      <div className="col" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 34px", gap: 14, textAlign: "center" }}>
        <span className="pill pill-green" style={{ fontSize: 14, padding: "7px 14px" }}>
          {props.tag}
        </span>
        <div style={{ background: "var(--orange)", color: "var(--navy)", fontFamily: "var(--font-display)", fontSize: 28, padding: "6px 24px", borderRadius: 999, animation: "aiPop .5s ease-out both" }}>+{props.xp} XP</div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>{props.title}</div>
        {props.levelUp && (
          <span className="pill pill-gold" style={{ fontSize: 14, animation: "aiPop .5s .2s ease-out both" }}>
            <Icon n="star" size={16} />
            Level up! You&apos;re a {props.levelUp}
          </span>
        )}
        {props.quest && (
          <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
              <span>{props.quest.name}</span>
              <span style={{ color: "rgba(255,255,255,.7)" }}>{props.quest.n}/10 drills</span>
            </div>
            <Bar pct={props.quest.n * 10} tone="dark" h={12} />
          </div>
        )}
        {L && (
          <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
              <span>
                Level {L.n} · {L.name}
              </span>
              <span style={{ color: "rgba(255,255,255,.7)" }}>
                {me?.profile?.xp} / {L.hi} XP
              </span>
            </div>
            <Bar pct={L.pct} tone="dark" h={12} />
          </div>
        )}
        {props.badge && (
          <div style={{ alignSelf: "stretch", background: "#2f3f31", borderRadius: 20, padding: "12px 14px", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--gold)", border: "3px solid var(--navy)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", inset: 3, borderRadius: "50%", border: "2px dotted rgba(4,35,48,.7)" }} />
              <Icon n={props.badgeIcon ?? "trophy"} size={22} />
            </div>
            <div>
              <div style={{ color: "var(--gold)", fontWeight: 800, fontSize: 12, letterSpacing: ".08em" }}>BADGE UNLOCKED</div>
              <div style={{ fontWeight: 800, fontSize: 17, marginTop: 2 }}>{props.badge}</div>
            </div>
          </div>
        )}
        <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={props.onNext}>
          {props.cta}
        </button>
        {props.secondary && (
          <button className="btn btn-dark btn-md" onClick={props.secondary.onClick}>
            {props.secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}
