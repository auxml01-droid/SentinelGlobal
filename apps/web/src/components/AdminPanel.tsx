'use client';

import { useState } from 'react';

interface Tab {
  name: string;
  icon: string;
}

const TABS: Tab[] = [
  { name: 'Usuários', icon: '👤' },
  { name: 'API Keys', icon: '🔑' },
  { name: 'Coletores', icon: '📡' },
  { name: 'Logs', icon: '📋' },
  { name: 'Filas', icon: '📨' },
  { name: 'Cache', icon: '💾' },
  { name: 'Eventos', icon: '📦' },
  { name: 'Países', icon: '🌍' },
  { name: 'Assinaturas', icon: '🔔' },
  { name: 'Estatísticas', icon: '📊' },
  { name: 'IA', icon: '🧠' },
  { name: 'Auditoria', icon: '🔍' },
];

const API_KEYS = [
  { key: 'sg_free_a1b2c3d4...', name: 'Demo Público', tier: 'free', rateLimit: 10, status: 'Ativa' },
  { key: 'sg_pro_e5f6g7h8...', name: 'Cliente XYZ', tier: 'pro', rateLimit: 100, status: 'Ativa' },
  { key: 'sg_enterprise_i9j0...', name: 'Governo BR', tier: 'enterprise', rateLimit: 1000, status: 'Ativa' },
];

const TIER_COLORS: Record<string, string> = {
  free: 'bg-gray-600',
  pro: 'bg-blue-600',
  enterprise: 'bg-purple-600',
};

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('API Keys');

  return (
    <div className="flex flex-1 gap-3">
      <div className="flex w-40 flex-col gap-1 rounded-lg border border-sentinel-700 bg-sentinel-800 p-2">
        {TABS.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
              activeTab === tab.name
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-sentinel-400 hover:bg-sentinel-700 hover:text-sentinel-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
        {activeTab === 'API Keys' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">🔑 API Keys</h3>
              <button className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">
                + Nova Chave
              </button>
            </div>
            <div className="space-y-2">
              {API_KEYS.map((ak) => (
                <div key={ak.key} className="flex items-center justify-between rounded bg-sentinel-900/50 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-xs text-white ${TIER_COLORS[ak.tier]}`}>{ak.tier}</span>
                    <div>
                      <div className="text-xs font-medium text-sentinel-200">{ak.name}</div>
                      <div className="font-mono text-[10px] text-sentinel-400">{ak.key}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-sentinel-400">{ak.rateLimit} req/min</span>
                    <span className="text-green-400">{ak.status}</span>
                    <button className="text-red-400 hover:text-red-300">Revogar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Usuários' && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">👤 Usuários</h3>
            <p className="text-xs text-sentinel-400">Módulo de gerenciamento de usuários — em desenvolvimento.</p>
          </div>
        )}

        {activeTab === 'Coletores' && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">📡 Configuração de Coletores</h3>
            <div className="space-y-2">
              {[
                { name: 'USGS Earthquakes', source: 'usgs', interval: '30s', status: 'online' },
                { name: 'NASA FIRMS', source: 'nasa_firms', interval: '60s', status: 'online' },
                { name: 'NOAA Weather', source: 'noaa', interval: '120s', status: 'degraded' },
                { name: 'WHO Health', source: 'who', interval: '300s', status: 'online' },
                { name: 'ACLED Conflicts', source: 'acled', interval: '300s', status: 'offline' },
                { name: 'Simulation', source: 'simulation', interval: '8s', status: 'online' },
              ].map((c) => (
                <div key={c.source} className="flex items-center justify-between rounded bg-sentinel-900/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={c.status === 'online' ? 'text-green-400' : c.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}>
                      {c.status === 'online' ? '✅' : c.status === 'degraded' ? '⚠️' : '❌'}
                    </span>
                    <span className="text-sentinel-200">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sentinel-400">
                    <span>{c.interval}</span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" defaultChecked={c.status === 'online'} />
                      <div className="peer h-4 w-7 rounded-full bg-sentinel-600 after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Estatísticas' && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">📊 Estatísticas Globais</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Eventos', value: '12,847', change: '+23%' },
                { label: 'Países Monitorados', value: '47', change: '0%' },
                { label: 'Coletores Ativos', value: '8/11', change: '-1' },
                { label: 'API Keys Ativas', value: '3', change: '0%' },
                { label: 'Notificações Enviadas', value: '1,234', change: '+12%' },
                { label: 'Uptime', value: '99.7%', change: '+0.1%' },
              ].map((stat) => (
                <div key={stat.label} className="rounded bg-sentinel-900/50 p-3">
                  <div className="text-[10px] text-sentinel-400">{stat.label}</div>
                  <div className="mt-1 text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-green-400">{stat.change}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'Logs' || activeTab === 'Filas' || activeTab === 'Cache' || activeTab === 'Eventos' ||
          activeTab === 'Países' || activeTab === 'Assinaturas' || activeTab === 'IA' || activeTab === 'Auditoria') && (
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{TABS.find((t) => t.name === activeTab)?.icon} {activeTab}</h3>
            <p className="text-xs text-sentinel-400">Módulo em desenvolvimento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
