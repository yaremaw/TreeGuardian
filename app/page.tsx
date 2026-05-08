"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import EventCard from "./components/EventCard";
import type { EventsFile } from "./lib/types";

const Map = dynamic(() => import("./components/Map"), { ssr: false });

export default function Home() {
  const [data, setData] = useState<EventsFile | null>(null);
  const [hovered, setHovered] = useState<string | undefined>();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch("/data/events.json")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            🌲 ДеревоВартовий
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            Моніторинг рубок лісу в Карпатах за супутниковими знімками Sentinel-2
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
            ⚠ Демо-датасет з прикладними координатами — не юридичне підтвердження рубок
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="text-xs px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            {showHelp ? "✕ Сховати" : "ℹ Як це читати"}
          </button>
          {data && (
            <div className="text-xs text-zinc-500">
              подій:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {data.count}
              </span>
              {" · "}
              оновлено: {new Date(data.generated_at).toLocaleDateString("uk-UA")}
            </div>
          )}
        </div>
      </header>

      {showHelp && <HelpBanner onClose={() => setShowHelp(false)} />}

      <div className="flex flex-1 min-h-0">
        <aside className="w-96 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-3">
          {!data && (
            <p className="text-sm text-zinc-500">Завантаження подій…</p>
          )}
          {data?.events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              active={hovered === ev.id}
              onHover={setHovered}
            />
          ))}
        </aside>
        <main className="flex-1 relative">
          {data && (
            <Map
              events={data.events}
              selectedId={hovered}
              onSelect={setHovered}
            />
          )}
          <MapLegend />
        </main>
      </div>
    </div>
  );
}

function HelpBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900 px-6 py-4">
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
            🛰 Що це
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Європейський супутник <strong>Sentinel-2</strong> кожні ~5 днів
            фотографує Землю. Ми беремо два знімки тієї ж ділянки лісу — один
            до, інший після — і автоматично знаходимо різницю.
          </p>
        </div>
        <div>
          <div className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
            📐 Як вимірюємо втрату
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <strong>NDVI</strong> — це індекс «зеленості» від −1 до 1: ліс має{" "}
            ~0.8, вирубка/ґрунт — ~0.2. Якщо NDVI впав більше ніж на{" "}
            <code>0.2</code>, вважаємо, що рослинність зникла.
          </p>
        </div>
        <div>
          <div className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
            🔴 Що означають кольори
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 align-middle mr-1.5" />
            червоний маркер — є втрата лісу{" "}
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 align-middle ml-2 mr-1.5" />
            бурштиновий — змін майже нема. На детальній сторінці червона маска
            показує конкретні пікселі вирубки.
          </p>
        </div>
      </div>
      <div className="text-right mt-2">
        <button
          onClick={onClose}
          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          Зрозуміло, сховати
        </button>
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 text-xs space-y-1.5">
      <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Легенда
      </div>
      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
        <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
        втрата &gt; 0.5 га
      </div>
      <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
        <span className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow" />
        змін мало / шум
      </div>
    </div>
  );
}
