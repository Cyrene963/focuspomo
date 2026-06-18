"use client";

import { useEffect, useState } from "react";
import { APP_SESSION_TOKEN_KEY, clearNativeAuthPending, APP_SCHEME_ORIGIN } from "@/lib/cloudSync";

function buildAppUrl(auth: string, nonce?: string) {
  const url = new URL(`${APP_SCHEME_ORIGIN}auth`);
  url.searchParams.set("auth", auth);
  if (nonce) url.searchParams.set("nonce", nonce);
  return url.toString();
}

export default function NativeAuthPage() {
  const [message, setMessage] = useState("正在完成登录");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth") || "";
    const nonce = params.get("nonce") || "";

    if (!auth) {
      setMessage("登录信息缺失");
      return;
    }

    if (auth.startsWith("token:")) {
      const token = auth.slice("token:".length).split(":")[0] || "";
      if (token) window.localStorage.setItem(APP_SESSION_TOKEN_KEY, token);
      clearNativeAuthPending();
      setMessage("已登录，正在返回 App");
    } else {
      clearNativeAuthPending();
      setMessage("已完成授权");
    }

    const appUrl = buildAppUrl(auth, nonce || undefined);
    window.location.replace(appUrl);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", color: "var(--text)", padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{message}</div>
    </div>
  );
}
