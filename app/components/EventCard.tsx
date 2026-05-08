import Link from "next/link";
import type { Event } from "@/app/lib/types";

export default function EventCard({
  event,
  active,
  onHover,
}: {
  event: Event;
  active?: boolean;
  onHover?: (id: string) => void;
}) {
  const hasLoss = event.area_loss_ha > 0.5;
  const badgeText = hasLoss
    ? `${event.area_loss_ha} га втрат`
    : "змін мало";
  return (
    <Link
      href={`/events/${event.id}`}
      onMouseEnter={() => onHover?.(event.id)}
      className={`block rounded-lg border p-4 transition ${
        active
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {event.name}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {event.region} • {event.date_before} → {event.date_after}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-1 rounded ${
            hasLoss
              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {badgeText}
        </span>
      </div>
      {event.confidence > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">впевненість</span>
          <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.round(event.confidence * 100)}%` }}
            />
          </div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {Math.round(event.confidence * 100)}%
          </span>
        </div>
      )}
    </Link>
  );
}
