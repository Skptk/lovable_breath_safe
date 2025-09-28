import React, { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS = [
  "rgba(45, 212, 191, 0.35)",
  "rgba(56, 189, 248, 0.3)",
  "rgba(147, 112, 219, 0.28)",
];

const prefersReducedMotion = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
};

interface InteractiveSmokeOverlayProps {
  /**
   * Adjusts the strength of the distortion effect (0-1).
   */
  intensity?: number;
  /**
   * Override the default gradient colors.
   */
  colors?: string[];
  className?: string;
}

const InteractiveSmokeOverlay: React.FC<InteractiveSmokeOverlayProps> = ({
  intensity = 0.85,
  colors,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });
  const motionDisabled = useMemo(prefersReducedMotion, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined" || motionDisabled) {
      return undefined;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return undefined;
    }

    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    const applyPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current.targetX = (event.clientX - rect.left) * dpr;
      pointerRef.current.targetY = (event.clientY - rect.top) * dpr;
    };

    const resetPointer = () => {
      pointerRef.current.targetX = width / 2;
      pointerRef.current.targetY = height / 2;
    };

    const handlePointerMove = (event: PointerEvent) => {
      applyPointer(event);
    };

    const handlePointerLeave = () => {
      resetPointer();
    };

    const resizeCanvas = () => {
      const bounds = canvas.parentElement?.getBoundingClientRect();
      width = Math.floor((bounds?.width ?? window.innerWidth) * dpr);
      height = Math.floor((bounds?.height ?? window.innerHeight) * dpr);
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${Math.floor(width / dpr)}px`;
      canvas.style.height = `${Math.floor(height / dpr)}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(dpr, dpr);
      resetPointer();
    };

    resizeCanvas();

    const colorStops = (colors && colors.length > 0 ? colors : DEFAULT_COLORS).map(
      (color, index) => ({
        color,
        offset: Math.min(1, Math.max(0, 0.25 + index * 0.25)),
      })
    );

    const draw = (timestamp: number) => {
      const ctx = context;
      const time = timestamp * 0.001;
      const eased = pointerRef.current;

      eased.x += (eased.targetX - eased.x) * 0.08;
      eased.y += (eased.targetY - eased.y) * 0.08;

      const scaledWidth = width / dpr;
      const scaledHeight = height / dpr;

      ctx.clearRect(0, 0, scaledWidth, scaledHeight);

      const baseGradient = ctx.createLinearGradient(0, 0, scaledWidth, scaledHeight);
      baseGradient.addColorStop(0, "rgba(15, 23, 42, 0.58)");
      baseGradient.addColorStop(1, "rgba(2, 6, 23, 0.74)");
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);

      ctx.globalCompositeOperation = "lighter";
      ctx.filter = "blur(60px)";

      const layers = 5;
      for (let i = 0; i < layers; i += 1) {
        const phase = time * (0.18 + i * 0.05);
        const angle = phase + i * 1.3;
        const wobble = Math.sin(phase * 1.8 + i) * 120 * intensity;
        const spread = 260 + Math.cos(phase + i * 0.75) * 120 * intensity;

        const centerX = eased.x / dpr + Math.cos(angle) * (140 + wobble);
        const centerY = eased.y / dpr + Math.sin(angle * 1.1) * (120 + wobble);

        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          spread * 0.2,
          centerX,
          centerY,
          spread
        );

        colorStops.forEach(({ color, offset }, idx) => {
          const opacityFalloff = Math.max(0.05, 0.3 - idx * 0.06);
          const alpha = Math.max(0, intensity * opacityFalloff);
          const rgba = color.replace(/rgba?\(([^)]+)\)/, (_, inner) => {
            const parts = inner.split(/\s*,\s*/).map(Number);
            if (parts.length === 4) {
              parts[3] = Math.min(1, Math.max(0, alpha));
              return `rgba(${parts.join(",")})`;
            }
            if (parts.length === 3) {
              return `rgba(${parts.join(",")}, ${alpha})`;
            }
            return color;
          });
          gradient.addColorStop(offset, rgba);
        });

        gradient.addColorStop(1, "rgba(15, 23, 42, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.rect(0, 0, scaledWidth, scaledHeight);
        ctx.fill();
      }

      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-over";

      animationFrameRef.current = window.requestAnimationFrame(draw);
    };

    animationFrameRef.current = window.requestAnimationFrame(draw);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", resizeCanvas);

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [colors, intensity, motionDisabled]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 mix-blend-screen opacity-90",
        className
      )}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(30,64,175,0.14),transparent_60%)] opacity-70" />
    </div>
  );
};

export default InteractiveSmokeOverlay;
