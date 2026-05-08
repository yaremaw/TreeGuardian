"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Event } from "@/app/lib/types";

const CARPATHIANS_CENTER: [number, number] = [24.5, 48.5];

export default function Map({
  events,
  onSelect,
  selectedId,
}: {
  events: Event[];
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center: CARPATHIANS_CENTER,
      zoom: 7,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      for (const ev of events) {
        const el = document.createElement("div");
        el.className = "tg-marker";
        el.dataset.eventId = ev.id;

        const hasLoss = ev.area_loss_ha > 0.5;
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.cursor = "pointer";
        el.style.background = hasLoss ? "#ef4444" : "#f59e0b";
        el.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.15)";

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect?.(ev.id);
        });

        new maplibregl.Marker({ element: el })
          .setLngLat(ev.center)
          .setPopup(
            new maplibregl.Popup({ offset: 20 }).setHTML(
              `<strong>${ev.name}</strong><br/>втрата: ${ev.area_loss_ha} га`
            )
          )
          .addTo(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [events, onSelect]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const ev = events.find((e) => e.id === selectedId);
    if (ev)
      mapRef.current.flyTo({ center: ev.center, zoom: 13, duration: 900 });
  }, [selectedId, events]);

  return <div ref={containerRef} className="h-full w-full" />;
}
