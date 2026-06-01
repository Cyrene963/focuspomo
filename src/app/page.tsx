import ClientApp from "@/components/ClientApp";

export default function Page() {
  return (
    <main
      id="focuspomo-root-shell"
      style={{
        minHeight: "var(--app-height, 100dvh)",
        width: "100vw",
        background: "#F5F0EB",
        color: "#2D2625",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <section
        id="focuspomo-offline-ssr-shell"
        aria-label="FocusPomo loading shell"
        style={{
          width: "min(420px, calc(100vw - 40px))",
          padding: "30px 24px",
          borderRadius: 32,
          background: "rgba(255,255,255,0.72)",
          boxShadow: "0 24px 80px rgba(45,38,37,0.14)",
          textAlign: "center",
          position: "absolute",
          inset: "50% auto auto 50%",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
        inert
        aria-hidden="true"
      >
        <img
          src="/icon-1779372627-apple.png"
          alt="FocusPomo"
          width={72}
          height={72}
          style={{ width: 72, height: 72, display: "block", margin: "0 auto 16px", borderRadius: 24 }}
        />
        <h1 style={{ margin: "0 0 8px", fontSize: 28, letterSpacing: -0.6 }}>FocusPomo</h1>
        <p style={{ margin: 0, color: "#6B5B57", fontSize: 15, lineHeight: 1.7 }}>
          正在从本地缓存启动。离线时如果完整应用还没加载，这个启动页会保留，而不是白屏。
        </p>
      </section>
      <ClientApp />
    </main>
  );
}
