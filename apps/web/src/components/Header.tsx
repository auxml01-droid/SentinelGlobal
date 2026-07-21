'use client';

import { useMemo } from 'react';

interface HeaderProps {
  globalScore: number;
}

export function Header({ globalScore }: HeaderProps) {
  const riskColor = useMemo(() => {
    if (globalScore <= 20) return 'text-risk-normal';
    if (globalScore <= 40) return 'text-risk-atencao';
    if (globalScore <= 60) return 'text-risk-alerta';
    if (globalScore <= 80) return 'text-risk-alto';
    if (globalScore <= 95) return 'text-risk-critico';
    return 'text-white';
  }, [globalScore]);

  return (
    <header className="flex items-center justify-between border-b border-sentinel-700 bg-sentinel-900 px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛰️</span>
          <h1 className="text-xl font-bold tracking-wider text-white">
            SENTINEL<span className="text-blue-400">GLOBAL</span>
          </h1>
        </div>
        <span className="rounded bg-sentinel-700 px-2 py-0.5 text-xs text-sentinel-300">
          CENTRO DE OPERAÇÕES
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded bg-sentinel-800 px-4 py-2">
          <span className={`text-lg font-bold ${riskColor}`}>
            {globalScore}%
          </span>
          <div className="h-2 w-24 overflow-hidden rounded bg-sentinel-600">
            <div
              className="h-full rounded transition-all duration-500"
              style={{ width: `${globalScore}%`, backgroundColor: getRiskHex(globalScore) }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-sentinel-400">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          AO VIVO
        </div>
      </div>
    </header>
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
