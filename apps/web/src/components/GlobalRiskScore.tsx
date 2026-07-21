'use client';

import { useMemo } from 'react';

interface GlobalRiskScoreProps {
  score: number;
  events: { label: string; count: number; color: string }[];
}

export function GlobalRiskScoreCard({ score, events }: GlobalRiskScoreProps) {
  const { label, emoji } = useMemo(() => {
    if (score <= 20) return { label: 'Normal', emoji: '🟢' };
    if (score <= 40) return { label: 'Atenção', emoji: '🟡' };
    if (score <= 60) return { label: 'Alerta', emoji: '🟠' };
    if (score <= 80) return { label: 'Alto Risco', emoji: '🔴' };
    if (score <= 95) return { label: 'Crítico', emoji: '🟣' };
    return { label: 'Emergência Mundial', emoji: '⚫' };
  }, [score]);

  return (
    <div className="rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-sentinel-400">
          Índice Global de Risco
        </span>
        <span className="rounded bg-sentinel-700 px-2 py-0.5 text-xs text-sentinel-300">
          TEMPO REAL
        </span>
      </div>
      <div className="mb-2 flex items-end gap-3">
        <span className="text-5xl">{emoji}</span>
        <div>
          <span className="text-4xl font-bold text-white">{score}%</span>
          <p className="text-sm text-sentinel-300">{label}</p>
        </div>
      </div>
      <div className="mb-4 h-3 overflow-hidden rounded-full bg-sentinel-700">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, backgroundColor: getRiskHex(score) }}
        />
      </div>
      <div className="space-y-1.5">
        {events.map((event) => (
          <div key={event.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <span className="text-sentinel-200">{event.label}</span>
            </div>
            <span className="font-mono font-bold text-white">
              {event.count.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
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
