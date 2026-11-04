"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/icons";
import { ProfileFieldsForm, type ProfileFields } from "@/components/profile-form";
import { useMe } from "@/components/shell";
import { api, ApiError } from "@/lib/client";

/** 03 Setup: "Meet your coach". Creates the profile. */
export default function Setup() {
  const router = useRouter();
  const { me, reload } = useMe();
  const [f, setF] = useState<ProfileFields>({ name: "", level: "Regular", playDays: ["Sat", "Sun"], goal: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitted = useRef(false);
  useEffect(() => {
    if (me?.profile && !submitted.current) router.replace("/quests");
  }, [me, router]);
  const [touchedName, setTouchedName] = useState(false);
  const fv = touchedName || !me?.user ? f : { ...f, name: me.user.name };
  const setFv = (x: ProfileFields) => {
    if (x.name !== fv.name) setTouchedName(true);
    setF(x);
  };

  const ready = fv.name.trim() && fv.level && fv.playDays.length > 0;
  const go = async () => {
    setBusy(true);
    setErr(null);
    submitted.current = true;
    try {
      await api("/api/profile", { body: fv });
      reload();
      router.replace("/film/wizard?next=quests");
    } catch (e) {
      submitted.current = false;
      setErr((e as ApiError).message);
      setBusy(false);
    }
  };

  return (
    <div className="screen white">
      <div style={{ background: "var(--navy)", position: "relative", padding: "24px var(--gutter) 60px", color: "#fff", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "calc(var(--gutter) - 6px)", right: "calc(var(--gutter) - 6px)", top: 14, bottom: -20, border: "3px solid rgba(255,255,255,.13)", borderRadius: 10 }}>
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: "3px solid rgba(255,255,255,.13)" }} />
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar" style={{ width: 60, height: 60, borderWidth: 4 }}>
            <Logo size={44} />
          </div>
          <span className="pill pill-green">Pickleball</span>
          <span className="pill pill-gold">Level 1</span>
        </div>
        <h1 style={{ position: "relative", margin: "14px 0 12px", fontSize: 30, fontWeight: 800, letterSpacing: "-.02em" }}>Meet your coach</h1>
        <div style={{ position: "relative", background: "rgba(255,255,255,.08)", border: "2px solid rgba(255,255,255,.14)", borderRadius: 18, padding: "12px 16px", fontSize: 15, lineHeight: 1.45 }}>
          Hi {fv.name || "there"}! Tell me how you play and we&apos;ll start leveling you up.
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (ready && !busy) go(); }} className="col" style={{ background: "#fff", borderRadius: "28px 28px 0 0", marginTop: -28, position: "relative", padding: "24px 20px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <ProfileFieldsForm f={fv} set={setFv} withName={!me?.user?.name} />
        {err && (
          <div className="error-box" role="alert">
            {err}
          </div>
        )}
        <div className="grow" />
        <button type="submit" className="btn btn-primary btn-lg" disabled={!ready || busy}>
          {busy ? "Saving…" : "Game on"}
        </button>
      </form>
    </div>
  );
}
