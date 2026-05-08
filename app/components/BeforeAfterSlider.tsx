"use client";

import { useRef, useState } from "react";

export default function BeforeAfterSlider({
  before,
  after,
  mask,
}: {
  before: string;
  after: string;
  mask?: string;
}) {
  const [pos, setPos] = useState(50);
  const [showMask, setShowMask] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);

  const onMove = (clientX: number) => {
    if (!wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  };

  return (
    <div className="space-y-3">
      <div
        ref={wrap}
        className="relative w-full aspect-square overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 select-none"
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onClick={(e) => onMove(e.clientX)}
      >
        {/* after as base */}
        <img
          src={after}
          alt="після"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* before clipped to left of slider */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <img
            src={before}
            alt="до"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: `${(100 / pos) * 100}%`, maxWidth: "none" }}
            draggable={false}
          />
        </div>
        {/* NDVI mask overlay */}
        {mask && showMask && (
          <img
            src={mask}
            alt="NDVI loss mask"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        )}
        {/* slider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border-2 border-zinc-800 flex items-center justify-center text-zinc-900 text-xs font-semibold">
            ⇆
          </div>
        </div>
        {/* labels */}
        <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
          ДО
        </div>
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
          ПІСЛЯ
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={showMask}
            onChange={(e) => setShowMask(e.target.checked)}
          />
          NDVI-маска втрат (червоним)
        </label>
        <span className="text-xs text-zinc-500">
          Перетягуй або клацай по зображенню
        </span>
      </div>
    </div>
  );
}
