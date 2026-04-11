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
}

export default function BottomSheet({ children, header, snapTo, onHeightChange }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const [isDragging, setIsDragging] = useState(false);
  const animatingRef = useRef(false);

  // Keep CSS custom property in sync so siblings (e.g. locate button) can
  // track the sheet height without a React-state round-trip lag.
  const syncCSSHeight = useCallback((h: number) => {
    document.documentElement.style.setProperty("--sheet-height", `${h}px`);
  }, []);

  // Set initial value
  useEffect(() => {
    syncCSSHeight(SNAP_PEEK);
  }, [syncCSSHeight]);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const cancelSpring = useRef<(() => void) | null>(null);

  // Velocity tracking
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const velocityRef = useRef(0);

  const getSnaps = useCallback(() => {
    const vh = window.innerHeight;
    return [SNAP_PEEK, vh * SNAP_HALF, vh * SNAP_FULL];
  }, []);

  const snapToNearest = useCallback((height: number, velocity: number) => {
    const snaps = getSnaps();

    // Velocity threshold: 0.5px/ms
    if (Math.abs(velocity) > 0.5) {
      if (velocity < 0) {
        for (const snap of snaps) {
          if (snap > height + 10) return snap;
        }
        return snaps[snaps.length - 1];
      } else {
        for (let i = snaps.length - 1; i >= 0; i--) {
          if (snaps[i] < height - 10) return snaps[i];
        }
        return snaps[0];
      }
    }

    let nearest = snaps[0];
    let minDist = Math.abs(height - snaps[0]);
    for (let i = 1; i < snaps.length; i++) {
      const dist = Math.abs(height - snaps[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = snaps[i];
      }
    }
    return nearest;
  }, [getSnaps]);

  // Programmatic snap via prop
  useEffect(() => {
    if (snapTo == null || isDragging) return;
    cancelSpring.current?.();
    animatingRef.current = true;
    cancelSpring.current = springAnimate(
      sheetHeight,
      snapTo,
      (v) => {
        setSheetHeight(v);
        syncCSSHeight(v);
        onHeightChange?.(v);
      },
      () => animatingRef.current = false,
    );
  // Only trigger when snapTo changes, not on every sheetHeight change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapTo]);

  const handleDragStart = useCallback(
    (clientY: number) => {
      cancelSpring.current?.();
      cancelSpring.current = null;
      animatingRef.current = false;

      setIsDragging(true);
      dragStartY.current = clientY;
      dragStartHeight.current = sheetHeight;
      lastTouchY.current = clientY;
      lastTouchTime.current = Date.now();
      velocityRef.current = 0;
    },
    [sheetHeight]
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;

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
      setSheetHeight(newHeight);
      syncCSSHeight(newHeight);
      onHeightChange?.(newHeight);
    },
    [isDragging, onHeightChange, syncCSSHeight]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    const target = snapToNearest(sheetHeight, velocityRef.current);
    animatingRef.current = true;
    cancelSpring.current = springAnimate(
      sheetHeight,
      target,
      (v) => {
        setSheetHeight(v);
        syncCSSHeight(v);
        onHeightChange?.(v);
      },
      () => animatingRef.current = false,
    );
  }, [snapToNearest, sheetHeight, onHeightChange, syncCSSHeight]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();

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
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    return () => cancelSpring.current?.();
  }, []);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-2px_16px_rgba(0,0,0,0.12)] z-40 flex flex-col lg:hidden"
      style={{ height: sheetHeight }}
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
