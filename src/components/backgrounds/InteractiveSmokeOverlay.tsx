import React, { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS = [
  "rgba(45, 212, 191, 0.35)",
  "rgba(56, 189, 248, 0.3)",
  "rgba(147, 112, 219, 0.28)",
];

const SPARKLE_COUNT = 28;

const prefersReducedMotion = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
};

const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

interface InteractiveSmokeOverlayProps {
  /**
   * Adjusts the strength of the parallax response (0-1).
   */
  intensity?: number;
  /**
   * Override the default gradient colors.
   */
  colors?: string[];
  className?: string;
}

const InteractiveSmokeOverlay: React.FC<InteractiveSmokeOverlayProps> = ({
  intensity = 0.75,
  colors,
  className,
}) => {
  const reducedMotion = useMemo(prefersReducedMotion, []);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  const palette = useMemo(() => {
    const source = colors && colors.length > 0 ? colors : DEFAULT_COLORS;
    return [
      source[0] ?? DEFAULT_COLORS[0],
      source[1] ?? DEFAULT_COLORS[1],
      source[2] ?? DEFAULT_COLORS[2],
    ];
  }, [colors]);

  const overlayVariables = useMemo(
    () =>
      ({
        ["--smoke-color-1" as const]: palette[0],
        ["--smoke-color-2" as const]: palette[1],
        ["--smoke-color-3" as const]: palette[2],
      }) as CSSProperties,
    [palette]
  );

  const sparkles = useMemo(() => {
    return Array.from({ length: SPARKLE_COUNT }, (_, index) => {
      const base = index + 1;
      const top = pseudoRandom(base) * 100;
      const left = pseudoRandom(base * 2.7) * 100;
      const size = 2.2 + pseudoRandom(base * 4.1) * 3.2;
      const delay = pseudoRandom(base * 5.3) * 6;
      const duration = 4.5 + pseudoRandom(base * 6.9) * 5.5;
      const drift = 24 + pseudoRandom(base * 7.7) * 42;

      return { top, left, size, delay, duration, drift };
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || reducedMotion) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const { innerWidth, innerHeight } = window;
      pointerRef.current.targetX = (event.clientX / innerWidth - 0.5) * 2;
      pointerRef.current.targetY = (event.clientY / innerHeight - 0.5) * 2;
    };

    const resetPointer = () => {
      pointerRef.current.targetX = 0;
      pointerRef.current.targetY = 0;
    };

    const animate = () => {
      const pointer = pointerRef.current;
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;

      const shiftX = pointer.x * 26 * intensity;
      const shiftY = pointer.y * 20 * intensity;

      if (parallaxRef.current) {
        parallaxRef.current.style.setProperty("--smoke-shift-x", `${shiftX}px`);
        parallaxRef.current.style.setProperty("--smoke-shift-y", `${shiftY}px`);
      }

      animationRef.current = window.requestAnimationFrame(animate);
    };

    animationRef.current = window.requestAnimationFrame(animate);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", resetPointer, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", resetPointer);

      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [intensity, reducedMotion]);

  return (
    <div
      className={cn(
        "atmosphere-overlay pointer-events-none absolute inset-0",
        className
      )}
      aria-hidden="true"
      style={overlayVariables}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <div className="atmosphere-overlay__gradient" />
      <div ref={parallaxRef} className="atmosphere-overlay__parallax">
        <div
          className="smoke-layer smoke-layer--one"
          style={{
            ["--parallax-factor" as const]: "0.18",
          } as CSSProperties}
        />
        <div
          className="smoke-layer smoke-layer--two"
          style={{
            ["--parallax-factor" as const]: "0.35",
          } as CSSProperties}
        />
        <div
          className="smoke-layer smoke-layer--three"
          style={{
            ["--parallax-factor" as const]: "0.55",
          } as CSSProperties}
        />
      </div>
      <div className="sparkle-layer">
        {sparkles.map((sparkle, index) => (
          <span
            key={`sparkle-${index}`}
            className="sparkle"
            style={{
              top: `${sparkle.top}%`,
              left: `${sparkle.left}%`,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              ["--sparkle-delay" as const]: `${sparkle.delay}s`,
              ["--sparkle-duration" as const]: `${sparkle.duration}s`,
              ["--sparkle-drift" as const]: `${sparkle.drift}px`,
            } as CSSProperties}
          />
        ))}
      </div>
      <div className="atmosphere-overlay__veil" />
    </div>
  );
};

export default InteractiveSmokeOverlay;
