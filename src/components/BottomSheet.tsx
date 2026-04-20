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
  /** Color for scooped corner backgrounds */
  scoopColor?: string;
}

export default function BottomSheet({ children, header, snapTo, onHeightChange, onExpandedChange, scoopColor = 'rgba(255,255,255,0.9)' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // React state only used for content-visibility threshold — NOT updated per pixel
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  // Pull-to-collapse: track when a scroll-area touch should become a panel drag
  const scrollTouchStartY = useRef(0);
  const scrollDragActive = useRef(false);

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

  // Show shadow/corners when filter bar area has scrolled out of view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      // Show once scrolled past the first child (filter bar area)
      const firstChild = el.firstElementChild as HTMLElement | null;
      const threshold = firstChild?.offsetHeight ?? 0;
      setScrolled(el.scrollTop >= threshold);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

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
      dragDistanceRef.current = 0;
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

      dragDistanceRef.current += Math.abs(clientY - dragStartY.current);

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

  const dragDistanceRef = useRef(0);

  const animateToSnap = useCallback((target: number) => {
    cancelSpring.current?.();
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
  }, [applyHeight, onHeightChange]);

  const handleDragEnd = useCallback(() => {
    draggingRef.current = false;
    const target = snapToNearest(heightRef.current, velocityRef.current);
    animateToSnap(target);
  }, [snapToNearest, animateToSnap]);

  // Tap on handle cycles: bottom → middle → top → bottom
  const handleHandleTap = useCallback(() => {
    const snaps = getSnaps();
    const h = heightRef.current;
    // Find current snap (closest)
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < snaps.length; i++) {
      const d = Math.abs(snaps[i] - h);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }
    // Cycle: bottom(0) → middle(1) → top(2) → bottom(0)
    const nextIdx = (closestIdx + 1) % snaps.length;
    animateToSnap(snaps[nextIdx]);
  }, [getSnaps, animateToSnap]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        if (dragDistanceRef.current < 5) { handleHandleTap(); } else { handleDragEnd(); }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        if (dragDistanceRef.current < 5) { handleHandleTap(); } else { handleDragEnd(); }
      }
    };

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
  }, [handleDragMove, handleDragEnd, handleHandleTap]);

  // Pull-to-collapse: when scrolled to top and pulling down, drag the panel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      scrollTouchStartY.current = e.touches[0].clientY;
      scrollDragActive.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const clientY = e.touches[0].clientY;
      const pullingDown = clientY > scrollTouchStartY.current;

      // If already dragging the panel, continue
      if (scrollDragActive.current) {
        e.preventDefault();
        handleDragMove(clientY);
        return;
      }

      // Transition to panel drag if at scroll top and pulling down
      if (pullingDown && el.scrollTop <= 0) {
        scrollDragActive.current = true;
        e.preventDefault();
        handleDragStart(clientY);
        return;
      }
    };

    const onTouchEnd = () => {
      if (scrollDragActive.current) {
        scrollDragActive.current = false;
        draggingRef.current = false;
        if (dragDistanceRef.current < 5) {
          handleHandleTap();
        } else {
          handleDragEnd();
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd, handleHandleTap]);

  useEffect(() => {
    return () => cancelSpring.current?.();
  }, []);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-2 left-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] border border-white/50 dark:border-gray-700/50 z-40 flex flex-col lg:hidden"
      style={{ height: SNAP_PEEK }}
    >
      {/* Drag handle — enlarged 48px hit target */}
      <div
        className="flex items-center justify-center h-5 cursor-grab active:cursor-grabbing shrink-0"
        style={{ touchAction: "none" }}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onTouchStart={(e) => {
          e.preventDefault();
          handleDragStart(e.touches[0].clientY);
        }}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Header — outside scroll, popovers can overflow visibly */}
      {header && (
        <div
          className={`shrink-0 relative z-10 overflow-visible transition-shadow duration-200 ${scrolled ? 'shadow-[0_4px_12px_rgba(0,0,0,0.12)]' : ''}`}
          style={{ touchAction: "none" }}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onMouseDown={(e) => handleDragStart(e.clientY)}
        >
          {header}
          {/* Scooped/inverted corners — visible only when scrolled */}
          {scrolled && (
            <>
              <div className="absolute top-full left-0 w-5 h-5 pointer-events-none z-50" style={{ background: `radial-gradient(circle at 100% 100%, transparent 20px, ${scoopColor} 20.5px)`, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }} />
              <div className="absolute top-full right-0 w-5 h-5 pointer-events-none z-50" style={{ background: `radial-gradient(circle at 0 100%, transparent 20px, ${scoopColor} 20.5px)`, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }} />
            </>
          )}
        </div>
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto overscroll-contain rounded-b-3xl ${isExpanded ? 'shadow-[inset_0_-6px_12px_rgba(0,0,0,0.08)]' : ''}`}>
        {children}
      </div>
    </div>
  );
}
