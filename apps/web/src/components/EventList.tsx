'use client';

import { useMemo } from 'react';

interface EventItem {
  id: string;
  type: string;
  title: string;
  location: string;
  magnitude?: number;
  timestamp: string;
  riskScore: number;
}

interface EventListProps {
  events: EventItem[];
}

export function EventList({ events }: EventListProps) {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [events],
  );

  return (
    <div className="rounded-lg border border-sentinel-700 bg-sentinel-800">
      <div className="flex items-center justify-between border-b border-sentinel-700 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Eventos em Tempo Real</h3>
        <span className="text-xs text-sentinel-400">
          {events.length} eventos ativos
        </span>
      </div>
      <div className="max-h-[400px] space-y-1 overflow-y-auto p-2">
        {sortedEvents.length === 0 ? (
          <div className="py-8 text-center text-sm text-sentinel-400">
            Nenhum evento ativo no momento
          </div>
        ) : (
          sortedEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: EventItem }) {
  const riskColor = useMemo(() => {
    if (event.riskScore <= 20) return 'border-l-risk-normal';
    if (event.riskScore <= 40) return 'border-l-risk-atencao';
    if (event.riskScore <= 60) return 'border-l-risk-alerta';
    if (event.riskScore <= 80) return 'border-l-risk-alto';
    return 'border-l-risk-critico';
  }, [event.riskScore]);

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(event.timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
  }, [event.timestamp]);

  return (
    <div
      className={`flex items-center justify-between border-l-4 bg-sentinel-900/50 px-3 py-2 transition-colors hover:bg-sentinel-700/50 ${riskColor}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-sentinel-400">{event.type}</span>
          <span className="text-xs text-sentinel-500">|</span>
          <span className="text-sm font-medium text-white">{event.title}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-sentinel-400">
          <span>📍 {event.location}</span>
          {event.magnitude && <span>📊 M{event.magnitude.toFixed(1)}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-mono text-xs text-sentinel-400">{timeAgo}</span>
        <span
          className="font-mono text-sm font-bold"
          style={{ color: getRiskHex(event.riskScore) }}
        >
          {event.riskScore}%
        </span>
      </div>
    </div>
  );
}

function getRiskHex(score: number): string {
  if (score <= 20) return '#22c55e';
  if (score <= 40) return '#eab308';
  if (score <= 60) return '#f97316';
  if (score <= 80) return '#ef4444';
  if (score <= 95) return '#a855f7';
  return '#000000';
}
