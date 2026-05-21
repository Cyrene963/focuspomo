"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

export default function ClientApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) return null;
  return <AppShell />;
}
