/**
 * Custom Cursor - 5 styles (Gradient, Sparkle, Pulse, Blob, Cyberpunk).
 * Brand: #6366f1, #a855f7, #06b6d4. Hides default cursor; respects prefers-reduced-motion.
 */

import React, { useEffect, useRef, useState } from 'react';
import './cursorStyles.css';

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export type CursorType = 'gradient' | 'sparkle' | 'pulse' | 'blob' | 'cyberpunk';

interface CustomCursorProps {
  type?: CursorType;
  /** Set to false to hide custom cursor (e.g. on touch devices) */
  enabled?: boolean;
}

export default function CustomCursor({ type = 'gradient', enabled = true }: CustomCursorProps) {
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);
  const pos = useRef({ x: -100, y: -100 });
  const raf = useRef<number | undefined>(undefined);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const sparkleContainerRef = useRef<HTMLDivElement>(null);
  const lastSparkle = useRef(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    setMounted(typeof document !== 'undefined' && typeof window !== 'undefined');
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (!mounted || !enabled) return;

    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!raf.current) {
        raf.current = requestAnimationFrame(() => {
          if (dotRef.current) {
            dotRef.current.style.left = `${pos.current.x}px`;
            dotRef.current.style.top = `${pos.current.y}px`;
          }
          if (ringRef.current) {
            ringRef.current.style.left = `${pos.current.x}px`;
            ringRef.current.style.top = `${pos.current.y}px`;
          }
          raf.current = 0;
        });
      }

      if (type === 'sparkle' && sparkleContainerRef.current && !reducedMotion.current) {
        const now = Date.now();
        if (now - lastSparkle.current > 40) {
          lastSparkle.current = now;
          const p = document.createElement('div');
          p.className = 'cursor-sparkle-particle';
          p.style.left = `${e.clientX + (Math.random() - 0.5) * 12}px`;
          p.style.top = `${e.clientY + (Math.random() - 0.5) * 12}px`;
          sparkleContainerRef.current.appendChild(p);
          setTimeout(() => p.remove(), 450);
        }
      }
    };

    const handleOver = () => setHover(true);
    const handleOut = () => setHover(false);

    const clickSparkle = (e: MouseEvent) => {
      if (type !== 'sparkle' || !sparkleContainerRef.current || reducedMotion.current) return;
      for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.className = 'cursor-sparkle-particle';
        const angle = (i / 6) * Math.PI * 2 + Math.random();
        const r = 15 + Math.random() * 20;
        const x = e.clientX + Math.cos(angle) * r;
        const y = e.clientY + Math.sin(angle) * r;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.animationDuration = '0.35s';
        sparkleContainerRef.current.appendChild(p);
        setTimeout(() => p.remove(), 400);
      }
    };

    document.body.classList.add('cursor-none');
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('click', clickSparkle);

    document.querySelectorAll(INTERACTIVE_SELECTOR).forEach((el) => {
      el.addEventListener('mouseenter', handleOver);
      el.addEventListener('mouseleave', handleOut);
    });
    const observer = new MutationObserver(() => {
      document.querySelectorAll(INTERACTIVE_SELECTOR).forEach((el) => {
        el.addEventListener('mouseenter', handleOver);
        el.addEventListener('mouseleave', handleOut);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.body.classList.remove('cursor-none');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('click', clickSparkle);
      if (raf.current) cancelAnimationFrame(raf.current);
      document.querySelectorAll(INTERACTIVE_SELECTOR).forEach((el) => {
        el.removeEventListener('mouseenter', handleOver);
        el.removeEventListener('mouseleave', handleOut);
      });
      observer.disconnect();
    };
  }, [mounted, enabled, type]);

  if (!mounted || !enabled) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: pos.current.x,
    top: pos.current.y,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 99999,
  };

  const hoverClass = hover ? ' hover' : '';

  return (
    <>
      {type === 'gradient' && (
        <>
          <div ref={ringRef} className={`cursor-gradient-ring${hoverClass}`} style={style} aria-hidden />
          <div ref={dotRef} className={`cursor-gradient-dot${hoverClass}`} style={style} aria-hidden />
        </>
      )}

      {type === 'sparkle' && (
        <>
          <div ref={sparkleContainerRef} aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99998 }} />
          <div ref={dotRef} className={`cursor-sparkle-dot${hoverClass}`} style={style} aria-hidden />
        </>
      )}

      {type === 'pulse' && (
        <div ref={dotRef} className={`cursor-pulse-dot${hoverClass}`} style={style} aria-hidden />
      )}

      {type === 'blob' && (
        <div ref={dotRef} className={`cursor-blob${hoverClass}`} style={style} aria-hidden />
      )}

      {type === 'cyberpunk' && (
        <>
          <div ref={ringRef} className={`cursor-cyber-ring${hoverClass}`} style={style} aria-hidden />
          <div ref={dotRef} className={`cursor-cyber-dot${hoverClass}`} style={style} aria-hidden />
        </>
      )}
    </>
  );
}
