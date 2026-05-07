"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  saved: "Rezept gespeichert",
  created: "Rezept erstellt",
};

export default function SavedToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const flag = sp.get("saved");
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    if (!flag) return;
    const msg = MESSAGES[flag] ?? "Gespeichert";
    setVisible(msg);
    const newSp = new URLSearchParams(sp.toString());
    newSp.delete("saved");
    const qs = newSp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const t = setTimeout(() => setVisible(null), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flag]);

  if (!visible) return null;
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-[fadeIn_0.15s_ease-out]"
      role="status"
    >
      ✓ {visible}
    </div>
  );
}
