'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RiskLevel, RiskLevelColor } from '@sentinel/types';

interface MapEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
  riskScore: number;
  riskLevel: RiskLevel;
  category: string;
}

interface WorldMapProps {
  events?: MapEvent[];
}

export function WorldMap({ events = [] }: WorldMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-30, -15],
      zoom: 1.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !events.length) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    events.forEach((event) => {
      const color = RiskLevelColor[event.riskLevel as RiskLevel] || '#6b7280';
      const size = Math.max(8, event.riskScore / 5);

      const el = document.createElement('div');
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '2px solid rgba(255,255,255,0.5)';
      el.style.cursor = 'pointer';
      el.style.boxShadow = `0 0 ${event.riskScore}px ${color}`;

      el.addEventListener('click', () => {
        const popup = new maplibregl.Popup({ offset: 25 })
          .setHTML(
            `<div style="color:#111;font-size:12px">
              <strong>${event.title}</strong><br/>
              Risco: ${event.riskScore}% | ${event.category}<br/>
              ${event.lat.toFixed(2)}, ${event.lng.toFixed(2)}
            </div>`
          );
        new maplibregl.Popup({ offset: 25 })
          .setLngLat([event.lng, event.lat])
          .setHTML(
            `<div style="color:#111;font-size:12px">
              <strong>${event.title}</strong><br/>
              Risco: ${event.riskScore}% | ${event.category}<br/>
              ${event.lat.toFixed(2)}, ${event.lng.toFixed(2)}
            </div>`
          )
          .addTo(map);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([event.lng, event.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [events]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-sentinel-700">
      <div ref={mapContainer} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 z-10 flex gap-2">
        <span className="rounded bg-sentinel-900/80 px-2 py-1 text-xs text-sentinel-300">
          🗺️ MapLibre GL — Vetorial
        </span>
      </div>
    </div>
  );
}
