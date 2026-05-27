"use client";

import { useEffect, useState } from "react";

export function usePrintMode(): boolean {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const onBefore = () => setIsPrinting(true);
    const onAfter = () => setIsPrinting(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    const mq = window.matchMedia("print");
    const onChange = (e: MediaQueryListEvent) => setIsPrinting(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  return isPrinting;
}
