"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";

interface RevealProps {
  children: ReactNode;
  /** Delay in milliseconds before the reveal transition starts. */
  delay?: number;
  /** Extra classes applied to the wrapper element. */
  className?: string;
}

/**
 * Scroll-reveal wrapper. Fades and slides its children in (opacity 0 → 1 with a
 * small upward translate) the first time they enter the viewport, using inline
 * style transitions only — no global CSS.
 *
 * Honors `prefers-reduced-motion`: reduced-motion users get fully visible
 * content with no transition. Because the enhanced (hidden) state is only
 * applied after mount, no-JS / SSR output stays visible too.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    // Reduced motion (or unsupported observer): render fully visible, no anim.
    if (reduced || typeof IntersectionObserver === "undefined") {
      setEnhanced(false);
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    setEnhanced(true);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  const style = enhanced
    ? {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: "opacity, transform",
      }
    : undefined;

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
