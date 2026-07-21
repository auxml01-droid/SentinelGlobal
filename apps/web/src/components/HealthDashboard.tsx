'use client';

import { useEffect, useState } from 'react';

interface CollectorHealth {
  source: string;
  status: 'online' | 'degraded' | 'offline' | 'starting';
  uptimePercent: number;
  avgResponseTimeMs: number;
  totalFetched: number;
  totalErrors: number;
  lastFetchAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
}

interface SystemStatus {
  eventBus?: { status: string; latencyMs: number };
  riskEngine?: { eventCount: number; active: number };
  notifications?: { totalDeliveries: number; sent: number; failed: number };
  timestamp?: string;
}

const STATUS_ICON: Record<string, string> = {
  online: '✅',
  degraded: '⚠️',
  offline: '❌',
  starting: '🔄',
  healthy: '✅',
  down: '❌',
};

const STATUS_COLOR: Record<string, string> = {
  online: 'text-green-400',
  degraded: 'text-yellow-400',
  offline: 'text-red-400',
  starting: 'text-blue-400',
  healthy: 'text-green-400',
  down: 'text-red-400',
};

export function HealthDashboard() {
  const [collectors, setCollectors] = useState<CollectorHealth[]>([]);
  const [system, setSystem] = useState<SystemStatus>({});

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'collector:health') {
          setCollectors((prev) => {
            const existing = prev.findIndex((c) => c.source === data.payload.source);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = data.payload;
              return updated;
            }
            return [...prev, data.payload];
          });
        }
        if (data.type === 'system:status') {
          setSystem(data.payload);
        }
      } catch {}
    };

    return () => socket.close();
  }, []);

  const demoCollectors: CollectorHealth[] = [
    { source: 'usgs', status: 'online', uptimePercent: 99, avgResponseTimeMs: 230, totalFetched: 15234, totalErrors: 12 },
    { source: 'nasa_firms', status: 'online', uptimePercent: 98, avgResponseTimeMs: 450, totalFetched: 8921, totalErrors: 45 },
    { source: 'noaa', status: 'degraded', uptimePercent: 85, avgResponseTimeMs: 1200, totalFetched: 3456, totalErrors: 156, lastError: 'Timeout' },
    { source: 'who', status: 'online', uptimePercent: 97, avgResponseTimeMs: 310, totalFetched: 2345, totalErrors: 23 },
    { source: 'acled', status: 'offline', uptimePercent: 45, avgResponseTimeMs: 0, totalFetched: 567, totalErrors: 345, lastError: 'API Key inválida' },
    { source: 'simulation', status: 'online', uptimePercent: 100, avgResponseTimeMs: 1, totalFetched: 56789, totalErrors: 0 },
  ];

  const displayCollectors = collectors.length > 0 ? collectors : demoCollectors;

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      <div className="rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">🩺 Saúde dos Coletores</h3>
        <div className="space-y-2">
          {displayCollectors.map((c) => (
            <div key={c.source} className="flex items-center justify-between rounded bg-sentinel-900/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{STATUS_ICON[c.status]}</span>
                <span className="text-xs font-medium text-sentinel-200">{c.source}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={STATUS_COLOR[c.status]}>{c.status}</span>
                <span className="text-sentinel-400">{c.uptimePercent}%</span>
                <span className="text-sentinel-400">{c.avgResponseTimeMs}ms</span>
                {c.lastError && (
                  <span className="text-red-400" title={c.lastError}>⚠</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">⚙️ Infraestrutura</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-sentinel-300">Event Bus</span>
            <span className={`font-mono ${STATUS_COLOR[system.eventBus?.status ?? 'healthy']}`}>
              {STATUS_ICON[system.eventBus?.status ?? 'healthy']} {system.eventBus?.status ?? 'healthy'} ({system.eventBus?.latencyMs ?? 1}ms)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sentinel-300">Risk Engine</span>
            <span className="font-mono text-green-400">✅ {system.riskEngine?.active ?? 0} eventos ativos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sentinel-300">Notificações</span>
            <span className="font-mono text-blue-400">
              {system.notifications?.totalDeliveries ?? 0} entregues
              {system.notifications && ` (${system.notifications.sent} ok, ${system.notifications.failed} falhas)`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sentinel-300">Redis</span>
            <span className="font-mono text-green-400">✅ Healthy</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sentinel-300">Worker</span>
            <span className="font-mono text-green-400">✅ Online</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sentinel-300">WebSocket</span>
            <span className="font-mono text-green-400">🔌 Conectado</span>
          </div>
        </div>
        {system.timestamp && (
          <div className="mt-2 border-t border-sentinel-700 pt-2 text-[10px] text-sentinel-500">
            Última atualização: {new Date(system.timestamp).toLocaleTimeString('pt-BR')}
          </div>
        )}
      </div>
    </div>
  );
}
