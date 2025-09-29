import React, { memo, useMemo } from 'react';

type ParticleDirection = 'left' | 'right';

interface SmokeParticle {
  size: number;
  x: number;
  y: number;
  direction: ParticleDirection;
  duration: number;
  delay: number;
  opacity: number;
}

const PARTICLE_COUNT = 25;
const MIN_SIZE = 60;
const MAX_SIZE = 180;
const MIN_X = -20;
const MAX_X = 120;
const MIN_Y = -10;
const MAX_Y = 110;
const MIN_DURATION = 20;
const MAX_DURATION = 45;
const MIN_DELAY = 0;
const MAX_DELAY = 20;
const MIN_OPACITY = 0.15;
const MAX_OPACITY = 0.35;

const KEYFRAME_STYLES = `
@keyframes smoke-drift-right {
  0% {
    transform: translate3d(-100px, 0, 0) rotate(0deg) scale(1);
  }
  100% {
    transform: translate3d(calc(100vw + 100px), -30px, 0) rotate(180deg) scale(1.2);
  }
}

@keyframes smoke-drift-left {
  0% {
    transform: translate3d(calc(100vw + 100px), 0, 0) rotate(0deg) scale(1);
  }
  100% {
    transform: translate3d(-100px, 30px, 0) rotate(-180deg) scale(0.9);
  }
}`;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const generateParticles = (): SmokeParticle[] => {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const direction: ParticleDirection = Math.random() < 0.5 ? 'right' : 'left';

    return {
      size: randomBetween(MIN_SIZE, MAX_SIZE),
      x: randomBetween(MIN_X, MAX_X),
      y: randomBetween(MIN_Y, MAX_Y),
      direction,
      duration: randomBetween(MIN_DURATION, MAX_DURATION),
      delay: randomBetween(MIN_DELAY, MAX_DELAY),
      opacity: randomBetween(MIN_OPACITY, MAX_OPACITY)
    };
  });
};

const SmokeEffectComponent: React.FC = () => {
  const hasWindow = typeof window !== 'undefined';

  const particles = useMemo(() => generateParticles(), []);
  const keyframeStyles = useMemo(() => KEYFRAME_STYLES, []);

  if (!hasWindow) {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: keyframeStyles }} />
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        {particles.map((particle, index) => {
          const highlightOpacity = clamp(particle.opacity * 2, particle.opacity, 0.7);
          const animationName = particle.direction === 'right' ? 'smoke-drift-right' : 'smoke-drift-left';

          return (
            <div
              key={`particle-${index}`}
              className="absolute rounded-full"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                opacity: particle.opacity,
                background: `radial-gradient(circle, rgba(255,255,255,${highlightOpacity.toFixed(3)}) 0%, transparent 70%)`,
                filter: 'blur(2px)',
                willChange: 'transform',
                transform: 'translate3d(0, 0, 0)',
                animation: `${animationName} ${particle.duration}s linear infinite`,
                animationDelay: `${particle.delay}s`
              }}
            />
          );
        })}
      </div>
    </>
  );
};

export default memo(SmokeEffectComponent);
