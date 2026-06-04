import React, { useEffect, useRef, useState } from "react";

export interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
}

export function AnimatedNumber({ value, durationMs = 500 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) return;

    if (typeof requestAnimationFrame !== "function" || typeof performance === "undefined") {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setDisplay(Math.round(from + (to - from) * eased));
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return <>{display}</>;
}
