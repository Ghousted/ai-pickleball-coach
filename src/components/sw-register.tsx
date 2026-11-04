"use client";
import { useEffect } from "react";

/** Registers the service worker so the app can be added to the home screen (no offline mode). */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
