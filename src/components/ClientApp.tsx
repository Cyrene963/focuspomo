"use client";

import AppShell from "@/components/AppShell";
import CloudSyncAgent from "@/components/CloudSyncAgent";

export default function ClientApp() {
  return (
    <>
      <CloudSyncAgent />
      <AppShell />
    </>
  );
}
