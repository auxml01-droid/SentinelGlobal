'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { WorldMap } from '@/components/WorldMap';
import { GlobalRiskScoreCard } from '@/components/GlobalRiskScore';
import { EventList } from '@/components/EventList';
import { CountryRiskBar } from '@/components/CountryRiskBar';
import { AIAnalysis } from '@/components/AIAnalysis';
import { HealthDashboard } from '@/components/HealthDashboard';
import { AdminPanel } from '@/components/AdminPanel';
import { useSentinelSocket } from '@/hooks/useSentinelSocket';
import { EventCategory, CountryRiskScore, RiskLevel } from '@sentinel/types';

type SidebarItem = { name: string; icon: string; active: boolean } | 'divider';

const MODULES: SidebarItem[] = [
  { name: 'Dashboard', icon: '📊', active: true },
  { name: 'Earth Monitor', icon: '🌍', active: false },
  { name: 'War Monitor', icon: '⚔️', active: false },
  { name: 'Nuclear Monitor', icon: '☢️', active: false },
  { name: 'Ocean Monitor', icon: '🌊', active: false },
  { name: 'Satellite', icon: '🛰️', active: false },
  { name: 'Inteligência', icon: '🧠', active: false },
  'divider',
  { name: 'Mapa Mundial', icon: '🗺️', active: false },
  { name: 'Saúde', icon: '🩺', active: false },
  { name: 'Admin', icon: '⚙️', active: false },
];

const FLAGS: Record<string, string> = {
  BR: '🇧🇷', US: '🇺🇸', JP: '🇯🇵', CN: '🇨🇳', IN: '🇮🇳',
  RU: '🇷🇺', IL: '🇮🇱', IR: '🇮🇷', UA: '🇺🇦', DE: '🇩🇪',
  FR: '🇫🇷', GB: '🇬🇧', CA: '🇨🇦', MX: '🇲🇽', AU: '🇦🇺',
  AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', ZA: '🇿🇦', NG: '🇳🇬',
  EG: '🇪🇬', KR: '🇰🇷', KP: '🇰🇵', TW: '🇹🇼', PK: '🇵🇰',
  AF: '🇦🇫', IQ: '🇮🇶', SY: '🇸🇾', TR: '🇹🇷', IT: '🇮🇹',
  ES: '🇪🇸', PT: '🇵🇹', ID: '🇮🇩', PH: '🇵🇭', TH: '🇹🇭',
  VN: '🇻🇳', SA: '🇸🇦', AE: '🇦🇪', KW: '🇰🇼',
};

const CATEGORY_LABELS: Record<string, string> = {
  [EventCategory.NATURAL_DISASTER]: 'Desastres Naturais',
  [EventCategory.CONFLICT]: 'Conflitos',
  [EventCategory.TECH_RISK]: 'Riscos Tecnológicos',
  [EventCategory.HEALTH]: 'Saúde',
  [EventCategory.TRANSPORT]: 'Transporte',
};

const CATEGORY_COLORS: Record<string, string> = {
  [EventCategory.NATURAL_DISASTER]: '#f97316',
  [EventCategory.CONFLICT]: '#ef4444',
  [EventCategory.TECH_RISK]: '#a855f7',
  [EventCategory.HEALTH]: '#ec4899',
  [EventCategory.TRANSPORT]: '#3b82f6',
};

export default function Home() {
  const [activeModule, setActiveModule] = useState('Dashboard');
  const { connected, events, globalRisk, lastEvent, aiAnalyses } = useSentinelSocket();

  const globalScore = globalRisk?.globalScore ?? 0;
  const countries = useMemo(() => {
    if (!globalRisk?.countries) return [];
    const ranked = [...globalRisk.countries].sort((a, b) => b.score - a.score).slice(0, 7);
    return ranked.map((c: CountryRiskScore) => ({
      code: c.countryCode,
      name: c.countryName,
      score: c.score,
      flag: FLAGS[c.countryCode] || '🌍',
    }));
  }, [globalRisk]);

  const mappedEvents = useMemo(() => {
    return events.slice(0, 20).map((e) => {
      const typeLabel = CATEGORY_LABELS[e.category] || e.category;
      return {
        id: e.id,
        type: typeLabel,
        title: e.title,
        location: e.locationName || 'Desconhecido',
        magnitude: e.impact?.magnitude,
        timestamp: e.timestamp,
        riskScore: e.riskScore,
      };
    });
  }, [events]);

  const riskEvents = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of events) {
      const cat = event.category;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts).map(([cat, count]) => ({
      label: CATEGORY_LABELS[cat] || cat,
      count,
      color: CATEGORY_COLORS[cat] || '#6b7280',
    }));
  }, [events]);

  const mapEvents = useMemo(() => {
    return events.slice(0, 100).map((e) => ({
      id: e.id,
      title: e.title,
      lat: e.location.lat,
      lng: e.location.lng,
      riskScore: e.riskScore,
      riskLevel: e.riskLevel as RiskLevel,
      category: e.category,
    }));
  }, [events]);

  const renderModule = () => {
    switch (activeModule) {
      case 'Mapa Mundial':
        return (
          <div className="flex-1">
            <WorldMap events={mapEvents} />
          </div>
        );
      case 'Saúde':
        return <HealthDashboard />;
      case 'Admin':
        return <AdminPanel />;
      default:
        return (
          <>
            <div className="flex flex-[3] flex-col gap-3">
              <div className="flex-1">
                <WorldMap events={mapEvents} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <AIAnalysis
                  analysis={
                    aiAnalyses.length > 0
                      ? {
                          title: aiAnalyses[0]?.title ?? 'Análise de IA',
                          summary: aiAnalyses[0]?.summary ?? 'Processando...',
                          timestamp: aiAnalyses[0]?.timestamp ?? new Date().toISOString(),
                          confidence: aiAnalyses[0]?.confidence ?? 70,
                        }
                      : events.length > 0
                      ? {
                          title: `Monitorando ${events.length} eventos ativos`,
                          summary: `${events.length} eventos em tempo real. ${globalRisk?.countries?.length || 0} países monitorados. Score global: ${globalScore}%.`,
                          timestamp: new Date().toISOString(),
                          confidence: 80,
                        }
                      : undefined
                  }
                />
                <EventList events={mappedEvents} />
                <div className="flex flex-col gap-3">
                  <GlobalRiskScoreCard
                    score={globalScore}
                    events={riskEvents.length > 0 ? riskEvents : [
                      { label: 'Aguardando eventos...', count: 0, color: '#6b7280' },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="flex w-80 flex-col gap-3 overflow-y-auto">
              <CountryRiskBar countries={countries} />
              <div className="rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Monitoramento</h3>
                <div className="space-y-2 text-xs text-sentinel-300">
                  <div className="flex items-center justify-between">
                    <span>🔌 WebSocket</span>
                    <span className={`font-mono ${connected ? 'text-green-400' : 'text-red-400'}`}>
                      {connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🌍 Coletores Ativos</span>
                    <span className="font-mono text-green-400">11 + Simulação</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>📦 Total Eventos</span>
                    <span className="font-mono text-blue-400">{events.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🔄 Última atualização</span>
                    <span className="font-mono text-sentinel-400">tempo real</span>
                  </div>
                  {lastEvent && (
                    <div className="border-t border-sentinel-700 pt-2 text-xs">
                      <div className="text-sentinel-500">Último evento:</div>
                      <div className="mt-1 truncate text-sentinel-200">{lastEvent.title}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Legenda</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-risk-normal" />
                    <span className="text-sentinel-300">Normal (0-20%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-risk-atencao" />
                    <span className="text-sentinel-300">Atenção (21-40%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-risk-alerta" />
                    <span className="text-sentinel-300">Alerta (41-60%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-risk-alto" />
                    <span className="text-sentinel-300">Alto Risco (61-80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-risk-critico" />
                    <span className="text-sentinel-300">Crítico (81-95%)</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header globalScore={globalScore} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          modules={MODULES}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
        />
        <main className="flex flex-1 gap-3 overflow-hidden bg-sentinel-900 p-3">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
