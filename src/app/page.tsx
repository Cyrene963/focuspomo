import ClientApp from "@/components/ClientApp";

export default function Page() {
  return (
    <main
      id="focuspomo-root-shell"
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#F5F0EB",
        color: "#2D2625",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          background: "#FFFFFF",
          boxShadow: "0 18px 45px rgba(45,38,37,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/icon-1779372627-apple.png"
          alt=""
          width={56}
          height={56}
          style={{ width: 56, height: 56, display: "block" }}
        />
      </div>
      <ClientApp />
    </main>
  );
}
