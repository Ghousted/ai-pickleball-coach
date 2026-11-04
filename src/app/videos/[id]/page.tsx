"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Reviewing, Reward } from "@/components/reviewing";
import { useMe } from "@/components/shell";
import { Avatar, ErrorState, Loading, Note, TopBar } from "@/components/ui";
import { api, ApiError, notify, useApi } from "@/lib/client";
import { BADGES, fmt } from "@/lib/game";

type Tip = { id: string; timeSec: number; time: string; title: string; saw: string; try: string; cue: string; flagged: boolean };
type Data = {
  video: { id: string; kind: string; drillId: string | null; move: string; status: string; durationSec: number; statusAt: string; src: string };
  review: { usable: boolean; unusableReason: string | null; subject: string | null; reward: { xp: number; badge: string | null; levelUp: string | null } | null } | null;
  tips: Tip[];
  otherReviewed: string[];
  notMedical: string;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function VideoScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me, reload: reloadMe } = useMe();
  const { data, error, reload, setData } = useApi<Data>(`/api/videos/${id}`, {
    pollMs: 2500,
    poll: (d) => d.video.status === "reviewing" || d.video.status === "uploaded",
  });
  const [showReward, setShowReward] = useState(false);
  const status = data?.video.status;
  // XP and badges change when a review finishes, so refresh the header then.
  useEffect(() => {
    if (status && status !== "reviewing" && status !== "uploaded") reloadMe();
  }, [status, reloadMe]);

  // The reward shows once per review, also when the player left the waiting screen and came back later.
  // It reads localStorage, which only exists outside render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (status === "reviewed" && data?.video.kind === "clip" && data.review?.reward) {
      const key = `coach:rewarded:${id}`;
      try {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          setShowReward(true);
        }
      } catch {}
    }
    if (status === "uploading") router.replace(`/videos/upload?resume=${id}`);
    if (status === "reviewed" && data?.video.kind === "grade" && data.video.drillId) router.replace(`/drills/${data.video.drillId}/grade`);
  }, [status, data, id, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isGrade = data?.video.kind === "grade" && !!data.video.drillId;
  // A drill clip belongs to its drill, not to the Videos tab.
  const home = isGrade ? `/drills/${data!.video.drillId}` : "/videos";
  const leave = () => router.push(isGrade ? "/quests/path" : "/videos");
  const del = async () => {
    try {
      await api(`/api/videos/${id}`, { method: "DELETE" });
      router.replace(home);
    } catch (e) {
      notify((e as ApiError).message);
      throw e;
    }
  };

  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const v = data.video;

  if (v.status === "reviewing" || v.status === "uploaded") return <Reviewing since={v.statusAt} grade={v.kind === "grade"} onLeave={leave} />;

  if (showReward && data.review?.reward) {
    const r = data.review.reward;
    return (
      <Reward
        tag="Review ready"
        xp={r.xp}
        title={`Nice work, ${me?.profile?.name ?? ""}`}
        badge={r.badge}
        badgeIcon={BADGES.find((b) => b.name === r.badge)?.icon}
        levelUp={r.levelUp}
        cta="See your tips"
        onNext={() => {
          setShowReward(false);
          router.replace(`/videos/${id}`);
        }}
      />
    );
  }

  if (v.status === "failed") return <Failed id={id} home={home} onDone={reload} onDelete={del} />;
  if (v.status === "unusable") return <CantReview reason={data.review?.unusableReason ?? null} home={home} grade={isGrade} onDelete={del} />;
  if (v.kind === "grade") return <Loading />;
  return <Tips data={data} setData={setData} onDelete={del} />;
}

/* ---------------- 10 Review tips ---------------- */

function Tips({ data, setData, onDelete }: { data: Data; setData: (d: Data) => void; onDelete: () => Promise<void> }) {
  const router = useRouter();
  const { me } = useMe();
  const { data: quests } = useApi<{ current: { id: string } | null }>("/api/quests");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pos, setPos] = useState(0);
  const [mediaDur, setMediaDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(true);
  const v = data.video;
  // The stored length can be unknown (0). Then the video element gives it once it loads.
  const dur = v.durationSec || mediaDur || 1;
  const active = data.tips.filter((t) => !t.flagged);

  const seek = (s: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = s;
    setPos(s);
    el.play().catch(() => {});
  };
  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };
  const flag = async (t: Tip, flagged: boolean) => {
    setData({ ...data, tips: data.tips.map((x) => (x.id === t.id ? { ...x, flagged } : x)) });
    await api(`/api/tips/${t.id}`, { method: "PATCH", body: { flagged } }).catch(() => setData(data));
  };

  let n = 0;
  return (
    <div className="screen">
      <TopBar
        sticky
        title={v.move}
        back="/videos"
        right={
          <>
            {data.review?.reward && <span className="xp-tag">+{data.review.reward.xp} XP</span>}
            <Link href={`/chat?thread=${v.id}`} className="icon-btn" style={{ width: 40, height: 40, color: "#fff" }} aria-label="Chat about this review">
              <Icon n="chat" />
            </Link>
          </>
        }
      />
      <div className="pad g12">
        <div style={{ borderRadius: 22, overflow: "hidden", background: "var(--navy)", position: "relative", height: 210, boxShadow: "0 8px 20px rgba(4,35,48,.25)" }}>
          <video
            ref={videoRef}
            src={v.src}
            playsInline
            preload="metadata"
            onClick={toggle}
            onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setMediaDur(e.currentTarget.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
          />
          {!playing && (
            <button
              onClick={toggle}
              aria-label="Play"
              style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", width: 58, height: 58, borderRadius: "50%", background: "var(--navy)", border: "3px solid #fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Icon n="play" size={24} />
            </button>
          )}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "24px 14px 14px", background: "linear-gradient(transparent,rgba(4,35,48,.55))" }}>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              {fmt(pos)} / {fmt(dur)}
            </div>
            <div
              style={{ height: 8, borderRadius: 99, background: "#27323a", position: "relative", cursor: "pointer" }}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - r.left) / r.width) * dur);
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 99, background: "var(--green)", width: `${Math.min(100, (pos / dur) * 100)}%` }} />
              {active.map((t) => (
                <button
                  key={t.id}
                  aria-label={`Jump to ${t.time}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    seek(t.timeSec);
                  }}
                  style={{ position: "absolute", top: "50%", left: `${(t.timeSec / dur) * 100}%`, width: 14, height: 14, borderRadius: "50%", background: "var(--orange)", border: "2px solid #fff", transform: "translate(-50%,-50%)", cursor: "pointer", padding: 0 }}
                />
              ))}
            </div>
          </div>
        </div>
        {data.review?.subject && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--ink-700)", lineHeight: 1.4 }}>
            <div style={{ flexShrink: 0 }}>
              <Icon n="eye" />
            </div>
            Judging: {data.review.subject}.
          </div>
        )}
        <button className="row" onClick={() => setOpen(!open)} aria-expanded={open} style={{ gap: 10, marginTop: 4 }}>
          <Avatar size={40} logo={22} />
          <div style={{ flex: 1, fontSize: 19, fontWeight: 800, fontStyle: "italic", textTransform: "uppercase", color: "var(--navy)" }}>Your coach&apos;s tips</div>
          <span className="pill pill-navy">{active.length} tips</span>
          <span style={{ display: "flex", color: "var(--navy)", transform: `rotate(${open ? 90 : 0}deg)`, transition: "transform .25s" }}>
            <Icon n="chev" />
          </span>
        </button>
        {open &&
          data.tips.map((t) =>
            t.flagged ? (
              <div key={t.id} className="dashed">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="pill pill-grey2" style={{ fontSize: 14 }}>
                    <Icon n="play" size={12} />
                    {t.time}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", fontWeight: 800, fontSize: 13 }}>
                    <Icon n="flag" />
                    Flagged
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "var(--ink-600)" }}>{cap(t.saw)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--ink-600)" }}>
                  Left out of your quests.
                  <button className="link" style={{ padding: 0, fontSize: 13 }} onClick={() => flag(t, false)}>
                    Undo
                  </button>
                </div>
              </div>
            ) : (
              <div key={t.id} className="row col static">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button className="pill pill-blue" style={{ fontSize: 14, cursor: "pointer" }} onClick={() => seek(t.timeSec)} aria-label={`Play from ${t.time}`}>
                    <Icon n="play" size={12} />
                    {t.time}
                  </button>
                  <span className="pill pill-gold">Tip {++n}</span>
                </div>
                <div style={{ fontSize: 14, color: "var(--ink-700)", lineHeight: 1.45 }}>
                  <b style={{ color: "var(--ink)" }}>I saw:</b> {t.saw}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", lineHeight: 1.35 }}>Try this: {t.try}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className="pill pill-gray">Cue: {t.cue}</span>
                  <button onClick={() => flag(t, true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--ink-700)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    <Icon n="flag" />
                    This looks wrong
                  </button>
                </div>
              </div>
            ),
          )}
        <Note>{data.notMedical}</Note>
        {data.otherReviewed.length > 0 ? (
          <Link href={`/compare?with=${v.id}`} className="row" style={{ gap: 12, textDecoration: "none" }}>
            <div className="dot-icon" style={{ width: 44, height: 44, background: "var(--green)", color: "var(--navy)" }}>
              <Icon n="swap" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="row-title">Compare with another clip</div>
              <div className="row-sub" style={{ fontSize: 12 }}>
                See what changed between clips{me?.badges?.compare ? "" : " · +75 XP"}
              </div>
            </div>
            <div style={{ color: "var(--navy)" }}>
              <Icon n="chev" />
            </div>
          </Link>
        ) : (
          <div className="small center">Upload a second video to compare.</div>
        )}
        <Link href={`/chat?thread=${v.id}`} style={{ background: "#fff", border: "3px solid var(--green)", borderRadius: 20, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <Avatar size={44} logo={22} />
          <div style={{ flex: 1 }}>
            <div className="row-title">Got a question?</div>
            <div className="row-sub" style={{ fontSize: 12 }}>
              Chat with your coach about this review
            </div>
          </div>
          <div style={{ color: "var(--navy)" }}>
            <Icon n="chev" />
          </div>
        </Link>
        <button className="btn btn-primary" onClick={() => router.push(quests?.current ? "/quests/path" : "/quests/choose")}>
          {quests?.current ? "Go to your quest" : "Pick your quest"}
        </button>
        <DeleteVideo onDelete={onDelete} />
      </div>
    </div>
  );
}

/* ---------------- 16 Can't review ---------------- */

/** Delete asks first (PRD), shows that it is busy, and stays usable after an error. */
function DeleteVideo({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    try {
      await onDelete();
    } catch {
      setBusy(false);
    }
  };
  return (
    <>
      {confirm && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", textAlign: "center" }}>Tap again to delete this video and its review.</div>}
      <button className="link danger" style={{ padding: "4px 0 8px" }} disabled={busy} onClick={go}>
        {busy ? "Deleting…" : "Delete this video"}
      </button>
    </>
  );
}

function CantReview({ reason, home, grade, onDelete }: { reason: string | null; home: string; grade: boolean; onDelete: () => Promise<void> }) {
  const router = useRouter();
  const list: [string, string][] = [
    ["camera", "Film sideways"],
    ["user", "Keep your whole body in frame"],
    ["bolt", "Hold the phone steady"],
    ["clock", "Keep it around 30 seconds"],
  ];
  return (
    <div className="screen">
      <TopBar title="Review" back={home} />
      <div className="pad g12">
        <div style={{ padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <div className="dot-icon" style={{ width: 56, height: 56, background: "#fbe3e7", color: "var(--red)" }}>
            <Icon n="eye" />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--navy)", marginTop: 4 }}>Your coach can&apos;t review this one</div>
          <div className="muted">{reason ?? "We could not see your whole body in the clip."} No tips, and no XP lost. Try another clip.</div>
        </div>
        <h3 className="h-section" style={{ marginTop: 8 }}>
          For a clip I can read
        </h3>
        {list.map(([icon, t]) => (
          <div key={t} className="row static">
            <div className="dot-icon" style={{ width: 36, height: 36 }}>
              <Icon n={icon} size={18} />
            </div>
            <div className="row-title" style={{ fontSize: 15 }}>
              {t}
            </div>
          </div>
        ))}
        <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={() => router.push(home === "/videos" ? "/videos/upload" : home)}>
          {grade ? "Back to the drill" : "Upload another video"}
        </button>
        <DeleteVideo onDelete={onDelete} />
      </div>
    </div>
  );
}

/* ---------------- 17 Review failed ---------------- */

function Failed({ id, home, onDone, onDelete }: { id: string; home: string; onDone: () => void; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const retry = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/videos/${id}/review`, { method: "POST" });
      onDone();
    } catch (e) {
      setErr((e as ApiError).message);
    }
    setBusy(false);
  };
  return (
    <div className="screen">
      <TopBar title="Review" back={home} />
      <div className="pad">
        <div style={{ padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <div className="dot-icon" style={{ width: 56, height: 56, background: "#fbe3e7", color: "var(--red)" }}>
            <Icon n="refresh" />
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--navy)", marginTop: 4 }}>The review didn&apos;t finish</div>
          <div className="muted">That was on our side, not yours. Your clip is safe. Try again.</div>
        </div>
        {err && <div className="error-box">{err}</div>}
        <button className="btn btn-primary" disabled={busy} onClick={retry}>
          Try the review again
        </button>
        <DeleteVideo onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <VideoScreen />
    </Suspense>
  );
}
