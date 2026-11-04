"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Logo } from "@/components/icons";
import { useMe } from "@/components/shell";
import { authClient } from "@/lib/auth-client";

type Mode = "signup" | "login";

/** 01 Landing, with the sign-up and sign-in sheets. */
export default function Landing() {
  const router = useRouter();
  const { me, reload } = useMe();
  const [sheet, setSheet] = useState<Mode | null>(null);
  const [closing, setClosing] = useState(false);
  const [f, setF] = useState({ name: "", email: "", pass: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me?.signedIn) router.replace(me.profile ? "/quests" : "/setup");
  }, [me, router]);

  const open = (m: Mode) => {
    setErr(null);
    setClosing(false);
    setSheet(m);
  };
  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setSheet(null);
      setClosing(false);
    }, 240);
  };

  const su = sheet === "signup";
  const check = () =>
    su && !f.name.trim()
      ? "Add your first name."
      : !/\S+@\S+\.\S+/.test(f.email)
        ? "Enter a valid email, like you@example.com."
        : f.pass.length < 8
          ? "Password needs at least 8 characters."
          : null;

  const submit = async () => {
    const e = check();
    if (e) return setErr(e);
    setErr(null);
    setBusy(true);
    const res = su
      ? await authClient.signUp.email({ name: f.name.trim(), email: f.email.trim(), password: f.pass })
      : await authClient.signIn.email({ email: f.email.trim(), password: f.pass });
    if (res.error) {
      setBusy(false);
      const code = res.error.code ?? "";
      setErr(
        res.error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : code.includes("USER_ALREADY_EXISTS") || code.includes("ALREADY")
          ? "That email already has an account. Sign in instead."
          : code.includes("INVALID_EMAIL_OR_PASSWORD") || res.error.status === 401
            ? "That email and password don't match."
            : code.includes("PASSWORD")
              ? "Pick a stronger password, at least 8 characters."
              : res.error.message || "Something went wrong. Try again.",
      );
      return;
    }
    reload();
  };

  return (
    <div className="screen dark" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "var(--court) center 58%/cover no-repeat", animation: "aiZoom 2.4s cubic-bezier(.2,.8,.2,1) both" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,rgba(4,35,48,.92) 0%,rgba(4,35,48,.6) 26%,rgba(4,35,48,0) 44%,rgba(4,35,48,0) 64%,rgba(4,35,48,.7) 82%,#042330 100%)",
          animation: "aiFade .8s ease-out both",
        }}
      />
      <div className="col" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "44px 30px 0", gap: 12 }}>
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: "var(--navy)",
            border: "4px solid var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "aiLogo .7s .1s cubic-bezier(.2,.9,.3,1.3) both",
            boxShadow: "0 0 0 10px rgba(44,224,128,.1)",
          }}
        >
          <Logo size={44} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            fontWeight: 800,
            fontStyle: "italic",
            fontSize: 54,
            lineHeight: 1,
            letterSpacing: "-.03em",
            textTransform: "uppercase",
            transform: "rotate(-4deg)",
            margin: "6px 0 4px",
            animation: "aiRise .6s .35s cubic-bezier(.2,.8,.2,1) both",
          }}
        >
          <span style={{ color: "#fff", textShadow: "0 5px 0 #0b1a20,0 6px 14px rgba(0,0,0,.35)" }}>AI</span>
          <span style={{ color: "var(--green)", textShadow: "0 5px 0 #1a8f4f,0 6px 14px rgba(0,0,0,.35)" }}>Coach</span>
        </div>
      </div>
      <div className="col" style={{ position: "relative", padding: "0 24px 34px", display: "flex", flexDirection: "column", gap: 14, animation: "aiRise .7s .7s cubic-bezier(.2,.8,.2,1) both" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", marginBottom: 8 }}>
          <h1 style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.02em", textWrap: "balance", textShadow: "0 2px 12px rgba(0,0,0,.35)" }}>Level up your pickleball.</h1>
          <p style={{ color: "rgba(255,255,255,.8)", fontSize: 16 }}>Film a clip. Get coached. Earn XP.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => open("signup")}>
          Sign up
        </button>
        <button className="btn btn-dark btn-lg" onClick={() => open("login")}>
          Sign in
        </button>
      </div>

      {sheet && (
        <>
          <div className={`scrim${closing ? " closing" : ""}`} onClick={close} />
          <form
            className={`sheet${closing ? " closing" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grabber" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)", letterSpacing: "-.02em" }}>{su ? "Create your account" : "Welcome back"}</div>
              <button type="button" className="icon-btn light" onClick={close} aria-label="Close">
                <Icon n="x" />
              </button>
            </div>
            {su && (
              <>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, animation: "aiFade .3s ease-out both" }}>
                  <div className="avatar" style={{ width: 48, height: 48 }}>
                    <Logo size={30} />
                  </div>
                  <div style={{ flex: 1, background: "var(--app)", borderRadius: 16, padding: "10px 14px", fontSize: 14, color: "var(--ink-700)", lineHeight: 1.4, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
                    <span>Quick signup, then I&apos;ll ask how you play.</span>
                    <span className="pill" style={{ background: "var(--orange)", color: "var(--navy)", fontSize: 14, boxShadow: "0 3px 0 #c76600", animation: "aiPop .45s .15s ease-out both" }}>
                      <Icon n="star" size={20} />
                      +10 XP for joining
                    </span>
                  </div>
                </div>
                <label className="label" htmlFor="name">
                  First name
                </label>
                <input id="name" className="input" placeholder="Your first name" autoComplete="given-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ marginBottom: 6 }} />
              </>
            )}
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" className="input" type="email" placeholder="you@example.com" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={{ marginBottom: 6 }} />
            <label className="label" htmlFor="pass">
              Password
            </label>
            <input
              id="pass"
              className="input"
              type="password"
              placeholder="At least 8 characters"
              autoComplete={su ? "new-password" : "current-password"}
              value={f.pass}
              onChange={(e) => setF({ ...f, pass: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            {err && (
              <div className="error-box" style={{ margin: "-4px 0 4px" }} role="alert">
                <Icon n="info" />
                <span>{err}</span>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
              {busy ? "One moment…" : su ? "Create account" : "Sign in"}
            </button>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10, fontSize: 15, color: "var(--ink-700)" }}>
              {su ? "Have an account?" : "New here?"}
              <button type="button" className="link ink" style={{ padding: 0, fontSize: 15, color: "var(--ink-700)" }} onClick={() => open(su ? "login" : "signup")}>
                {su ? "Sign in" : "Create an account"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
