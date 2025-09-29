import React, { useEffect, useRef } from 'react';

type PointerPosition = {
  x: number;
  y: number;
};

type ParticleColor = (typeof COLORS)[number];

interface Particle {
  id: string;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  color: ParticleColor;
  element: HTMLDivElement | null;
  driftAngle: number;
  driftSpeed: number;
  twinkleTimer: number;
  twinkleSpeed: number;
  glowStrength: number;
  styleElapsed: number;
}

const PARTICLE_COUNT = 80;
const MOBILE_PARTICLE_COUNT = 18;
const MAX_INTERACTION_DISTANCE = 150;
const REPULSION_MULTIPLIER = 3;
const SPRING_STRENGTH = 0.018;
const DAMPING = 0.9;
const DRIFT_FORCE = 0.024;
const STYLE_UPDATE_INTERVAL_MS = 120;
const RESIZE_DEBOUNCE_MS = 220;
const COLORS = [
  'rgba(255, 255, 255, 0.6)',
  'rgba(220, 220, 220, 0.5)',
  'rgba(180, 180, 180, 0.4)'
] as const;

const hasWindow = typeof window !== 'undefined';

const AirParticles: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const pointerRef = useRef<PointerPosition | null>(null);
  const pendingPointerRef = useRef<PointerPosition | null>(null);
  const pointerRafRef = useRef<number | null>(null);
  const viewportRef = useRef<{ width: number; height: number }>({
    width: hasWindow ? window.innerWidth : 0,
    height: hasWindow ? window.innerHeight : 0
  });
  const lastFrameTimeRef = useRef<number>(hasWindow ? performance.now() : 0);
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hasWindow) {
      return undefined;
    }

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let isUnmounted = false;

    const computeParticleCount = () => (viewportRef.current.width < 768 ? MOBILE_PARTICLE_COUNT : PARTICLE_COUNT);

    const clearParticles = () => {
      particlesRef.current.forEach((particle) => {
        if (particle.element && particle.element.parentNode === container) {
          container.removeChild(particle.element);
        }
        particle.element = null;
      });
      particlesRef.current = [];
    };

    const createParticleElement = (particle: Particle) => {
      const element = document.createElement('div');
      element.className = 'absolute pointer-events-none rounded-full will-change-transform';
      element.style.width = `${particle.size}px`;
      element.style.height = `${particle.size}px`;
      element.style.opacity = particle.baseOpacity.toFixed(3);
      element.style.backgroundColor = particle.color;
      element.style.backgroundImage = 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.45) 35%, rgba(255,255,255,0) 75%)';
      element.style.position = 'absolute';
      element.style.left = '0px';
      element.style.top = '0px';
      element.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0)`;
      element.style.mixBlendMode = 'screen';
      element.style.boxShadow = `0 0 ${12 * particle.glowStrength}px rgba(255,255,255,0.55), 0 0 ${24 * particle.glowStrength}px rgba(195,215,255,0.35)`;
      element.style.filter = 'blur(0.3px) saturate(1.2)';
      element.style.transition = 'opacity 0.35s ease';
      element.style.borderRadius = '9999px';
      element.style.pointerEvents = 'none';
      container.appendChild(element);
      particle.element = element;
    };

    const initializeParticles = () => {
      clearParticles();
      const width = window.innerWidth;
      const height = window.innerHeight;
      viewportRef.current.width = width;
      viewportRef.current.height = height;
      const count = computeParticleCount();

      particlesRef.current = Array.from({ length: count }, (_, index) => {
        const size = 4 + Math.random() * 12;
        const baseOpacity = 0.45 + Math.random() * 0.3;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0];
        const baseX = Math.random() * width;
        const baseY = Math.random() * height;
        const particle: Particle = {
          id: `particle-${index}`,
          baseX,
          baseY,
          x: baseX + (Math.random() - 0.5) * 40,
          y: baseY + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size,
          baseOpacity,
          color,
          element: null,
          driftAngle: Math.random() * Math.PI * 2,
          driftSpeed: 0.002 + Math.random() * 0.003,
          twinkleTimer: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.7 + Math.random() * 1.3,
          glowStrength: 0.75 + Math.random() * 0.75,
          styleElapsed: Math.random() * STYLE_UPDATE_INTERVAL_MS
        };

        createParticleElement(particle);
        return particle;
      });
    };

    const schedulePointerUpdate = (point: PointerPosition | null) => {
      pendingPointerRef.current = point;

      if (pointerRafRef.current !== null) {
        return;
      }

      pointerRafRef.current = window.requestAnimationFrame(() => {
        pointerRafRef.current = null;
        pointerRef.current = pendingPointerRef.current;
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      schedulePointerUpdate({ x: event.clientX, y: event.clientY });
    };

    const handleMouseLeave = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        schedulePointerUpdate(null);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        schedulePointerUpdate(null);
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) {
        schedulePointerUpdate(null);
        return;
      }

      schedulePointerUpdate({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchEnd = () => {
      schedulePointerUpdate(null);
    };

    const animationLoop = () => {
      if (!isRunningRef.current) {
        return;
      }

      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      const baseFrame = 1000 / 60;
      const clampedDelta = Math.min(Math.max(delta, 6), 48);
      const timeScale = Math.min(Math.max(clampedDelta / baseFrame, 0.75), 2.2);

      const particles = particlesRef.current;
      const pointer = pointerRef.current;
      const { width, height } = viewportRef.current;
      const maxDistSq = MAX_INTERACTION_DISTANCE * MAX_INTERACTION_DISTANCE;
      const driftForce = DRIFT_FORCE * timeScale;
      const springStrength = SPRING_STRENGTH * timeScale;
      const dampingFactor = Math.pow(DAMPING, timeScale);

      for (const particle of particles) {
        // Gentle drift
        particle.driftAngle += particle.driftSpeed * timeScale;
        particle.vx += Math.cos(particle.driftAngle) * driftForce;
        particle.vy += Math.sin(particle.driftAngle) * driftForce;

        if (pointer) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distanceSq = dx * dx + dy * dy;

          if (distanceSq > 0 && distanceSq < maxDistSq) {
            const distance = Math.sqrt(distanceSq);
            const strength = Math.max(0, (MAX_INTERACTION_DISTANCE - distance) / MAX_INTERACTION_DISTANCE);
            const force = strength * strength * REPULSION_MULTIPLIER * timeScale;
            const angle = Math.atan2(dy, dx);
            particle.vx += Math.cos(angle) * force;
            particle.vy += Math.sin(angle) * force;
          }
        }

        const springX = (particle.baseX - particle.x) * springStrength;
        const springY = (particle.baseY - particle.y) * springStrength;
        particle.vx += springX;
        particle.vy += springY;

        particle.vx *= dampingFactor;
        particle.vy *= dampingFactor;

        particle.x += particle.vx * timeScale;
        particle.y += particle.vy * timeScale;

        const margin = 30;
        if (particle.x < -margin) particle.x = -margin;
        if (particle.x > width + margin) particle.x = width + margin;
        if (particle.y < -margin) particle.y = -margin;
        if (particle.y > height + margin) particle.y = height + margin;

        if (particle.element) {
          particle.element.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0)`;
          particle.styleElapsed += clampedDelta;
          if (particle.styleElapsed >= STYLE_UPDATE_INTERVAL_MS) {
            particle.styleElapsed = 0;
            particle.twinkleTimer += (clampedDelta / 1000) * particle.twinkleSpeed * Math.PI * 2;
            const sparkle = 0.65 + Math.sin(particle.twinkleTimer) * 0.35;
            const opacity = Math.min(1, Math.max(0.2, particle.baseOpacity * sparkle));
            particle.element.style.opacity = opacity.toFixed(3);
            const glow = particle.glowStrength * sparkle;
            particle.element.style.boxShadow = `0 0 ${(12 * glow).toFixed(1)}px rgba(255,255,255,${(0.45 * sparkle).toFixed(3)}), 0 0 ${(26 * glow).toFixed(1)}px rgba(190,220,255,${(0.28 * sparkle).toFixed(3)})`;
          }
        }
      }

      if (!isUnmounted && isRunningRef.current) {
        animationRef.current = window.requestAnimationFrame(animationLoop);
      }
    };

    const startAnimation = () => {
      if (isRunningRef.current) {
        return;
      }
      isRunningRef.current = true;
      lastFrameTimeRef.current = performance.now();
      animationRef.current = window.requestAnimationFrame(animationLoop);
    };

    const stopAnimation = () => {
      if (!isRunningRef.current) {
        return;
      }
      isRunningRef.current = false;
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (pointerRafRef.current !== null) {
        window.cancelAnimationFrame(pointerRafRef.current);
        pointerRafRef.current = null;
      }
      pointerRef.current = null;
      pendingPointerRef.current = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startAnimation();
      } else {
        stopAnimation();
      }
    };

    initializeParticles();
    startAnimation();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    let resizeTimeoutId: number | null = null;

    const handleResize = () => {
      if (resizeTimeoutId !== null) {
        window.clearTimeout(resizeTimeoutId);
      }
      resizeTimeoutId = window.setTimeout(() => {
        resizeTimeoutId = null;
        initializeParticles();
        if (!isRunningRef.current) {
          startAnimation();
        }
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      isUnmounted = true;

      stopAnimation();

      if (pointerRafRef.current !== null) {
        window.cancelAnimationFrame(pointerRafRef.current);
        pointerRafRef.current = null;
      }

      if (resizeTimeoutId !== null) {
        window.clearTimeout(resizeTimeoutId);
        resizeTimeoutId = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('resize', handleResize);

      clearParticles();
    };
  }, []);

  if (!hasWindow) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[0] pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};

export default AirParticles;
