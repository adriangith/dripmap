"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface BottomSheetProps {
  children: React.ReactNode;
}

const SNAP_PEEK = 140;     // collapsed: shows drag handle + a bit of content
const SNAP_HALF = 0.5;     // fraction of viewport
const SNAP_FULL = 0.9;     // fraction of viewport

export default function BottomSheet({ children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const snapToNearest = useCallback((height: number) => {
    const vh = window.innerHeight;
    const peekDist = Math.abs(height - SNAP_PEEK);
    const halfDist = Math.abs(height - vh * SNAP_HALF);
    const fullDist = Math.abs(height - vh * SNAP_FULL);
    const minDist = Math.min(peekDist, halfDist, fullDist);

    if (minDist === peekDist) return SNAP_PEEK;
    if (minDist === halfDist) return vh * SNAP_HALF;
    return vh * SNAP_FULL;
  }, []);

  const handleDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      dragStartY.current = clientY;
      dragStartHeight.current = sheetHeight;
    },
    [sheetHeight]
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
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
    setSheetHeight((h) => snapToNearest(h));
  }, [snapToNearest]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientY);
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove, { passive: true });
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-2px_16px_rgba(0,0,0,0.12)] z-40 flex flex-col lg:hidden"
      style={{
        height: sheetHeight,
        transition: isDragging ? "none" : "height 0.3s ease-out",
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing shrink-0"
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
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
