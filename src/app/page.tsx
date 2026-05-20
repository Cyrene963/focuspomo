"use client";
import dynamic from "next/dynamic";
const AppShell = dynamic(() => import("@/components/AppShell"), {
  ssr: false,
  loading: () => (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#FFF8F0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#E8644E", opacity: 0.6 }} />
    </div>
  ),
});
export default function Page() {
  return <AppShell />;
}
