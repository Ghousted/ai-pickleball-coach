"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Icon } from "@/components/icons";
import { Check } from "@/components/ui";
import { useMe } from "@/components/shell";
import { api, notify } from "@/lib/client";
import { FILM_STEPS } from "@/lib/game";

/** 05b Film wizard: the how-to-film screen, shown before an upload until "Don't show this again". */
function Wizard() {
  const router = useRouter();
  const next = useSearchParams().get("next") === "upload" ? "upload" : "quests";
  const { me, reload } = useMe();
  const [i, setI] = useState(0);
  const [dirn, setDirn] = useState(1);
  const [hide, setHide] = useState<boolean | null>(null);
  const hidden = hide ?? me?.profile?.hideWizard ?? false;

  const finish = () => {
    if (next === "upload") router.replace("/videos/upload");
    else {
      notify(`Welcome, ${me?.profile?.name ?? ""}! Pick a quest to get started.`);
      router.replace("/quests");
    }
  };
  const toggleHide = async () => {
    const v = !hidden;
    setHide(v);
    await api("/api/profile", { method: "PATCH", body: { hideWizard: v } }).catch(() => setHide(!v));
    reload();
  };
  const s = FILM_STEPS[i];

  return (
    <div className="screen plain" style={{ overflow: "hidden" }}>
      <div className="col" style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 16px 8px" }}>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>
          {FILM_STEPS.map((_, k) => (
            <div key={k} style={{ height: 8, borderRadius: 99, background: k <= i ? "var(--green)" : "#d4d4d8", transition: "background .3s" }} />
          ))}
        </div>
        <button onClick={finish} style={{ border: "none", background: "transparent", color: "var(--ink-600)", fontWeight: 800, fontSize: 14, cursor: "pointer", padding: "6px 4px" }}>
          Skip
        </button>
      </div>
      <div className="col" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 16px", display: "flex", flexDirection: "column" }}>
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, animation: `${dirn > 0 ? "aiSlideL" : "aiSlideR"} .35s cubic-bezier(.2,.8,.2,1) both` }}>
          <div
            style={{
              background: "linear-gradient(160deg,#0b3040,#042330)",
              borderRadius: 26,
              minHeight: 270,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <div style={{ position: "absolute", inset: 14, border: "3px solid rgba(255,255,255,.1)", borderRadius: 12 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: "3px solid rgba(255,255,255,.1)" }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: "3px solid rgba(255,255,255,.1)" }} />
            </div>
            <span className="pill pill-green sm" style={{ position: "relative" }}>
              Step {i + 1} of 5
            </span>
            <div
              style={{
                position: "relative",
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: "var(--navy-700)",
                border: "4px solid var(--green)",
                color: "var(--green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 12px rgba(44,224,128,.08)",
                animation: "aiLogo .5s .1s cubic-bezier(.2,.9,.3,1.3) both",
              }}
            >
              <Icon n={s.icon} size={52} sw={2} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--navy)", letterSpacing: "-.02em", textWrap: "balance", fontStyle: "italic", textTransform: "uppercase", lineHeight: 1.02 }}>{s.t}</h2>
            <p style={{ fontSize: 16, color: "var(--ink-700)", lineHeight: 1.5, textWrap: "pretty" }}>{s.long}</p>
          </div>
        </div>
      </div>
      <div className="col" style={{ padding: "10px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <button className="check-row" onClick={toggleHide} style={{ alignItems: "center", alignSelf: "flex-start" }}>
          <Check on={hidden} />
          <span style={{ fontSize: 14, color: "var(--ink-700)", fontWeight: 600 }}>Don&apos;t show this again</span>
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          {i > 0 && (
            <button
              className="btn btn-secondary"
              style={{ width: "auto", padding: "0 22px" }}
              onClick={() => {
                setDirn(-1);
                setI(i - 1);
              }}
            >
              Back
            </button>
          )}
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => {
              if (i < 4) {
                setDirn(1);
                setI(i + 1);
              } else finish();
            }}
          >
            {i < 4 ? "Next" : next === "upload" ? "Got it, upload" : "Let's go"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Wizard />
    </Suspense>
  );
}
