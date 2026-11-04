"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileFieldsForm, type ProfileFields } from "@/components/profile-form";
import { useMe } from "@/components/shell";
import { Loading, TopBar } from "@/components/ui";
import { api, ApiError } from "@/lib/client";

/** 26 Edit profile, and delete account. */
export default function EditProfile() {
  const { me } = useMe();
  if (!me?.profile) return <Loading />;
  const p = me.profile;
  return <EditForm initial={{ name: p.name, level: p.level, playDays: p.playDays, goal: p.goal ?? "" }} />;
}

function EditForm({ initial }: { initial: ProfileFields }) {
  const router = useRouter();
  const { reload } = useMe();
  const [f, setF] = useState<ProfileFields>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const ready = f.name.trim() && f.level && f.playDays.length > 0;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/profile", { method: "PATCH", body: f });
      reload();
      router.replace("/you");
    } catch (e) {
      setErr((e as ApiError).message);
      setBusy(false);
    }
  };
  const del = async () => {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    try {
      await api("/api/account", { method: "DELETE" });
      reload();
      router.replace("/");
    } catch (e) {
      setErr((e as ApiError).message);
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="Edit profile" back={() => router.back()} />
      <div className="pad g10">
        <ProfileFieldsForm f={f} set={setF} withName />
        {err && (
          <div className="error-box" role="alert">
            {err}
          </div>
        )}
        <button className="btn btn-primary" disabled={!ready || busy} onClick={save}>
          Save changes
        </button>
        <div className="dashed" style={{ padding: 16, gap: 10, marginTop: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>Delete account</div>
          <div className="muted">Deletes your account, your videos, reviews, quests, XP and badges. This can&apos;t be undone.</div>
          {confirm && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>Tap again to confirm.</div>}
          <button className="btn btn-danger btn-sm" style={{ alignSelf: "flex-start", padding: "0 22px" }} disabled={busy} onClick={del}>
            Delete my account
          </button>
        </div>
      </div>
    </div>
  );
}
