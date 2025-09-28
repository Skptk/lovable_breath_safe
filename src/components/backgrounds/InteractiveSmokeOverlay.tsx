import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const optimizedParticle: CSSProperties = {
  willChange: "transform",
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden",
};

type ParticleConfig = {
  size: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
  blur: number;
  opacity: number;
  color: string;
  animationClass: string;
};

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || typeof matchMedia === "undefined") {
    return false;
  }

  return matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const createParticleConfig = (seed: number, opts: {
  minSize: number;
  maxSize: number;
  minDuration: number;
  maxDuration: number;
  color: string;
  blur: number;
  minOpacity: number;
  maxOpacity: number;
  animationClass: string;
}): ParticleConfig => {
  const size = opts.minSize + pseudoRandom(seed * 1.7) * (opts.maxSize - opts.minSize);
  const duration = opts.minDuration + pseudoRandom(seed * 3.1) * (opts.maxDuration - opts.minDuration);

  return {
    size,
    left: pseudoRandom(seed * 5.1) * 100,
    top: pseudoRandom(seed * 7.3) * 100,
    delay: pseudoRandom(seed * 11.9) * duration,
    duration,
    blur: opts.blur,
    opacity: opts.minOpacity + pseudoRandom(seed * 13.7) * (opts.maxOpacity - opts.minOpacity),
    color: opts.color,
    animationClass: opts.animationClass,
  };
};

const FAST_PARTICLE_OPTIONS = {
  minSize: 30,
  maxSize: 110,
  minDuration: 20,
  maxDuration: 35,
  color: "rgba(255, 255, 255, 0.08)",
  blur: 1,
  minOpacity: 0.4,
  maxOpacity: 0.7,
  animationClass: "animate-float",
} as const;

const SLOW_PARTICLE_OPTIONS = {
  minSize: 100,
  maxSize: 300,
  minDuration: 30,
  maxDuration: 50,
  color: "rgba(45, 212, 191, 0.12)",
  blur: 3,
  minOpacity: 0.2,
  maxOpacity: 0.45,
  animationClass: "animate-float-slow",
} as const;

const getAdaptiveCounts = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { fast: 25, slow: 15 };
  }

  const isMobile = window.innerWidth < 768;
  const hardwareThreads = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 8;
  const isLowEnd = hardwareThreads < 4;

  if (isMobile || isLowEnd) {
    return { fast: 10, slow: 6 };
  }

  return { fast: 25, slow: 15 };
};

interface InteractiveSmokeOverlayProps {
  intensity?: number;
  className?: string;
  highVisibility?: boolean;
}

const InteractiveSmokeOverlay: React.FC<InteractiveSmokeOverlayProps> = ({
  intensity = 0.8,
  className,
  highVisibility = false,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const [counts, setCounts] = useState(() => getAdaptiveCounts());
  const [prefersReduced, setPrefersReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReduced(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateCounts = () => setCounts(getAdaptiveCounts());
    updateCounts();
    window.addEventListener("resize", updateCounts);

    return () => {
      window.removeEventListener("resize", updateCounts);
    };
  }, []);

  const fastParticles = useMemo(() => {
    return Array.from({ length: counts.fast }, (_, index) =>
      createParticleConfig(index + 1, FAST_PARTICLE_OPTIONS)
    );
  }, [counts.fast]);

  const slowParticles = useMemo(() => {
    return Array.from({ length: counts.slow }, (_, index) =>
      createParticleConfig(index + 101, SLOW_PARTICLE_OPTIONS)
    );
  }, [counts.slow]);

  useEffect(() => {
    if (typeof window === "undefined" || prefersReduced) {
      return undefined;
    }

    let animationId: number;
    let currentX = 0;
    let currentY = 0;

    const animate = () => {
      currentX += (pointerTargetRef.current.x - currentX) * 0.08;
      currentY += (pointerTargetRef.current.y - currentY) * 0.08;

      if (overlayRef.current) {
        overlayRef.current.style.setProperty("--smoke-offset-x", `${currentX}px`);
        overlayRef.current.style.setProperty("--smoke-offset-y", `${currentY}px`);
      }

      animationId = window.requestAnimationFrame(animate);
    };

    animationId = window.requestAnimationFrame(animate);

    const handlePointerMove = (event: PointerEvent) => {
      const { innerWidth, innerHeight } = window;
      const normalizedX = (event.clientX / innerWidth - 0.5) * 2;
      const normalizedY = (event.clientY / innerHeight - 0.5) * 2;

      pointerTargetRef.current.x = normalizedX * 30 * intensity;
      pointerTargetRef.current.y = normalizedY * 24 * intensity;
    };

    const resetPointer = () => {
      pointerTargetRef.current.x = 0;
      pointerTargetRef.current.y = 0;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", resetPointer, { passive: true });

    return () => {
      if (animationId) {
        window.cancelAnimationFrame(animationId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", resetPointer);
    };
  }, [intensity, prefersReduced]);

  const overlayOpacity = highVisibility ? 0.8 : 0.58;

  return (
    <div
      ref={overlayRef}
      className={cn("smoke-overlay", className)}
      style={{ opacity: overlayOpacity } as CSSProperties}
      data-reduced-motion={prefersReduced ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="smoke-overlay__layer">
        {fastParticles.map((particle, index) => (
          <div
            key={`fast-${index}`}
            className={cn("smoke-overlay__particle", particle.animationClass)}
            style={{
              ...optimizedParticle,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              filter: `blur(${particle.blur}px)` as string,
              opacity: particle.opacity,
              backgroundColor: particle.color,
            } as CSSProperties}
          />
        ))}
      </div>

      <div className="smoke-overlay__layer">
        {slowParticles.map((particle, index) => (
          <div
            key={`slow-${index}`}
            className={cn("smoke-overlay__particle", particle.animationClass)}
            style={{
              ...optimizedParticle,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              filter: `blur(${particle.blur}px)` as string,
              opacity: particle.opacity,
              backgroundColor: particle.color,
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

export default InteractiveSmokeOverlay;
