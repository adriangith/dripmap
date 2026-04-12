"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export const SNAP_PEEK = 96;
export const SNAP_HALF = 0.5;
export const SNAP_FULL = 0.92;

// Damped harmonic oscillator spring animation
function springAnimate(
  from: number,
  to: number,
  callback: (value: number) => void,
  onDone?: () => void,
) {
  const stiffness = 300;
  const damping = 25;
  const mass = 1;
  const dt = 1 / 60;

  let position = from;
  let velocity = 0;
  let rafId: number;

  function step() {
    const displacement = position - to;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;

    callback(position);

    if (Math.abs(position - to) < 0.5 && Math.abs(velocity) < 0.5) {
      callback(to);
      onDone?.();
      return;
    }

    rafId = requestAnimationFrame(step);
  }

  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

interface BottomSheetProps {
  children: React.ReactNode;
  /** Content rendered above the scrollable area — not clipped by overflow */
  header?: React.ReactNode;
  snapTo?: number | null;
  onHeightChange?: (height: number) => void;
  /** Fires only when crossing the expanded/collapsed threshold */
  onExpandedChange?: (expanded: boolean) => void;
}

export default function BottomSheet({ children, header, snapTo, onHeightChange, onExpandedChange }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  // React state only used for content-visibility threshold — NOT updated per pixel
  const [, setIsExpanded] = useState(false);
  const heightRef = useRef(SNAP_PEEK);
  const draggingRef = useRef(false);
  const animatingRef = useRef(false);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const cancelSpring = useRef<(() => void) | null>(null);

  // Velocity tracking
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const velocityRef = useRef(0);

  // Write height directly to the DOM — no React re-render
  const applyHeight = useCallback((h: number) => {
    heightRef.current = h;
    if (sheetRef.current) sheetRef.current.style.height = `${h}px`;
    document.documentElement.style.setProperty("--sheet-height", `${h}px`);
    // Only toggle React state when crossing the visibility threshold
    const expanded = h > SNAP_PEEK + 20;
    setIsExpanded(prev => {
      if (prev !== expanded) {
        onExpandedChange?.(expanded);
        return expanded;
      }
      return prev;
    });
  }, [onExpandedChange]);

  // Set initial value
  useEffect(() => {
    applyHeight(SNAP_PEEK);
  }, [applyHeight]);

  const getSnaps = useCallback(() => {
    const vh = window.innerHeight;
    return [SNAP_PEEK, vh * SNAP_HALF, vh * SNAP_FULL];
  }, []);

  const snapToNearest = useCallback((height: number, velocity: number) => {
    const snaps = getSnaps();

    // Velocity threshold: 0.5px/ms — fast flicks snap to the next point
    if (Math.abs(velocity) > 0.5) {
      if (velocity < 0) {
        // Swiping up — next higher snap
        for (const snap of snaps) {
          if (snap > height + 10) return snap;
        }
        return snaps[snaps.length - 1];
      } else {
        // Swiping down — next lower snap
        for (let i = snaps.length - 1; i >= 0; i--) {
          if (snaps[i] < height - 10) return snaps[i];
        }
        return snaps[0];
      }
    }

    // Slow drag: bias toward the drag direction so the user only needs to
    // move ~30% of the gap (instead of 50%) to commit to the next snap.
    const dragDelta = height - dragStartHeight.current;
    const bias = dragDelta !== 0 ? 0.3 : 0.5;

    let best = snaps[0];
    let bestScore = Infinity;
    for (const snap of snaps) {
      const dist = snap - height;
      // Weight: if dist sign matches drag direction, use lower threshold
      const sameDirection =
        (dragDelta > 0 && dist > 0) || (dragDelta < 0 && dist < 0);
      const weight = sameDirection ? bias : 1 - bias;
      const score = Math.abs(dist) * weight;
      if (score < bestScore) {
        bestScore = score;
        best = snap;
      }
    }
    return best;
  }, [getSnaps]);

  // Programmatic snap via prop
  useEffect(() => {
    if (snapTo == null || draggingRef.current) return;
    cancelSpring.current?.();
    animatingRef.current = true;
    cancelSpring.current = springAnimate(
      heightRef.current,
      snapTo,
      (v) => {
        applyHeight(v);
        onHeightChange?.(v);
      },
      () => { animatingRef.current = false; },
    );
  // Only trigger when snapTo changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapTo]);

  const handleDragStart = useCallback(
    (clientY: number) => {
      cancelSpring.current?.();
      cancelSpring.current = null;
      animatingRef.current = false;

      draggingRef.current = true;
      dragStartY.current = clientY;
      dragStartHeight.current = heightRef.current;
      lastTouchY.current = clientY;
      lastTouchTime.current = Date.now();
      velocityRef.current = 0;
    },
    []
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!draggingRef.current) return;

      const now = Date.now();
      const dt = now - lastTouchTime.current;
      if (dt > 0) {
        velocityRef.current = (clientY - lastTouchY.current) / dt;
      }
      lastTouchY.current = clientY;
      lastTouchTime.current = now;

      const delta = dragStartY.current - clientY;
      const newHeight = Math.max(
        SNAP_PEEK,
        Math.min(window.innerHeight * SNAP_FULL, dragStartHeight.current + delta)
      );
      applyHeight(newHeight);
      onHeightChange?.(newHeight);
    },
    [onHeightChange, applyHeight]
  );

  const handleDragEnd = useCallback(() => {
    draggingRef.current = false;
    const target = snapToNearest(heightRef.current, velocityRef.current);
    animatingRef.current = true;
    cancelSpring.current = springAnimate(
      heightRef.current,
      target,
      (v) => {
        applyHeight(v);
        onHeightChange?.(v);
      },
      () => { animatingRef.current = false; },
    );
  }, [snapToNearest, onHeightChange, applyHeight]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => { if (draggingRef.current) handleDragEnd(); };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => { if (draggingRef.current) handleDragEnd(); };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  useEffect(() => {
    return () => cancelSpring.current?.();
  }, []);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-2px_16px_rgba(0,0,0,0.12)] z-40 flex flex-col lg:hidden"
      style={{ height: SNAP_PEEK }}
    >
      {/* Drag handle — enlarged 48px hit target */}
      <div
        className="flex items-center justify-center h-12 cursor-grab active:cursor-grabbing shrink-0"
        style={{ touchAction: "none" }}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onTouchStart={(e) => {
          e.preventDefault();
          handleDragStart(e.touches[0].clientY);
        }}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Header — outside scroll, popovers can overflow visibly */}
      {header && (
        <div className="shrink-0 relative z-10 overflow-visible">
          {header}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
