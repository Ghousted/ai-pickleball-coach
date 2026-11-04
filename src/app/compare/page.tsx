"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useMe } from "@/components/shell";
import { CoachSays, ErrorState, Loading, Thumb, TopBar } from "@/components/ui";
import { api, ApiError, notify, timeAgo, useApi } from "@/lib/client";

type V = { id: string; move: string; status: string; durationSec: number; createdAt: string };

/** 19 Pick two videos. Only reviewed clips of the same move can be compared. */
function ComparePick() {
  const router = useRouter();
  const withId = useSearchParams().get("with");
  const { me } = useMe();
  const { data, error, reload } = useApi<{ videos: V[] }>("/api/videos");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const ready = data?.videos.filter((v) => v.status === "reviewed") ?? [];
  const anchor = ready.find((v) => v.id === (sel[0] ?? withId));
  const list = anchor ? ready.filter((v) => v.move.toLowerCase() === anchor.move.toLowerCase()) : ready;

  // Preselects the clip the player came from, once the list has loaded.
  useEffect(() => {
    if (!data || sel.length) return;
    const w = ready.find((v) => v.id === withId);
    if (w) {
      const other = ready.find((v) => v.id !== w.id && v.move.toLowerCase() === w.move.toLowerCase());
      setSel(other ? [other.id, w.id] : [w.id]); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = async () => {
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/compare", { body: { ids: sel } });
      router.replace(`/compare/${r.id}`);
    } catch (e) {
      notify((e as ApiError).message);
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error.message} retry={reload} />;
  if (!data) return <Loading />;
  const first = !me?.badges?.compare;

  return (
    <div className="screen">
      <TopBar title="Pick two videos" back={{ fallback: "/videos" }} />
      <div className="pad">
        <CoachSays>
          {ready.length < 2 ? "Upload a second video to compare." : `Pick two clips of the same move and I'll show what changed.${first ? " +75 XP the first time." : ""}`}
        </CoachSays>
        {list.map((v) => {
          const on = sel.includes(v.id);
          return (
            <button key={v.id} className="row" aria-pressed={on} onClick={() => setSel((s) => (on ? s.filter((x) => x !== v.id) : [...s, v.id].slice(-2)))}>
              <Thumb src={`/api/videos/${v.id}/file`} dur={v.durationSec} />
              <div style={{ flex: 1 }}>
                <div className="row-title">{v.move}</div>
                <div className="row-sub">{timeAgo(v.createdAt)}</div>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: "50%", border: `3px solid ${on ? "var(--green-700)" : "#d4d4d8"}`, background: on ? "var(--green)" : "#fff", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {on && <Icon n="check" size={16} sw={3} />}
              </div>
            </button>
          );
        })}
        {anchor && list.length < 2 && <div className="small center">Upload a second {anchor.move.toLowerCase()} video to compare.</div>}
        {ready.length < 2 ? (
          <button className="btn btn-primary" onClick={() => router.push("/videos/upload")}>
            Upload a video
          </button>
        ) : (
          <button className="btn btn-primary" disabled={sel.length !== 2 || busy} onClick={go}>
            {busy ? "Comparing…" : "Compare"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ComparePick />
    </Suspense>
  );
}
