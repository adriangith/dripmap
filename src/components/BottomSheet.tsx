"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface BottomSheetProps {
  children: React.ReactNode;
}

const SNAP_PEEK = 140;     // collapsed: shows drag handle + a bit of content
const SNAP_HALF = 0.5;     // fraction of viewport
const SNAP_FULL = 0.9;     // fraction of viewport

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

export default function BottomSheet({ children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const cancelSpring = useRef<(() => void) | null>(null);

  // Velocity tracking
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const velocityRef = useRef(0);

  const getSnapPoints = useCallback(() => {
    const vh = window.innerHeight;
    return [SNAP_PEEK, vh * SNAP_HALF, vh * SNAP_FULL];
  }, []);

  const snapToNearest = useCallback((height: number, velocity: number) => {
    const vh = window.innerHeight;
    const snaps = [SNAP_PEEK, vh * SNAP_HALF, vh * SNAP_FULL];

    // Velocity threshold: 0.5px/ms
    if (Math.abs(velocity) > 0.5) {
      // Upward swipe (negative velocity = finger moving up = sheet grows)
      if (velocity < 0) {
        // Find next snap above current
        for (const snap of snaps) {
          if (snap > height + 10) return snap;
        }
        return snaps[snaps.length - 1];
      } else {
        // Downward swipe - find next snap below current
        for (let i = snaps.length - 1; i >= 0; i--) {
          if (snaps[i] < height - 10) return snaps[i];
        }
        return snaps[0];
      }
    }

    // No velocity - snap to nearest
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
  }, []);

  const handleDragStart = useCallback(
    (clientY: number) => {
      // Cancel any running spring animation
      cancelSpring.current?.();
      cancelSpring.current = null;
      setIsAnimating(false);

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

      // Track velocity (px/ms, positive = downward)
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
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    const target = snapToNearest(sheetHeight, velocityRef.current);
    setIsAnimating(true);
    cancelSpring.current = springAnimate(
      sheetHeight,
      target,
      (v) => setSheetHeight(v),
      () => setIsAnimating(false),
    );
  }, [snapToNearest, sheetHeight]);

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

  // Cleanup spring on unmount
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
